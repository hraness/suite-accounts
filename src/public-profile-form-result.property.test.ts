import { expect, test } from "bun:test";
import { parseSuiteAccountId } from "./identity/identifiers";
import { parseSuiteProfileEditorV2, parseSuiteProfileUpdateV2 } from "./identity/profiles-v2";
import { parsePublicProfileFormResult } from "./public-profile-form-result";
import { assertProperty, fc } from "./test-support";

const owner = parseSuiteAccountId(`acct_${"1".repeat(32)}`);
if (!owner.ok) throw new Error("invalid synthetic account");
const accountId = owner.value;
const links = {
  bluesky: null, github: null, instagram: null, linkedin: null,
  telegram: null, website: null, x: null,
};
function request(revision: number) {
  const parsed = parseSuiteProfileUpdateV2({
    schemaVersion: 2, expectedRevision: revision, name: "Reader", bio: "",
    links, avatarRef: null, publication: "private",
  });
  if (!parsed.ok) throw new Error("invalid synthetic request");
  return parsed.value;
}
function profile(revision: number) {
  return {
    schemaVersion: 2, accountId, username: null, name: "Reader", bio: "",
    links, avatarRef: null, revision, publication: "private",
  };
}

function currentProfile(revision: number) {
  const parsed = parseSuiteProfileEditorV2({ ...profile(revision), name: revision === 0 ? "" : "Reader" });
  if (!parsed.ok) throw new Error("invalid synthetic current profile");
  return parsed.value;
}

test("save result parsing is total over arbitrary responses and runtime arguments", () => {
  assertProperty(fc.property(fc.anything(), fc.anything(), fc.anything(), (value, account, update) => {
    expect(() => parsePublicProfileFormResult(value, currentProfile(1), request(1))).not.toThrow();
    expect(() => { Reflect.apply(parsePublicProfileFormResult, undefined, [value, account, update]); }).not.toThrow();
  }));
});

test("saved and conflict revisions obey their exact ordering laws", () => {
  assertProperty(fc.property(
    fc.integer({ min: 0, max: 1_000_000 }),
    fc.integer({ min: 1, max: 1_000_002 }),
    (expected, actual) => {
      const update = request(expected);
      const saved = parsePublicProfileFormResult({ status: "saved", profile: profile(actual) }, currentProfile(expected), update);
      const conflict = parsePublicProfileFormResult({ status: "conflict", profile: profile(actual) }, currentProfile(expected), update);
      expect(saved !== null).toBe(actual === expected || actual === expected + 1);
      expect(conflict !== null).toBe(actual > expected);
    },
  ));
});

test("matching saved results round trip and never retain caller profile objects", () => {
  assertProperty(fc.property(fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER - 1 }), fc.boolean(), (revision, advances) => {
    const update = request(revision);
    const source = { status: "saved", profile: profile(revision + (advances ? 1 : 0)) };
    const parsed = parsePublicProfileFormResult(source, currentProfile(revision), update);
    expect<unknown>(parsed).toEqual(source);
    if (parsed?.status !== "saved") throw new Error("expected saved result");
    expect(parsePublicProfileFormResult(parsed, currentProfile(revision), update)).toEqual(parsed);
    expect(parsed.profile).not.toBe(source.profile);
    expect(parsed.profile.links).not.toBe(source.profile.links);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.profile)).toBe(true);
    expect(Object.isFrozen(parsed.profile.links)).toBe(true);
  }));
});

test("a mismatched captured revision cannot accept any response status", () => {
  assertProperty(fc.property(fc.integer({ min: 1, max: 1_000_000 }), fc.constantFrom(
    "saved", "conflict", "unauthorized", "username_required", "invalid_avatar",
  ), (revision, status) => {
    const value = status === "saved" || status === "conflict"
      ? { status, profile: profile(revision + 1) }
      : { status };
    expect(parsePublicProfileFormResult(value, currentProfile(revision + 1), request(revision))).toBeNull();
  }));
});

test("arbitrary additional response keys are rejected rather than projected away", () => {
  assertProperty(fc.property(fc.string(), fc.anything(), (suffix, value) => {
    const extra = `extra_${suffix}`;
    const saved = { status: "saved", profile: profile(2) };
    expect(parsePublicProfileFormResult({ ...saved, [extra]: value }, currentProfile(1), request(1))).toBeNull();
    expect(parsePublicProfileFormResult({ status: "unauthorized", [extra]: value }, currentProfile(1), request(1))).toBeNull();
    expect(parsePublicProfileFormResult({ ...saved, profile: { ...saved.profile, [extra]: value } }, currentProfile(1), request(1))).toBeNull();
  }));
});

test("changing any submitted name never becomes a saved acknowledgement", () => {
  assertProperty(fc.property(fc.string({ maxLength: 100 }), (name) => {
    const changed = `Different ${name}`;
    expect(parsePublicProfileFormResult({ status: "saved", profile: { ...profile(2), name: changed } }, currentProfile(1), request(1))).toBeNull();
  }));
});
