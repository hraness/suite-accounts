import { describe, expect, expectTypeOf, test } from "bun:test";
import { parseSuiteAccountId } from "./identity/identifiers";
import {
  parseSuiteAvatarRef,
  parseSuiteProfileEditorV2,
  parseSuiteProfileUpdateV2,
  type SuiteProfileEditorV2,
  type SuiteProfileUpdateV2,
} from "./identity/profiles-v2";
import { parsePublicProfileFormResult, type PublicProfileFormResult } from "./public-profile-form-result";

const account = parseSuiteAccountId(`acct_${"1".repeat(32)}`);
const other = parseSuiteAccountId(`acct_${"2".repeat(32)}`);
if (!account.ok || !other.ok) throw new Error("invalid synthetic account");
const accountId = account.value;
const otherAccountId = other.value;
const avatar = parseSuiteAvatarRef(`avref_${"3".repeat(64)}`);
if (!avatar.ok) throw new Error("invalid synthetic avatar");
const avatarRef = avatar.value;
const nullLinks = {
  bluesky: null, github: null, instagram: null, linkedin: null,
  telegram: null, website: null, x: null,
};

function request(overrides: Partial<SuiteProfileUpdateV2> = {}): SuiteProfileUpdateV2 {
  const parsed = parseSuiteProfileUpdateV2({
    schemaVersion: 2, expectedRevision: 5, name: "Reader One", bio: "Builds small computers.",
    links: nullLinks, avatarRef: null, publication: "publish", ...overrides,
  });
  if (!parsed.ok) throw new Error("invalid synthetic request");
  return parsed.value;
}

function editor(overrides: Partial<SuiteProfileEditorV2> = {}): SuiteProfileEditorV2 {
  const parsed = parseSuiteProfileEditorV2({
    schemaVersion: 2, accountId, username: "reader-one", name: "Reader One",
    bio: "Builds small computers.", links: nullLinks, avatarRef: null,
    revision: 6, publication: "published", ...overrides,
  });
  if (!parsed.ok) throw new Error("invalid synthetic editor");
  return parsed.value;
}

function parse(value: unknown, update = request(), current = editor({ revision: update.expectedRevision })) {
  return parsePublicProfileFormResult(value, current, update);
}

describe("public profile form response validation", () => {
  test("returns the closed result union with owned deeply frozen profile copies", () => {
    expectTypeOf<PublicProfileFormResult["status"]>().toEqualTypeOf<
      "saved" | "conflict" | "unauthorized" | "username_required" | "invalid_avatar"
    >();
    const profile = { ...editor(), links: { ...nullLinks } };
    const envelope = { status: "saved", profile };
    const result = parse(envelope);
    expect<unknown>(result).toEqual(envelope);
    if (result?.status !== "saved") throw new Error("expected saved result");
    expect(result).not.toBe(envelope);
    expect(result.profile).not.toBe(profile);
    expect(result.profile.links).not.toBe(profile.links);
    for (const owned of [result, result.profile, result.profile.links]) expect(Object.isFrozen(owned)).toBe(true);
    expect(Object.isFrozen(envelope)).toBe(false);
    expect(Object.isFrozen(profile)).toBe(false);
    profile.name = "Changed later";
    expect(result.profile.name).toBe("Reader One");
  });

  test.each(["unauthorized", "username_required", "invalid_avatar"] as const)("accepts only singleton %s", (status) => {
    const result = parse({ status });
    expect(result).toEqual({ status });
    expect(Object.isFrozen(result)).toBe(true);
    for (const extra of [{ profile: null }, { profile: editor() }, { error: "private detail" }]) {
      expect(parse({ status, ...extra })).toBeNull();
    }
  });

  test("saved accepts exactly the same or next revision, including the safe-integer edge", () => {
    for (const revision of [5, 6]) expect(parse({ status: "saved", profile: editor({ revision }) })?.status).toBe("saved");
    for (const revision of [1, 4, 7, Number.MAX_SAFE_INTEGER]) {
      expect(parse({ status: "saved", profile: editor({ revision }) })).toBeNull();
    }
    const maximum = Number.MAX_SAFE_INTEGER;
    expect(parse({ status: "saved", profile: editor({ revision: maximum }) }, request({ expectedRevision: maximum }))?.status).toBe("saved");
    expect(parse({ status: "saved", profile: editor({ revision: maximum }) }, request({ expectedRevision: maximum - 1 }))?.status).toBe("saved");
    expect(parse({ status: "saved", profile: { ...editor(), revision: maximum + 1 } }, request({ expectedRevision: maximum }))).toBeNull();
  });

  test("same-revision saved is only a genuine no-op against the captured starting editor", () => {
    const current = editor({ revision: 5 });
    for (const changed of [
      request({ name: "Changed name" }), request({ bio: "Changed bio" }),
      request({ publication: "private" }),
      request({ avatarRef }),
      request({ links: { ...nullLinks, github: "https://github.com/reader" } }),
    ]) {
      const content = { name: changed.name, bio: changed.bio, links: changed.links,
        avatarRef: changed.avatarRef, publication: changed.publication === "publish" ? "published" as const : "private" as const };
      expect(parse({ status: "saved", profile: editor({ ...content, revision: 5 }) }, changed, current)).toBeNull();
      expect(parse({ status: "saved", profile: editor({ ...content, revision: 6 }) }, changed, current)?.status).toBe("saved");
    }
  });

  test("the blank revision-zero editor can only acknowledge a first save at revision one", () => {
    const current = editor({ revision: 0, name: "", bio: "", avatarRef: null,
      username: null, publication: "private" });
    const update = request({ expectedRevision: 0 });
    expect(parse({ status: "saved", profile: editor({ revision: 1 }) }, update, current)?.status).toBe("saved");
    expect(parse({ status: "saved", profile: current }, update, current)).toBeNull();
  });

  test("requires the request revision to match the captured starting profile for every status", () => {
    const stale = editor({ revision: 4 });
    for (const value of [
      { status: "saved", profile: editor() }, { status: "conflict", profile: editor() },
      { status: "unauthorized" }, { status: "username_required" }, { status: "invalid_avatar" },
    ]) expect(parse(value, request(), stale)).toBeNull();
  });

  test("saved binds the account and submitted content but permits a username change", () => {
    expect(parse({ status: "saved", profile: editor({ accountId: otherAccountId }) })).toBeNull();
    const renamed = { ...editor(), username: "renamed-reader" };
    expect(parse({ status: "saved", profile: renamed })?.status).toBe("saved");
    for (const changed of [
      { name: "Another name" }, { bio: "Another bio" },
      { avatarRef: `avref_${"3".repeat(64)}` }, { publication: "private" },
    ]) expect(parse({ status: "saved", profile: { ...editor(), ...changed } })).toBeNull();
    const links = {
      bluesky: "https://bsky.app/profile/reader.bsky.social", github: "https://github.com/reader",
      instagram: "https://www.instagram.com/reader/", linkedin: "https://www.linkedin.com/in/reader/",
      telegram: "https://t.me/reader", website: "https://example.com/", x: "https://x.com/reader",
    };
    for (const key of Object.keys(links) as (keyof typeof links)[]) {
      const withLink = request({ links: { ...nullLinks, [key]: links[key] } });
      expect(parse({ status: "saved", profile: editor() }, withLink)).toBeNull();
      expect(parse({ status: "saved", profile: editor({ links: withLink.links }) }, withLink)?.status).toBe("saved");
      expect(parse({ status: "saved", profile: editor({ links: withLink.links, revision: 5 }) }, withLink)).toBeNull();
    }
  });

  test("saved compares normalized request content and maps each publication action", () => {
    const raw: SuiteProfileUpdateV2 = {
      ...request(), name: "  Reader   One  ", bio: "  Builds small computers.\r\n",
      links: { ...nullLinks, github: "HTTPS://WWW.GITHUB.COM/Reader/" },
    };
    expect(parse({ status: "saved", profile: editor({ links: { ...nullLinks, github: "https://github.com/reader" } }) }, raw)?.status).toBe("saved");
    const privateRequest = request({ publication: "private" });
    expect(parse({ status: "saved", profile: editor({ username: null, publication: "private" }) }, privateRequest)?.status).toBe("saved");
    expect(parse({ status: "saved", profile: editor() }, privateRequest)).toBeNull();
    expect(parse({ status: "saved", profile: { ...editor(), publication: "publish" } })).toBeNull();
  });

  test("conflict requires the same account and strictly newer revision, not submitted content", () => {
    const changed = editor({ name: "Concurrent edit", publication: "private", username: null });
    expect(parse({ status: "conflict", profile: changed })?.status).toBe("conflict");
    for (const revision of [1, 4, 5]) expect(parse({ status: "conflict", profile: editor({ revision }) })).toBeNull();
    expect(parse({ status: "conflict", profile: editor({ accountId: otherAccountId }) })).toBeNull();
    expect(parse({ status: "conflict", profile: editor({ revision: Number.MAX_SAFE_INTEGER }) })?.status).toBe("conflict");
    expect(parse({ status: "conflict", profile: editor({ revision: Number.MAX_SAFE_INTEGER }) }, request({ expectedRevision: Number.MAX_SAFE_INTEGER }))).toBeNull();
  });

  test("accepts exact null-prototype records without retaining them", () => {
    const links: unknown = Object.assign(Object.create(null) as Record<string, unknown>, nullLinks);
    const profile: unknown = Object.assign(Object.create(null), editor(), {
      links,
    });
    const result = parse(Object.assign(Object.create(null), { status: "saved", profile }));
    expect(result?.status).toBe("saved");
  });

  test("rejects extra, inherited, hidden, symbolic and malformed response data", () => {
    for (const value of [
      null, undefined, true, 1, "saved", [], new Date(), {}, { status: "other" },
      { status: "saved" }, { status: "saved", profile: null },
      { status: "saved", profile: editor(), token: "not allowed" },
      { status: "saved", profile: { ...editor(), email: "not allowed" } },
      { status: "saved", profile: { ...editor(), links: { ...nullLinks, extra: null } } },
      Object.create({ status: "unauthorized" }),
      Object.assign(Object.create({ inherited: true }), { status: "unauthorized" }),
      { status: "unauthorized", [Symbol("extra")]: true },
      Object.defineProperty({ status: "unauthorized" }, "extra", { value: true }),
      Object.defineProperty({}, "status", { value: "unauthorized" }),
      { status: "saved", profile: { ...editor(), revision: NaN } },
      { status: "saved", profile: { ...editor(), name: " Reader One " } },
    ]) expect(parse(value)).toBeNull();
  });

  test("rejects accessors without invoking them at any response level", () => {
    let calls = 0;
    const descriptor = { enumerable: true, get() { calls += 1; throw new Error("must not read"); } };
    const envelope = Object.defineProperty({ profile: editor() }, "status", descriptor);
    const profileAccessor = Object.defineProperty({ status: "saved" }, "profile", descriptor);
    const profile = Object.defineProperty({ ...editor() }, "name", descriptor);
    const links = Object.defineProperty({ ...nullLinks }, "github", descriptor);
    for (const value of [envelope, profileAccessor, { status: "saved", profile }, { status: "saved", profile: { ...editor(), links } }]) {
      expect(parse(value)).toBeNull();
    }
    expect(calls).toBe(0);
  });

  test("catches throwing and revoked reflection without exposing exceptions", () => {
    for (const handler of [
      { getPrototypeOf() { throw new Error("private failure"); } },
      { ownKeys() { throw new Error("private failure"); } },
      { getOwnPropertyDescriptor() { throw new Error("private failure"); } },
    ]) expect(parse(new Proxy({ status: "unauthorized" }, handler))).toBeNull();
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    expect(parse(revoked.proxy)).toBeNull();
    expect(parse({ status: "saved", profile: revoked.proxy })).toBeNull();
  });

  test("inherited setters and descriptor values cannot manufacture response fields", () => {
    let calls = 0;
    const input = Object.defineProperty({}, "status", {
      enumerable: true, get() { calls += 1; return "unauthorized"; },
    });
    const originalStatus = Object.getOwnPropertyDescriptor(Object.prototype, "status");
    const originalValue = Object.getOwnPropertyDescriptor(Object.prototype, "value");
    let ordinary: PublicProfileFormResult | null = null;
    let accessor: PublicProfileFormResult | null = null;
    try {
      Object.defineProperty(Object.prototype, "status", {
        configurable: true, set() { calls += 1; }, get() { calls += 1; return "unauthorized"; },
      });
      Object.defineProperty(Object.prototype, "value", { configurable: true, value: "unauthorized" });
      ordinary = parse({ status: "unauthorized" });
      accessor = parse(input);
    } finally {
      if (originalValue === undefined) Reflect.deleteProperty(Object.prototype, "value");
      else Object.defineProperty(Object.prototype, "value", originalValue);
      if (originalStatus === undefined) Reflect.deleteProperty(Object.prototype, "status");
      else Object.defineProperty(Object.prototype, "status", originalStatus);
    }
    expect(ordinary).toEqual({ status: "unauthorized" });
    expect(accessor).toBeNull();
    expect(calls).toBe(0);
  });

  test("owns the expected request before foreign response reflection can mutate it", () => {
    const mutable = { ...request(), links: { ...nullLinks } };
    const current = { ...editor({ revision: 5 }), links: { ...nullLinks } };
    const response = new Proxy({ status: "saved", profile: editor() }, {
      ownKeys(target) {
        mutable.name = "Changed during reflection";
        mutable.expectedRevision = 99;
        current.name = "Changed during reflection";
        current.revision = 99;
        return Reflect.ownKeys(target);
      },
    });
    expect(parse(response, mutable, current)?.status).toBe("saved");
    expect(mutable.expectedRevision).toBe(99);
    expect(current.revision).toBe(99);
  });

  test("refuses invalid typed arguments at runtime without evaluating request getters", () => {
    let calls = 0;
    const invalid = Object.defineProperty({ ...request() }, "name", {
      enumerable: true, get() { calls += 1; throw new Error("must not read"); },
    });
    const invoke = (current: unknown, update: unknown): unknown =>
      Reflect.apply(parsePublicProfileFormResult, undefined, [{ status: "unauthorized" }, current, update]);
    const currentAccessor = Object.defineProperty({ ...editor({ revision: 5 }) }, "name", {
      enumerable: true, get() { calls += 1; throw new Error("must not read"); },
    });
    for (const value of [null, {}, -1, "not-a-profile", currentAccessor]) expect(invoke(value, request())).toBeNull();
    for (const value of [null, {}, invalid, { ...request(), expectedRevision: Infinity }]) expect(invoke(editor({ revision: 5 }), value)).toBeNull();
    expect(calls).toBe(0);
  });
});
