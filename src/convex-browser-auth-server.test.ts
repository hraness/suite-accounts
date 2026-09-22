import { describe, expect, test } from "bun:test";

import {
  SUITE_CONVEX_BROWSER_CONSUMER_IDS,
  type SuiteConvexBrowserConfiguration,
} from "./convex-browser-auth";
import {
  createSuiteConvexBrowserAuthHandlers,
  createSuiteConvexBrowserTokenSigner,
  parseSuiteConvexBrowserKeyring,
  type SuiteConvexBrowserKeyring,
} from "./convex-browser-auth-server";

// The retired Elders trust values stay in fixtures so the closure assertions
// prove a formerly registered consumer cannot reopen the grant.
const retiredConfiguration: SuiteConvexBrowserConfiguration = {
  audience: "https://elders.hraness.com/convex",
  clientId: "hraness:elders:production:v1",
  consumer: "elders" as never,
  environment: "production",
  issuer: "https://elders.hraness.com/api/convex-auth",
  jwksEndpoint: "https://elders.hraness.com/api/convex-auth/jwks",
  siteUrl: "https://elders.hraness.com",
  suiteIssuer: "https://account.hraness.com",
  tokenEndpoint: "https://elders.hraness.com/api/convex-auth/token",
};

const retiredKeyringValue = {
  activeKid: "elders-production-2",
  consumer: "elders",
  environment: "production",
  keys: [],
  version: "suite-convex-browser-keyring-v1",
} as const;

describe("suite Convex browser server authority", () => {
  test("admits no consumer after the Elders grant retired", () => {
    expect(SUITE_CONVEX_BROWSER_CONSUMER_IDS).toEqual([]);
  });

  test("rejects the retired keyring, signer, and route handlers", () => {
    expect(() => parseSuiteConvexBrowserKeyring(
      retiredKeyringValue,
      retiredConfiguration,
    )).toThrow("no Convex browser-token grant");
    const retiredKeyring = undefined as unknown as SuiteConvexBrowserKeyring;
    expect(() => createSuiteConvexBrowserTokenSigner(
      retiredConfiguration,
      retiredKeyring,
      () => 1_800_000_300_250,
    )).toThrow("no Convex browser-token grant");
    expect(() => createSuiteConvexBrowserAuthHandlers({
      configuration: retiredConfiguration,
      keyring: retiredKeyring,
      now: () => 1_800_000_300_250,
      serverSession: () => Promise.reject(new Error("must not read session")),
    })).toThrow("no Convex browser-token grant");
  });
});
