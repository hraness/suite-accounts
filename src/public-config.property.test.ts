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
  test("retired aicharts never admits arbitrary loopback hosts or ports", () => {
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
        expect(() => { Reflect.apply(parseSuiteAccountsPublicConfig, undefined, ["aicharts", local]); })
          .toThrow();
        const result: unknown = Reflect.apply(suiteAccountsPublicConfigFromEnvironment, undefined, ["aicharts", local]);
        expect(result).toMatchObject({ kind: "invalid" });
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

  test("PeopleBlade never accepts a decorated or insecure origin", () => {
    assertProperty(fc.property(
      fc.constantFrom(
        "https://user:pass@peopleblade.com",
        "https://peopleblade.com/path",
        "https://peopleblade.com/?token=secret",
        "https://peopleblade.com/#secret",
        "http://peopleblade.com",
        "https://peopleblade.com.evil.example",
        "https://peopleblade-git-main.vercel.app",
      ),
      (siteUrl) => {
        expect(() => parseSuiteAccountsPublicConfig("peopleblade", {
          ...accounts,
          NEXT_PUBLIC_SITE_URL: siteUrl,
        })).toThrow();
      },
    ));
  });
});
