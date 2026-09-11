import { describe, expect, expectTypeOf, test } from "bun:test";
import { getSuiteAccountsDeployment } from "../registry";
import * as identity from "./index";
import * as profile from "../profile";
import {
  normalizeSuiteProfileLink,
  parseSuiteProfileUpdateRequest,
  type SuiteProfileLinkKey,
  type SuiteProfileLinks,
} from "./profiles";
import {
  normalizeSuiteProfileLinkV2,
  parseSuiteAvatarRef,
  parseSuiteProfileEditorV2,
  parseSuiteProfileUpdateV2,
  parseSuitePublicProfileV2,
  suiteProfileAvatarEditorUrl,
  suiteProfileAvatarPublicUrl,
  type SuiteProfileEditorV2,
  type SuiteProfileLinkKeyV2,
  type SuitePublicProfileV2,
} from "./profiles-v2";

const accountId = `acct_${"1".repeat(32)}`;
const avatarRef = `avref_${"2".repeat(64)}`;
const links = {
  bluesky: null, github: null, instagram: null, linkedin: null,
  telegram: null, website: null, x: null,
};
const publicProfile = {
  schemaVersion: 2, accountId, username: "reader-one", name: "Reader One",
  bio: "Builds small computers.", links, avatarRef, revision: 1,
};
const update = {
  schemaVersion: 2, expectedRevision: 0, name: publicProfile.name,
  bio: publicProfile.bio, links, avatarRef, publication: "publish",
};
const editor = { ...publicProfile, publication: "published" };
const emptyEditor = {
  ...editor, name: "", bio: "", username: null, avatarRef: null,
  revision: 0, publication: "private",
};

describe("profile v2 exact projections", () => {
  test("exposes additive types and functions from both existing pure entries", () => {
    expect(profile.parseSuitePublicProfileV2).toBe(parseSuitePublicProfileV2);
    expect(identity.parseSuiteProfileEditorV2).toBe(parseSuiteProfileEditorV2);
    expect(profile.parseSuiteProfileUpdateRequest).toBe(parseSuiteProfileUpdateRequest);
    expectTypeOf<SuiteProfileLinkKeyV2>().toEqualTypeOf<SuiteProfileLinkKey | "github">();
    expectTypeOf<keyof SuitePublicProfileV2>().toEqualTypeOf<
      "schemaVersion" | "accountId" | "username" | "name" | "bio" | "links" | "avatarRef" | "revision"
    >();
    expectTypeOf<SuiteProfileEditorV2["publication"]>().toEqualTypeOf<"private" | "published">();
    expectTypeOf<SuiteProfileLinkKey>().toEqualTypeOf<keyof SuiteProfileLinks>();
  });

  test("parses canonical public and editor projections with frozen owned values", () => {
    for (const [parser, input] of [
      [parseSuitePublicProfileV2, publicProfile],
      [parseSuiteProfileEditorV2, editor],
      [parseSuiteProfileUpdateV2, update],
    ] as const) {
      const result = parser(input);
      expect<unknown>(result).toEqual({ ok: true, value: input });
      expect(Object.isFrozen(result)).toBe(true);
      if (!result.ok) throw new Error("expected synthetic profile");
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.links)).toBe(true);
      expect(result.value.links).not.toBe(input.links);
      expect(Object.isFrozen(input)).toBe(false);
      expect(Object.isFrozen(input.links)).toBe(false);
    }
  });

  test("normalizes edits and leaves canonical views strict", () => {
    const input = {
      ...update, name: "  Reader   One  ", bio: "  Builds small computers.\r\n",
      links: { ...links, github: "HTTPS://WWW.GITHUB.COM/Reader-One/", x: "@Reader" },
    };
    const expectedLinks = { ...links, github: "https://github.com/reader-one", x: "https://x.com/reader" };
    expect<unknown>(parseSuiteProfileUpdateV2(input)).toEqual({ ok: true, value: { ...update, links: expectedLinks } });
    for (const changed of [
      { name: input.name }, { bio: input.bio }, { links: input.links },
    ]) {
      expect(parseSuitePublicProfileV2({ ...publicProfile, ...changed }).ok).toBe(false);
      expect(parseSuiteProfileEditorV2({ ...editor, ...changed }).ok).toBe(false);
    }
  });

  test("revision zero is only a coherent private blank profile, even with a claimed username", () => {
    expect<unknown>(parseSuiteProfileEditorV2(emptyEditor)).toEqual({ ok: true, value: emptyEditor });
    const claimed = { ...emptyEditor, username: "reader-one" };
    expect<unknown>(parseSuiteProfileEditorV2(claimed)).toEqual({ ok: true, value: claimed });
    for (const changed of [
      { name: "Reader" }, { bio: "Bio" }, { avatarRef }, { publication: "published" },
      { links: { ...links, github: "https://github.com/reader" } },
    ]) expect(parseSuiteProfileEditorV2({ ...emptyEditor, ...changed }).ok).toBe(false);
    expect(parseSuitePublicProfileV2({ ...publicProfile, revision: 0 }).ok).toBe(false);
    expect(parseSuiteProfileEditorV2({ ...editor, username: null }).ok).toBe(false);
    expect(parseSuiteProfileEditorV2({ ...editor, username: null, publication: "private" }).ok).toBe(true);
  });

  test.each(["", " ", "\t", null, undefined])("never accepts an absent saved/public name: %p", (name) => {
    expect(parseSuitePublicProfileV2({ ...publicProfile, name }).ok).toBe(false);
    expect(parseSuiteProfileEditorV2({ ...editor, name }).ok).toBe(false);
    expect(parseSuiteProfileUpdateV2({ ...update, name }).ok).toBe(false);
  });

  test.each([-1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, "1", null])("rejects invalid revisions: %p", (revision) => {
    expect(parseSuitePublicProfileV2({ ...publicProfile, revision }).ok).toBe(false);
    expect(parseSuiteProfileEditorV2({ ...editor, revision }).ok).toBe(false);
    expect(parseSuiteProfileUpdateV2({ ...update, expectedRevision: revision }).ok).toBe(false);
  });

  test("accepts the safe integer ceiling without authorizing another increment", () => {
    expect(parseSuitePublicProfileV2({ ...publicProfile, revision: Number.MAX_SAFE_INTEGER }).ok).toBe(true);
    expect(parseSuiteProfileUpdateV2({ ...update, expectedRevision: Number.MAX_SAFE_INTEGER }).ok).toBe(true);
  });

  test.each(["schemaVersion", "accountId", "username", "name", "bio", "links", "avatarRef", "revision"])("requires public field %s", (field) => {
    const input: Record<string, unknown> = { ...publicProfile };
    delete input[field];
    expect(parseSuitePublicProfileV2(input).ok).toBe(false);
  });

  test("keeps every v2 object schema separate, with no private data or authorization fields", () => {
    expect(parseSuitePublicProfileV2(editor).ok).toBe(false);
    expect(parseSuiteProfileEditorV2(publicProfile).ok).toBe(false);
    expect(parseSuiteProfileUpdateV2(editor).ok).toBe(false);
    for (const [parser, input] of [
      [parseSuitePublicProfileV2, publicProfile], [parseSuiteProfileEditorV2, editor],
      [parseSuiteProfileUpdateV2, update],
    ] as const) {
      for (const field of ["email", "billing", "subject", "accessToken", "avatarUrl", "consentedAtMs"]) {
        expect(parser({ ...input, [field]: "untrusted" })).toEqual({ ok: false, error: { field: "profile", reason: "invalid" } });
      }
      expect(parser({ ...input, schemaVersion: 1 }).ok).toBe(false);
      expect(parser({ ...input, links: { ...links, mastodon: null } }).ok).toBe(false);
      const { github: _github, ...oldLinks } = links;
      void _github;
      expect(parser({ ...input, links: oldLinks }).ok).toBe(false);
    }
  });

  test("reuses canonical account and existing username parsers", () => {
    expect(parseSuitePublicProfileV2({ ...publicProfile, accountId: `acct_${"0".repeat(32)}`, username: "hraness" }).ok).toBe(true);
    for (const changed of [
      { accountId: `acct_${"A".repeat(32)}` }, { accountId: "reader-one" },
      { username: "Reader-One" }, { username: "a" }, { username: null },
    ]) expect(parseSuitePublicProfileV2({ ...publicProfile, ...changed }).ok).toBe(false);
  });

  test("enforces text bounds, normalization controls, and expanded canonical URL bounds", () => {
    expect(parseSuiteProfileUpdateV2({ ...update, name: "n".repeat(120), bio: "b".repeat(1_000) }).ok).toBe(true);
    for (const changed of [
      { name: "n".repeat(121) }, { bio: "b".repeat(1_001) },
      { name: "n\u0000" }, { bio: "b\u000b" },
      { name: " ".repeat(32_769) + "n" }, { bio: " ".repeat(32_769) },
    ]) expect(parseSuiteProfileUpdateV2({ ...update, ...changed }).ok).toBe(false);
    const expandingUrl = `https://reader.example/${"é".repeat(400)}`;
    expect(normalizeSuiteProfileLink("website", expandingUrl).ok).toBe(true);
    expect(normalizeSuiteProfileLinkV2("website", expandingUrl)).toEqual({
      ok: false, error: { field: "website", reason: "too_long" },
    });
  });
});

describe("foreign-value ownership", () => {
  test("ignores inherited setters and absent-field getters when copying and narrowing", () => {
    let calls = 0;
    const nameDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, "name");
    const publicationDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, "publication");
    let result: unknown;
    try {
      Object.defineProperty(Object.prototype, "name", { configurable: true, set() { calls += 1; } });
      Object.defineProperty(Object.prototype, "publication", { configurable: true, get() { calls += 1; return "published"; } });
      result = parseSuitePublicProfileV2(publicProfile);
    } finally {
      if (nameDescriptor === undefined) Reflect.deleteProperty(Object.prototype, "name");
      else Object.defineProperty(Object.prototype, "name", nameDescriptor);
      if (publicationDescriptor === undefined) Reflect.deleteProperty(Object.prototype, "publication");
      else Object.defineProperty(Object.prototype, "publication", publicationDescriptor);
    }
    expect(calls).toBe(0);
    expect<unknown>(result).toEqual({ ok: true, value: publicProfile });
  });

  test("an inherited descriptor value cannot disguise an accessor as data", () => {
    let reads = 0;
    const badLinks = { ...links };
    Object.defineProperty(badLinks, "github", { enumerable: true, get() { reads += 1; return null; } });
    const original = Object.getOwnPropertyDescriptor(Object.prototype, "value");
    let result: unknown;
    try {
      Object.defineProperty(Object.prototype, "value", { configurable: true, value: null });
      result = parseSuitePublicProfileV2({ ...publicProfile, links: badLinks });
    } finally {
      if (original === undefined) Reflect.deleteProperty(Object.prototype, "value");
      else Object.defineProperty(Object.prototype, "value", original);
    }
    expect(reads).toBe(0);
    expect(result).toEqual({ ok: false, error: { field: "profile", reason: "invalid" } });
  });

  test("rejects accessors without invoking them at top level or inside links", () => {
    let reads = 0;
    for (const [parser, source] of [
      [parseSuitePublicProfileV2, publicProfile], [parseSuiteProfileEditorV2, editor],
      [parseSuiteProfileUpdateV2, update],
    ] as const) {
      const input = { ...source };
      Object.defineProperty(input, "name", { enumerable: true, get() { reads += 1; return "Reader One"; } });
      expect(parser(input).ok).toBe(false);
      const badLinks = { ...links };
      Object.defineProperty(badLinks, "github", { enumerable: true, get() { reads += 1; return null; } });
      expect(parser({ ...source, links: badLinks }).ok).toBe(false);
    }
    expect(reads).toBe(0);
  });

  test("rejects symbols, nonenumerable fields, inherited records, and reflection failures", () => {
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    const inputs: unknown[] = [
      null, [], new Date(0), Object.create(publicProfile), revoked.proxy,
      new Proxy(publicProfile, { ownKeys() { throw new Error("private input"); } }),
      new Proxy(publicProfile, { getPrototypeOf() { throw new Error("private input"); } }),
      new Proxy(publicProfile, { getOwnPropertyDescriptor() { throw new Error("private input"); } }),
      { ...publicProfile, [Symbol("private")]: true },
    ];
    const hidden = { ...publicProfile };
    Object.defineProperty(hidden, "name", { enumerable: false });
    inputs.push(hidden);
    for (const value of inputs) {
      const result = parseSuitePublicProfileV2(value);
      expect(result).toEqual({ ok: false, error: { field: "profile", reason: "invalid" } });
      expect(Object.isFrozen(result)).toBe(true);
      if (!result.ok) expect(Object.isFrozen(result.error)).toBe(true);
    }
    expect(parseSuitePublicProfileV2({ ...publicProfile, links: revoked.proxy }).ok).toBe(false);
    expect(parseSuitePublicProfileV2(Object.assign(Object.create(null) as object, publicProfile)).ok).toBe(true);
  });

  test("copies field snapshots before a nested proxy can mutate earlier input", () => {
    const source = { ...publicProfile };
    const mutatingLinks = new Proxy({ ...links }, {
      getOwnPropertyDescriptor(target, key) {
        source.name = "Changed after snapshot";
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });
    source.links = mutatingLinks;
    const result = parseSuitePublicProfileV2(source);
    expect<unknown>(result).toEqual({ ok: true, value: publicProfile });
    source.bio = "Changed later";
    expect(result.ok && result.value.bio).toBe(publicProfile.bio);
  });
});

describe("GitHub URL policy and avatar reference syntax", () => {
  test("normalizes bounded GitHub profile URLs without claiming provider ownership", () => {
    expect(normalizeSuiteProfileLinkV2("github", "HTTPS://WWW.GITHUB.COM/Reader-One/")).toEqual({ ok: true, value: "https://github.com/reader-one" });
    expect(normalizeSuiteProfileLinkV2("github", `https://github.com/${"a".repeat(100)}`).ok).toBe(true);
    expect(normalizeSuiteProfileLinkV2("github", null)).toEqual({ ok: true, value: null });
    expect(normalizeSuiteProfileLinkV2("github", "")).toEqual({ ok: true, value: null });
  });

  test.each([
    "@reader", "reader", "http://github.com/reader", "https://github.com.evil.example/reader",
    "https://github.com:443/reader", "https://reader@github.com/reader", "https://github.com/reader?",
    "https://github.com/reader#", "https://github.com/reader/repo", "https://github.com//reader",
    "https://github.com/other/../reader", "https://github.com/%72eader", "https:\\github.com\\reader",
    "https://github.com/reader\n", "https://github.com/reader\t", " https://github.com/reader",
    "https://github.com/K", "https://github.com/İ", "https://github.com/reader.",
    `https://github.com/${"a".repeat(101)}`, " ",
  ])("rejects noncanonical or unsafe GitHub input %p", (value) => {
    expect(normalizeSuiteProfileLinkV2("github", value)).toEqual({ ok: false, error: { field: "github", reason: "invalid" } });
  });

  test("invalid keys never become dynamic error fields", () => {
    expect(normalizeSuiteProfileLinkV2("private input", null)).toEqual({ ok: false, error: { field: "profile", reason: "invalid" } });
    expect(normalizeSuiteProfileLinkV2({ toString() { throw new Error("private input"); } }, null).ok).toBe(false);
  });

  test("avatar helpers use one fixed origin and distinct consent/owner routes", () => {
    const origin = getSuiteAccountsDeployment("production").accountsOrigin;
    expect<unknown>(parseSuiteAvatarRef(avatarRef)).toEqual({ ok: true, value: avatarRef });
    expect(suiteProfileAvatarPublicUrl(avatarRef)).toEqual({ ok: true, value: `${origin}/suite/profile/avatar/v1/${avatarRef}.webp` });
    expect(suiteProfileAvatarEditorUrl(avatarRef)).toEqual({ ok: true, value: `${origin}/api/profile/avatar/v1/${avatarRef}.webp` });
    for (const value of [null, "", `avref_${"0".repeat(64)}`, `avref_${"A".repeat(64)}`, `${avatarRef}/x`, `${avatarRef}\n`, "https://other.example/avatar.webp"]) {
      expect(parseSuiteAvatarRef(value).ok).toBe(false);
      expect(suiteProfileAvatarPublicUrl(value).ok).toBe(false);
      expect(suiteProfileAvatarEditorUrl(value).ok).toBe(false);
    }
  });

  test("keeps legacy six-link writes exact and unchanged", () => {
    const { github: _github, ...oldLinks } = links;
    void _github;
    const old = { name: "Reader One", bio: "Bio", links: oldLinks, expectedRevision: 0 };
    expect(parseSuiteProfileUpdateRequest(old)).toEqual({ ok: true, value: old });
    expect(parseSuiteProfileUpdateRequest({ ...old, links }).ok).toBe(false);
    expect(parseSuiteProfileUpdateRequest({ ...old, avatarRef }).ok).toBe(false);
  });
});
