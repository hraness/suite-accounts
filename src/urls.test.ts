import { describe, expect, test } from "bun:test";

import {
  getSuiteAccountsConsumer,
  SUITE_CONSUMER_IDS,
} from "./registry";
import {
  suiteAccountsBillingReturnUrl,
  suiteAccountsCentralUrl,
  suiteAccountsCurrentOidcClientRegistration,
  suiteAccountsOidcClientRegistration,
  suiteAccountsOidcClientRequiresEmailOtp,
  suiteAccountsOidcProviderConfiguration,
} from "./urls";

describe("suite Accounts URLs", () => {
  test("resolves only closed central destinations", () => {
    expect(suiteAccountsCentralUrl("production", "account")).toBe(
      "https://account.hraness.com/account",
    );
  });

  test("pins provider endpoints instead of trusting discovery URLs", () => {
    expect(suiteAccountsOidcProviderConfiguration("production")).toEqual({
      authorizationEndpoint:
        "https://account.hraness.com/api/auth/oauth2/authorize",
      discoveryEndpoint:
        "https://account.hraness.com/.well-known/openid-configuration",
      entitlementReceiptEndpoint:
        "https://account.hraness.com/suite/entitlements/receipt",
      identityLinkReceiptEndpoint:
        "https://account.hraness.com/suite/identity-links/receipt",
      issuer: "https://account.hraness.com",
      jwksEndpoint: "https://account.hraness.com/api/auth/jwks",
      resource: "https://hraness.com/suite",
      revocationEndpoint:
        "https://account.hraness.com/api/auth/oauth2/revoke",
      tokenEndpoint: "https://account.hraness.com/api/auth/oauth2/token",
      userInfoAudience:
        "https://account.hraness.com/api/auth/oauth2/userinfo",
    });
  });

  test("keeps billing return support separate from consumer registration", () => {
    expect(suiteAccountsBillingReturnUrl("accounts", "production")).toBe(
      "https://account.hraness.com/account",
    );
    for (const consumer of SUITE_CONSUMER_IDS) {
      if (consumer === "accounts") continue;
      expect(suiteAccountsBillingReturnUrl(consumer, "production")).toBeNull();
    }
  });

  test("returns exact OAuth client IDs and callback URLs for every public client", () => {
    expect(suiteAccountsOidcClientRegistration("accounts", "production"))
      .toBeNull();
    expect(suiteAccountsOidcClientRegistration("draw-money", "production"))
      .toBeNull();
    for (const consumer of SUITE_CONSUMER_IDS) {
      if (
        consumer === "accounts"
        || consumer === "draw-money"
      ) {
        continue;
      }
      const production =
        suiteAccountsOidcClientRegistration(consumer, "production");
      const expectedProductionOrigin =
        getSuiteAccountsConsumer(consumer).environments.production.siteUrl;
      expect(production).toEqual({
        callbackUrl: new URL(
          "/api/suite-auth/callback",
          expectedProductionOrigin,
        ).href,
        clientId: `hraness:${consumer}:production:v1`,
      });
    }
    expect(
      suiteAccountsOidcClientRegistration("oprte", "production"),
    ).toEqual({
      callbackUrl: "https://oprte.com/api/suite-auth/callback",
      clientId: "hraness:oprte:production:v1",
    });
    expect(
      suiteAccountsOidcClientRegistration("sponge", "production"),
    ).toEqual({
      callbackUrl: "https://spongesearch.com/api/suite-auth/callback",
      clientId: "hraness:sponge:production:v1",
    });
    expect(
      suiteAccountsCurrentOidcClientRegistration("sponge", "production"),
    ).toEqual({
      callbackUrl: "https://sponge.computer/api/suite-auth/callback",
      clientId: "hraness:sponge:production:v1",
    });
  });

  test("matches only checked email-OTP-required client IDs", () => {
    expect(suiteAccountsOidcClientRequiresEmailOtp(
      "hraness:elders:production:v1",
    )).toBe(true);
    expect(suiteAccountsOidcClientRequiresEmailOtp(
      "hraness:elders:staging:v1",
    )).toBe(false);
    expect(suiteAccountsOidcClientRequiresEmailOtp(
      "hraness:sup:production:v1",
    )).toBe(true);
    expect(suiteAccountsOidcClientRequiresEmailOtp(
      "hraness:elders:local:v1",
    )).toBe(false);
    expect(suiteAccountsOidcClientRequiresEmailOtp(
      "hraness:ask-town:production:v1",
    )).toBe(false);
  });

  test("rejects retired OAuth clients", () => {
    expect(
      suiteAccountsOidcClientRegistration("kitchen", "production"),
    ).toBeNull();
    for (const retired of ["transmute", "transmute-cli", "studio", "graphics", "loops"]) {
      expect(suiteAccountsOidcClientRegistration(retired, "production"))
        .toBeNull();
    }
  });

  test("returns immutable RP endpoints and client registrations", () => {
    const provider = suiteAccountsOidcProviderConfiguration("production");
    const registration = suiteAccountsOidcClientRegistration(
      "oprte",
      "production",
    );
    if (registration === null) throw new Error("Missing OPRTE registration.");
    expect(Reflect.set(
      provider,
      "authorizationEndpoint",
      "https://attacker.example/authorize",
    )).toBe(false);
    expect(Reflect.set(
      registration,
      "callbackUrl",
      "https://attacker.example/callback",
    )).toBe(false);
    expect(suiteAccountsOidcProviderConfiguration("production").authorizationEndpoint)
      .toBe("https://account.hraness.com/api/auth/oauth2/authorize");
    expect(suiteAccountsOidcClientRegistration("oprte", "production")?.callbackUrl)
      .toBe("https://oprte.com/api/suite-auth/callback");
  });
});
