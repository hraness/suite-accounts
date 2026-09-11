import { assertProperty, fc } from "./test-support";
import { describe, expect, test } from "bun:test";

import {
  parseSuiteAccountsPublicConfig,
  suiteAccountsPublicConfigFromEnvironment,
} from "./public-config";

const accounts = {
  NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL:
    "https://qualified-marmot-22.convex.site",
  NEXT_PUBLIC_ACCOUNTS_CONVEX_URL:
    "https://qualified-marmot-22.convex.cloud",
} as const;

describe("suite Accounts public origin laws", () => {
  test("AI Charts never admits loopback hosts or ports as production trust", () => {
    assertProperty(fc.property(
      fc.constantFrom("localhost", "127.0.0.1", "[::1]"),
      fc.tuple(
        fc.integer({ min: 1, max: 65_535 }),
        fc.integer({ min: 1, max: 65_535 }),
        fc.integer({ min: 1, max: 65_535 }),
      ),
      (host, [sitePort, convexPort, convexSitePort]) => {
        const local = {
          NEXT_PUBLIC_SITE_URL: `http://${host}:${sitePort}`,
          NEXT_PUBLIC_ACCOUNTS_CONVEX_URL: `http://${host}:${convexPort}`,
          NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL: `http://${host}:${convexSitePort}`,
        };
        const message = "AI Charts authentication requires its registered production origin.";
        expect(() => parseSuiteAccountsPublicConfig("aicharts", local))
          .toThrow(message);
        expect(suiteAccountsPublicConfigFromEnvironment("aicharts", local))
          .toEqual({ kind: "invalid", message });
        expect(parseSuiteAccountsPublicConfig("soundfish", local))
          .toMatchObject({ kind: "ready", environment: "local" });
      },
    ));
  });

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

  test("BigDataDepot never accepts a decorated, insecure, or legacy origin", () => {
    assertProperty(fc.property(
      fc.constantFrom(
        "https://user:pass@bigdatadepot.com",
        "https://bigdatadepot.com/path",
        "https://bigdatadepot.com/?token=secret",
        "https://bigdatadepot.com/#secret",
        "http://bigdatadepot.com",
        "https://bigdatadepot.com.evil.example",
        "https://bigdatadepot-git-main.vercel.app",
        "https://subdomaindata.com",
        "https://slackorgs.com",
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
