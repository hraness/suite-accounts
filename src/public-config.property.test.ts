import { assertProperty, fc } from "./test-support";
import { describe, expect, test } from "bun:test";

import { parseSuiteAccountsPublicConfig } from "./public-config";

const accounts = {
  NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL:
    "https://qualified-marmot-22.convex.site",
  NEXT_PUBLIC_ACCOUNTS_CONVEX_URL:
    "https://qualified-marmot-22.convex.cloud",
} as const;

describe("suite Accounts public origin laws", () => {
  test("never accepts decorated or insecure remote consumer origins", () => {
    assertProperty(fc.property(
      fc.constantFrom(
        "https://user:pass@draw.money",
        "https://draw.money/path",
        "https://draw.money/?token=secret",
        "https://draw.money/#secret",
        "http://draw.money",
      ),
      (siteUrl) => {
        expect(() => parseSuiteAccountsPublicConfig("draw-money", {
          ...accounts,
          NEXT_PUBLIC_SITE_URL: siteUrl,
        })).toThrow();
      },
    ));
  });

  test("a remote consumer never accepts an arbitrary Convex deployment", () => {
    assertProperty(fc.property(
      fc
        .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz".split("")), {
          maxLength: 20,
          minLength: 1,
        })
        .map(value => value.join("")),
      (deployment) => {
        expect(() => parseSuiteAccountsPublicConfig("draw-money", {
          NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL:
            `https://${deployment}-123.convex.site`,
          NEXT_PUBLIC_ACCOUNTS_CONVEX_URL:
            `https://${deployment}-123.convex.cloud`,
          NEXT_PUBLIC_SITE_URL: "https://draw.money",
        })).toThrow();
      },
    ));
  });

  test("SlackOrgs never accepts a decorated or insecure canonical origin", () => {
    assertProperty(fc.property(
      fc.constantFrom(
        "https://user:pass@slackorgs.com",
        "https://slackorgs.com/path",
        "https://slackorgs.com/?token=secret",
        "https://slackorgs.com/#secret",
        "http://slackorgs.com",
        "https://slackorgs.com.evil.example",
        "https://slackorgs-git-main.vercel.app",
      ),
      (siteUrl) => {
        expect(() => parseSuiteAccountsPublicConfig("slackorgs", {
          ...accounts,
          NEXT_PUBLIC_SITE_URL: siteUrl,
        })).toThrow();
      },
    ));
  });
});
