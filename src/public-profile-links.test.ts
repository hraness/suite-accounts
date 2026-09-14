import { expect, test } from "bun:test";
import { normalizeSuiteProfileLinkV2 } from "./identity/profiles-v2.js";
import {
  expandSuiteProfileLinkInput,
  SUITE_PROFILE_LINK_AFFORDANCES,
} from "./public-profile-links.js";

test("every link field carries a prefixed icon affordance", () => {
  for (const [key, affordance] of Object.entries(SUITE_PROFILE_LINK_AFFORDANCES)) {
    expect(affordance.prefix.length).toBeGreaterThan(0);
    expect(affordance.placeholder.length).toBeGreaterThan(0);
    expect(affordance.glyph.length).toBeGreaterThan(0);
    expect(key).toBe(key.toLowerCase());
  }
  expect(Object.keys(SUITE_PROFILE_LINK_AFFORDANCES).sort()).toEqual([
    "bluesky", "github", "instagram", "linkedin", "telegram", "website", "x",
  ]);
});

test("bare handles expand to parser-canonical HTTPS forms", () => {
  const cases = [
    ["x", "bg", "https://x.com/bg"],
    ["x", "@bg", "https://x.com/bg"],
    ["github", "bg", "https://github.com/bg"],
    ["github", "@bg", "https://github.com/bg"],
    ["linkedin", "bg", "https://www.linkedin.com/in/bg"],
    ["instagram", "bg", "https://www.instagram.com/bg"],
    ["telegram", "benzguo", "https://t.me/benzguo"],
    ["bluesky", "bg", "https://bsky.app/profile/bg.bsky.social"],
    ["bluesky", "bg.example", "https://bsky.app/profile/bg.example"],
    ["website", "example.com", "https://example.com"],
    ["website", "example.com/a", "https://example.com/a"],
  ] as const;
  for (const [key, input, expected] of cases) {
    const expanded = expandSuiteProfileLinkInput(key, input);
    expect(expanded).toBe(expected);
    const parsed = normalizeSuiteProfileLinkV2(key, expanded);
    expect(parsed.ok).toBe(true);
  }
});

test("schemeless host paths and complete URLs pass through untouched", () => {
  expect(expandSuiteProfileLinkInput("github", "github.com/bg")).toBe("https://github.com/bg");
  expect(expandSuiteProfileLinkInput("x", "x.com/bg")).toBe("https://x.com/bg");
  expect(expandSuiteProfileLinkInput("website", "https://example.com")).toBe("https://example.com");
  expect(expandSuiteProfileLinkInput("github", "https://github.com/bg")).toBe("https://github.com/bg");
});

test("empty and unfixable input stays for the parser to reject", () => {
  expect(expandSuiteProfileLinkInput("github", "")).toBe("");
  expect(expandSuiteProfileLinkInput("github", "   ")).toBe("");
  expect(expandSuiteProfileLinkInput("website", " ")).toBe("");
});
