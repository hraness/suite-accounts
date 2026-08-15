import { assertProperty, fc } from "./test-support";
import { describe, expect, test } from "bun:test";

import { filteredSuiteAuthCookieHeader } from "./auth-proxy";
import type { ReadySuiteAccountsPublicConfig } from "./public-config";

const config = {
  authBasePath: "/api/auth",
  authMode: "proxy",
  canonicalProductOrigin: "https://draw.money",
  consumer: "draw-money",
  convexSiteUrl: "https://qualified-marmot-22.convex.site",
  convexUrl: "https://qualified-marmot-22.convex.cloud",
  environment: "production",
  kind: "ready",
  siteUrl: "https://draw.money",
  surfaceOrigin: "https://draw.money",
} as const satisfies ReadySuiteAccountsPublicConfig;

describe("suite auth cookie filtering laws", () => {
  test("an arbitrary foreign cookie never crosses the proxy", () => {
    assertProperty(fc.property(
      fc.string({ maxLength: 128, minLength: 1 }).filter(value =>
        !value.startsWith("__Host-cclrte.")
        && !value.includes(";")
        && !value.includes("=")
      ),
      fc.string({ maxLength: 128 }).filter(value => !value.includes(";")),
      (name, value) => {
        expect(filteredSuiteAuthCookieHeader(
          `${name}=${value}`,
          config,
        )).toBeNull();
      },
    ));
  });

  test("only canonical bounded chunk suffixes are admitted", () => {
    const containsControl = (value: string) => {
      for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        if (code <= 31 || code === 127) return true;
      }
      return false;
    };
    assertProperty(fc.property(
      fc.integer({ max: 99, min: 0 }),
      fc.string({ maxLength: 64 }).filter(value =>
        !containsControl(value)
        && !value.includes(";")
        && value.trim() === value
      ),
      (chunk, value) => {
        const cookie = `__Host-cclrte.session_data.${chunk}=${value}`;
        expect(filteredSuiteAuthCookieHeader(cookie, config)).toBe(cookie);
      },
    ));
  });
});
