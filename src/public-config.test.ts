import { describe, expect, test } from "bun:test";

import {
  parseSuiteAccountsPublicConfig,
  suiteAccountsPublicConfigFromEnvironment,
} from "./public-config";
import {
  SUITE_CONSUMER_IDS,
  getSuiteAccountsConsumer,
  getSuiteAccountsConsumerEnvironment,
  getSuiteAccountsDeployment,
} from "./registry";

describe("suite Accounts public configuration", () => {
  test("returns every missing public input without inventing a deployment", () => {
    expect(parseSuiteAccountsPublicConfig("draw-money", {})).toEqual({
      kind: "missing",
      missing: [
        "NEXT_PUBLIC_ACCOUNTS_CONVEX_URL",
        "NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL",
        "NEXT_PUBLIC_SITE_URL",
      ],
    });
  });

  test("accepts only each consumer's exact production triple", () => {
    for (const consumer of SUITE_CONSUMER_IDS) {
      const consumerEnvironment = getSuiteAccountsConsumerEnvironment(
        consumer,
        "production",
      );
      if (consumerEnvironment === null) continue;
      const siteUrl = consumerEnvironment.siteUrl;
      const accounts = getSuiteAccountsDeployment("production");
      const parsed = parseSuiteAccountsPublicConfig(consumer, {
        NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL: accounts.convexSiteUrl,
        NEXT_PUBLIC_ACCOUNTS_CONVEX_URL: accounts.convexUrl,
        NEXT_PUBLIC_SITE_URL: siteUrl,
      });
      expect(parsed.kind).toBe("ready");
      if (parsed.kind !== "ready") throw new Error("Expected ready config.");
      expect(parsed).toMatchObject({
        canonicalProductOrigin: siteUrl,
        consumer,
        convexSiteUrl: accounts.convexSiteUrl,
        convexUrl: accounts.convexUrl,
        environment: "production",
        kind: "ready",
        siteUrl,
        surfaceOrigin: siteUrl,
      });
      expect(parsed.authBasePath).toBe(
        getSuiteAccountsConsumer(consumer).auth.basePath,
      );
      expect(parsed.authMode).toBe(
        getSuiteAccountsConsumer(consumer).auth.kind,
      );
      expect(Object.isFrozen(parsed)).toBe(true);
      expect(Reflect.set(parsed, "surfaceOrigin", "https://attacker.invalid"))
        .toBe(false);
      expect(parsed.surfaceOrigin).toBe(siteUrl);
    }
  });

  test("rejects the retired staging deployment and origin", () => {
    expect(() => parseSuiteAccountsPublicConfig("act60", {
      NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL:
        "https://veracious-mink-965.convex.site",
      NEXT_PUBLIC_ACCOUNTS_CONVEX_URL:
        "https://veracious-mink-965.convex.cloud",
      NEXT_PUBLIC_SITE_URL: "https://preview.act60.me",
    })).toThrow("owned deployment environment");
  });

  test("rejects crossed deployments and another consumer's site", () => {
    const production = getSuiteAccountsDeployment("production");
    expect(() => parseSuiteAccountsPublicConfig("draw-money", {
      NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL:
        "https://veracious-mink-965.convex.site",
      NEXT_PUBLIC_ACCOUNTS_CONVEX_URL: production.convexUrl,
      NEXT_PUBLIC_SITE_URL: "https://draw.money",
    })).toThrow("owned deployment environment");
    expect(() => parseSuiteAccountsPublicConfig("draw-money", {
      NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL: production.convexSiteUrl,
      NEXT_PUBLIC_ACCOUNTS_CONVEX_URL: production.convexUrl,
      NEXT_PUBLIC_SITE_URL: "https://gnrte.com",
    })).toThrow("owned deployment environment");
  });

  test("accepts local services only on the same literal loopback host", () => {
    expect(parseSuiteAccountsPublicConfig("gnrte", {
      NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL: "http://127.0.0.1:3211",
      NEXT_PUBLIC_ACCOUNTS_CONVEX_URL: "http://127.0.0.1:3210",
      NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
    })).toEqual({
      authBasePath: "/api/suite-auth",
      authMode: "oidc-rp",
      canonicalProductOrigin: "http://127.0.0.1:3000",
      consumer: "gnrte",
      convexSiteUrl: "http://127.0.0.1:3211",
      convexUrl: "http://127.0.0.1:3210",
      environment: "local",
      kind: "ready",
      siteUrl: "http://127.0.0.1:3000",
      surfaceOrigin: "http://127.0.0.1:3000",
    });
    expect(() => parseSuiteAccountsPublicConfig("gnrte", {
      NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL: "http://localhost:3211",
      NEXT_PUBLIC_ACCOUNTS_CONVEX_URL: "http://127.0.0.1:3210",
      NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
    })).toThrow("same loopback host");
  });

  test("makes Suite auth unavailable on a generated production-backed Preview", () => {
    const production = getSuiteAccountsDeployment("production");
    expect(parseSuiteAccountsPublicConfig("gnrte", {
      NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN:
        "https://gnrte-change-123.vercel.app",
      NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL: production.convexSiteUrl,
      NEXT_PUBLIC_ACCOUNTS_CONVEX_URL: production.convexUrl,
      NEXT_PUBLIC_SITE_URL: "https://gnrte.com",
    })).toEqual({
      canonicalProductOrigin: "https://gnrte.com",
      environment: "production",
      kind: "unavailable",
      message:
        "Suite authentication is unavailable on generated Vercel Preview origins.",
      surfaceOrigin: "https://gnrte-change-123.vercel.app",
    });
  });

  test("converts invalid foreign environment input to a stable invalid state", () => {
    expect(suiteAccountsPublicConfigFromEnvironment("draw-money", {
      NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL:
        "https://qualified-marmot-22.convex.site",
      NEXT_PUBLIC_ACCOUNTS_CONVEX_URL:
        "https://qualified-marmot-22.convex.cloud",
      NEXT_PUBLIC_SITE_URL: "https://user:secret@draw.money",
    })).toEqual({
      kind: "invalid",
      message: "NEXT_PUBLIC_SITE_URL must be a credential-free origin.",
    });
  });
});
