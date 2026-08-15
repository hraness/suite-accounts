import { describe, expect, test } from "bun:test";

import {
  normalizeSuiteProfileLink,
  parseSuiteCommunityProfileView,
  parseSuiteProfileUpdateRequest,
  parseSuiteProfileView,
  type SuiteProfileUpdateRequest,
  type SuiteProfileView,
} from "./profiles";

const update: SuiteProfileUpdateRequest = {
  bio: "Builds small computers.",
  expectedRevision: 0,
  links: {
    bluesky: "https://bsky.app/profile/reader.bsky.social",
    instagram: "https://www.instagram.com/reader",
    linkedin: "https://www.linkedin.com/in/reader",
    telegram: "https://t.me/reader_one",
    website: "https://reader.example/about?from=oh",
    x: "https://x.com/reader",
  },
  name: "Reader One",
};

const view: SuiteProfileView = {
  bio: update.bio,
  email: "reader@example.com",
  links: update.links,
  name: update.name,
  revision: 1,
};

describe("suite profile input", () => {
  test("normalizes ergonomic handles and exact profile URLs", () => {
    expect(normalizeSuiteProfileLink("x", "@Reader")).toEqual({
      ok: true,
      value: "https://x.com/reader",
    });
    expect(
      normalizeSuiteProfileLink("bluesky", "@Reader.bsky.social"),
    ).toEqual({
      ok: true,
      value: "https://bsky.app/profile/reader.bsky.social",
    });
    expect(normalizeSuiteProfileLink("instagram", "Reader.Name")).toEqual({
      ok: true,
      value: "https://www.instagram.com/reader.name",
    });
    expect(normalizeSuiteProfileLink("telegram", "@Reader_One")).toEqual({
      ok: true,
      value: "https://t.me/reader_one",
    });
    expect(
      normalizeSuiteProfileLink(
        "linkedin",
        "https://linkedin.com/in/Reader-One/",
      ),
    ).toEqual({
      ok: true,
      value: "https://www.linkedin.com/in/reader-one",
    });
  });

  test("normalizes owned text and accepts canonical round trips", () => {
    const parsed = parseSuiteProfileUpdateRequest({
      ...update,
      bio: "  Builds small computers. \r\n",
      links: {
        ...update.links,
        x: "@Reader",
      },
      name: "  Reader   One  ",
    });
    expect(parsed).toEqual({ ok: true, value: update });
    expect(parseSuiteProfileUpdateRequest(update)).toEqual({
      ok: true,
      value: update,
    });
    expect(parseSuiteProfileView(view)).toEqual({ ok: true, value: view });
    expect(parseSuiteProfileView({ ...view, name: "" })).toEqual({
      ok: true,
      value: { ...view, name: "" },
    });
  });

  test("rejects smuggled fields and unsafe or lookalike URLs", () => {
    expect(parseSuiteProfileUpdateRequest({
      ...update,
      email: "attacker@example.com",
    }).ok).toBe(false);
    for (const [key, value] of [
      ["x", "https://x.com.evil.example/reader"],
      ["x", "https://x.com/reader?token=secret"],
      ["linkedin", "reader"],
      ["linkedin", "https://linkedin.com/company/reader"],
      ["instagram", "."],
      ["instagram", "reader..name"],
      ["website", "http://reader.example"],
      ["website", "https://user:password@reader.example"],
      ["website", "https://reader.example/#secret"],
    ] as const) {
      expect(normalizeSuiteProfileLink(key, value).ok).toBe(false);
    }
  });
});

describe("suite community profile view", () => {
  test("parses the joined profile and application contract", () => {
    const value = {
      application: {
        community: "oh-computer",
        status: "submitted",
        submittedAtMs: 1_800_000_000_000,
        updatedAtMs: 1_800_000_000_001,
      },
      profile: view,
    } as const;
    expect(parseSuiteCommunityProfileView(value)).toEqual({
      ok: true,
      value,
    });
  });

  test("rejects stale snapshots with noncanonical profile URLs", () => {
    expect(parseSuiteCommunityProfileView({
      application: null,
      profile: {
        ...view,
        links: { ...view.links, x: "@reader" },
      },
    }).ok).toBe(false);
  });
});
