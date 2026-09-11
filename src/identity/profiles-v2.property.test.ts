import { expect, test } from "bun:test";
import { assertProperty, fc } from "../test-support";
import {
  normalizeSuiteProfileLinkV2,
  parseSuiteAvatarRef,
  parseSuiteProfileEditorV2,
  parseSuiteProfileUpdateV2,
  parseSuitePublicProfileV2,
  suiteProfileAvatarEditorUrl,
  suiteProfileAvatarPublicUrl,
} from "./profiles-v2";

const parsers = [
  parseSuiteAvatarRef, parseSuiteProfileEditorV2, parseSuiteProfileUpdateV2,
  parseSuitePublicProfileV2, suiteProfileAvatarEditorUrl, suiteProfileAvatarPublicUrl,
] as const;
const nullLinks = {
  bluesky: null, github: null, instagram: null, linkedin: null,
  telegram: null, website: null, x: null,
};
const hex = fc.array(fc.constantFrom(..."0123456789abcdef"), { minLength: 64, maxLength: 64 })
  .map((characters) => characters.join(""));
const text = fc.array(fc.constantFrom(..."abcdef 0123456789"), { minLength: 1, maxLength: 100 })
  .map((characters) => `A${characters.join("")}`);
const githubPath = fc.array(fc.constantFrom(..."abcdefABCDEF0123456789_-"), { minLength: 1, maxLength: 100 })
  .map((characters) => characters.join(""));

test("v2 parsers and link normalization are total over arbitrary foreign values", () => {
  assertProperty(fc.property(fc.anything(), fc.anything(), (value, key) => {
    for (const parser of parsers) expect(() => parser(value)).not.toThrow();
    expect(() => normalizeSuiteProfileLinkV2(key, value)).not.toThrow();
    for (const known of ["x", "github", "linkedin", "bluesky", "instagram", "telegram", "website"]) {
      expect(() => normalizeSuiteProfileLinkV2(known, value)).not.toThrow();
    }
  }));
});

test("normalized updates round trip into exact frozen public and editor projections", () => {
  assertProperty(fc.property(text, githubPath, fc.integer({ min: 1, max: 1_000_000 }), (name, path, revision) => {
    const parsed = parseSuiteProfileUpdateV2({
      schemaVersion: 2, expectedRevision: revision - 1, name, bio: "  Bio\r\n",
      links: { ...nullLinks, github: `https://www.github.com/${path}/` },
      avatarRef: null, publication: "publish",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const publicProfile = {
      schemaVersion: 2, accountId: `acct_${"1".repeat(32)}`, username: "reader-one",
      name: parsed.value.name, bio: parsed.value.bio, links: parsed.value.links,
      avatarRef: parsed.value.avatarRef, revision,
    };
    expect(parseSuiteProfileUpdateV2(parsed.value)).toEqual(parsed);
    const publicResult = parseSuitePublicProfileV2(publicProfile);
    expect<unknown>(publicResult).toEqual({ ok: true, value: publicProfile });
    const editor = { ...publicProfile, publication: "published" };
    expect<unknown>(parseSuiteProfileEditorV2(editor)).toEqual({ ok: true, value: editor });
    expect(Object.isFrozen(parsed.value.links)).toBe(true);
    if (publicResult.ok) {
      expect(Object.isFrozen(publicResult.value)).toBe(true);
      expect(publicResult.value.links).not.toBe(parsed.value.links);
    }
  }));
});

test("opaque avatar references preserve all bytes and only select the fixed URL path", () => {
  assertProperty(fc.property(hex, (suffix) => {
    const ref = `avref_${suffix}`;
    const parsed = parseSuiteAvatarRef(ref);
    expect(parsed.ok).toBe(suffix !== "0".repeat(64));
    if (!parsed.ok) return;
    expect(parseSuiteAvatarRef(parsed.value)).toEqual(parsed);
    for (const [builder, prefix] of [
      [suiteProfileAvatarPublicUrl, "/suite/profile/avatar/v1/"],
      [suiteProfileAvatarEditorUrl, "/api/profile/avatar/v1/"],
    ] as const) {
      const url = builder(ref);
      expect(url).toEqual({ ok: true, value: `https://account.hraness.com${prefix}${ref}.webp` });
    }
    expect(parseSuiteAvatarRef(`${ref}/`).ok).toBe(false);
  }));
});

test("every arbitrary extra string key is refused instead of projected away", () => {
  const input = {
    schemaVersion: 2, accountId: `acct_${"1".repeat(32)}`, username: "reader-one",
    name: "Reader", bio: "", links: nullLinks, avatarRef: null, revision: 1,
  };
  assertProperty(fc.property(fc.string(), fc.anything(), (key, value) => {
    const extra = `extra_${key}`;
    const result = parseSuitePublicProfileV2({ ...input, [extra]: value });
    expect(result).toEqual({ ok: false, error: { field: "profile", reason: "invalid" } });
  }));
});

test("GitHub normalization is idempotent and never changes the canonical host", () => {
  assertProperty(fc.property(githubPath, (path) => {
    const first = normalizeSuiteProfileLinkV2("github", `HTTPS://WWW.GITHUB.COM/${path}/`);
    expect(first).toEqual({ ok: true, value: `https://github.com/${path.toLowerCase()}` });
    if (!first.ok) return;
    expect(normalizeSuiteProfileLinkV2("github", first.value)).toEqual(first);
  }));
});
