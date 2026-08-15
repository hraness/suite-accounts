import { describe, expect, test } from "bun:test";

import {
  normalizeSuiteUsername,
  parseSuiteUsername,
  SUITE_USERNAME_MAX_LENGTH,
} from "./usernames";

describe("suite usernames", () => {
  test("normalizes human input to one lowercase lookup key", () => {
    const normalized = normalizeSuiteUsername("  Ben_Guo  ");
    expect(normalized.ok).toBe(true);
    if (normalized.ok) expect(String(normalized.value)).toBe("ben_guo");
    const parsed = parseSuiteUsername("ben_guo");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(String(parsed.value)).toBe("ben_guo");
    expect(parseSuiteUsername("Ben_Guo")).toEqual({
      error: "invalid-suite-username",
      ok: false,
    });
  });

  test("accepts readable internal separators", () => {
    for (const username of ["ben-guo", "b3n_gu0", "abc", "123"]) {
      expect(parseSuiteUsername(username).ok).toBe(true);
    }
  });

  test("rejects ambiguous punctuation, Unicode lookalikes, and bad edges", () => {
    for (const username of [
      "-benguo",
      "benguo_",
      "ben--guo",
      "ben_-guo",
      "ben.guo",
      "bén",
      "ｂｅｎ",
      "Kate",
      "two words",
    ]) {
      expect(normalizeSuiteUsername(username)).toEqual({
        error: "invalid-suite-username",
        ok: false,
      });
    }
  });

  test("keeps length and reserved-name failures explicit", () => {
    expect(normalizeSuiteUsername("ab")).toEqual({
      error: "suite-username-too-short",
      ok: false,
    });
    expect(normalizeSuiteUsername("a".repeat(SUITE_USERNAME_MAX_LENGTH + 1)))
      .toEqual({
        error: "suite-username-too-long",
        ok: false,
      });
    for (const reserved of [
      "account",
      "Admin",
      "api",
      "design",
      "docs",
      "hraness",
      "new",
      "party",
      "place",
      "pub",
      "social-image",
      "source",
      "sources",
    ]) {
      expect(normalizeSuiteUsername(reserved)).toEqual({
        error: "suite-username-reserved",
        ok: false,
      });
    }
  });

  test("keeps claim-time reservations independent from stored parsing", () => {
    expect(normalizeSuiteUsername("docs")).toEqual({
      error: "suite-username-reserved",
      ok: false,
    });
    expect(parseSuiteUsername("docs").ok).toBe(true);
  });
});
