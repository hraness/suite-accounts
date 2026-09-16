import { describe, expect, expectTypeOf, test } from "bun:test";

import { createSuiteAccountsClientConfiguration } from "./client-configuration";
import { parseSuiteConsumerId } from "./identity/consumers";
import { parseSuiteProduct, SUITE_PRODUCTS } from "./identity/principals";
import {
  SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS,
  SUITE_ACCOUNTS_CONSUMERS,
  SUITE_ACCOUNTS_CURRENT_CONSUMERS,
  SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS,
  SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS,
  SUITE_ACCOUNTS_REGISTERED_CONSUMER_IDS,
  SUITE_CONSUMER_IDS,
  SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS,
  getSuiteAccountsConsumerEnvironment,
  getSuiteAccountsCurrentConsumerEnvironment,
  isSuiteAccountsCurrentConsumerId,
  isSuiteAccountsCurrentLinkedOidcConsumerId,
  isSuiteAccountsCurrentOAuthConsumerId,
  isSuiteAccountsCurrentOidcConsumerId,
  isSuiteAccountsRegisteredConsumerId,
  suiteAccountsCurrentConsumerRequiresEmailOtp,
  type SuiteAccountsCurrentLinkedOidcConsumerId,
  type SuiteAccountsCurrentOidcConsumerId,
  type SuiteAccountsRegisteredConsumerId,
} from "./registry";
import {
  suiteAccountsCurrentOidcClientRegistration,
  suiteAccountsCurrentOidcClientRequiresEmailOtp,
  suiteAccountsOidcClientRegistration,
  suiteAccountsOidcClientRequiresEmailOtp,
} from "./urls";

const binding = {
  authMode: "oidc-rp",
  callbackUrl: "https://soulscrape.com/api/suite-auth/callback",
  clientId: "hraness:soulscrape:production:v1",
  consumer: "soulscrape",
  environment: "production",
  origin: "https://soulscrape.com",
} as const;

describe("Soulscrape current registration", () => {
  test("has one exact production OIDC binding and no billing return", () => {
    expect(SUITE_ACCOUNTS_CURRENT_CONSUMERS.soulscrape).toEqual({
      auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
      displayName: "Soulscrape",
      environments: {
        production: {
          billingReturn: { kind: "unsupported" },
          siteUrl: "https://soulscrape.com",
        },
      },
      id: "soulscrape",
    });
    expect(Object.keys(SUITE_ACCOUNTS_CURRENT_CONSUMERS.soulscrape.environments))
      .toEqual(["production"]);
    expect(getSuiteAccountsCurrentConsumerEnvironment("soulscrape", "production"))
      .toEqual({ billingReturn: { kind: "unsupported" }, siteUrl: binding.origin });
    expect(isSuiteAccountsCurrentConsumerId("soulscrape")).toBe(true);
    expect(isSuiteAccountsCurrentOidcConsumerId("soulscrape")).toBe(true);
    expect(isSuiteAccountsCurrentOAuthConsumerId("soulscrape")).toBe(true);
    expect(suiteAccountsCurrentOidcClientRegistration("soulscrape", "production"))
      .toEqual({ callbackUrl: binding.callbackUrl, clientId: binding.clientId });
    expectTypeOf<Extract<SuiteAccountsCurrentOidcConsumerId, "soulscrape">>()
      .toEqualTypeOf<"soulscrape">();
  });

  test("requires email OTP without granting linked-product trust", () => {
    expect(suiteAccountsCurrentConsumerRequiresEmailOtp("soulscrape")).toBe(true);
    expect(suiteAccountsCurrentOidcClientRequiresEmailOtp(binding.clientId))
      .toBe(true);
    expect(SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS)
      .toContain("soulscrape");
    expect(isSuiteAccountsCurrentLinkedOidcConsumerId("soulscrape")).toBe(false);
    expect(SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS)
      .not.toContain("soulscrape");
    expect(SUITE_PRODUCTS).not.toContain("soulscrape");
    expect(parseSuiteProduct("soulscrape"))
      .toEqual({ ok: false, error: "invalid-product" });
    expectTypeOf<Extract<SuiteAccountsCurrentLinkedOidcConsumerId, "soulscrape">>()
      .toEqualTypeOf<never>();
    for (const client of [
      "hraness:soulscrape:preview:v1",
      "hraness:soulscrape:local:v1",
      "hraness:soulscrape:production:v2",
      "hraness:soul-scrape:production:v1",
    ]) {
      expect(suiteAccountsCurrentOidcClientRequiresEmailOtp(client)).toBe(false);
    }
  });

  test("does not extend historical identities or deprecated trust", () => {
    expect(parseSuiteConsumerId("soulscrape"))
      .toEqual({ ok: false, error: "invalid-consumer" });
    for (const ids of [
      SUITE_CONSUMER_IDS,
      SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS,
      SUITE_ACCOUNTS_REGISTERED_CONSUMER_IDS,
      SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS,
    ]) expect(ids).not.toContain("soulscrape");
    expect("soulscrape" in SUITE_ACCOUNTS_CONSUMERS).toBe(false);
    expect(isSuiteAccountsRegisteredConsumerId("soulscrape")).toBe(false);
    expect(getSuiteAccountsConsumerEnvironment("soulscrape", "production"))
      .toBeNull();
    expect(suiteAccountsOidcClientRegistration("soulscrape", "production"))
      .toBeNull();
    expect(suiteAccountsOidcClientRequiresEmailOtp(binding.clientId)).toBe(false);
    expectTypeOf<Extract<SuiteAccountsRegisteredConsumerId, "soulscrape">>()
      .toEqualTypeOf<never>();
  });

  test("the validated factory derives the existing issuer and closed protocol", () => {
    const result = createSuiteAccountsClientConfiguration(binding);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      authBasePath: "/api/suite-auth",
      binding,
      configurationVersion: "suite-accounts-client-configuration-v1",
      wireVersion: "v1",
      provider: {
        issuer: "https://account.hraness.com",
        jwksEndpoint: "https://account.hraness.com/api/auth/jwks",
        resource: "https://hraness.com/suite",
        tokenEndpoint: "https://account.hraness.com/api/auth/oauth2/token",
      },
    });
    expect("grantTypes" in result.value).toBe(false);
    expect("deviceAuthorizationEndpoint" in result.value.provider).toBe(false);
    for (const value of [
      result.value,
      result.value.binding,
      result.value.provider,
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.soulscrape,
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.soulscrape.auth,
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.soulscrape.environments,
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.soulscrape.environments.production,
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.soulscrape.environments.production.billingReturn,
    ]) expect(Object.isFrozen(value)).toBe(true);
    expect(Reflect.set(result.value.binding, "origin", "https://foreign.example"))
      .toBe(false);
    expect(Reflect.set(result.value.provider, "issuer", "https://foreign.example"))
      .toBe(false);
    expect(Reflect.set(
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.soulscrape.environments.production,
      "siteUrl",
      "https://foreign.example",
    )).toBe(false);
    const registration = suiteAccountsCurrentOidcClientRegistration("soulscrape", "production");
    expect(Object.isFrozen(registration)).toBe(true);
    if (registration === null) throw new Error("Missing Soulscrape registration.");
    expect(Reflect.set(registration, "clientId", "foreign")).toBe(false);
  });

  test("rejects altered origin, callback, client, auth mode and environment", () => {
    for (const origin of [
      "http://soulscrape.com", "https://www.soulscrape.com", "https://soulscrape.com/",
      "https://soulscrape.com:443", "https://soulscrape.com.evil.example",
      "https://soulscrape-git-main.vercel.app", "http://localhost:3000",
    ]) {
      expect(createSuiteAccountsClientConfiguration({ ...binding, origin }))
        .toEqual({ ok: false, error: "invalid-origin" });
    }
    for (const callbackUrl of [
      "https://soulscrape.com/api/auth/callback",
      "https://soulscrape.com/api/suite-auth/callback/",
      `${binding.callbackUrl}?next=/`, `${binding.callbackUrl}#fragment`,
      "https://foreign.example/api/suite-auth/callback",
    ]) {
      expect(createSuiteAccountsClientConfiguration({ ...binding, callbackUrl }))
        .toEqual({ ok: false, error: "invalid-callback-url" });
    }
    for (const clientId of [
      "hraness:soulscrape:preview:v1", "hraness:soulscrape:production:v2",
      "hraness:peopleblade:production:v1", null,
    ]) {
      expect(createSuiteAccountsClientConfiguration({ ...binding, clientId }))
        .toEqual({ ok: false, error: "invalid-client-id" });
    }
    for (const environment of ["local", "preview", "staging"]) {
      expect(createSuiteAccountsClientConfiguration({ ...binding, environment }))
        .toEqual({ ok: false, error: "invalid-environment" });
    }
    for (const authMode of ["authority", "proxy", "oauth-cli", "device-code"]) {
      expect(createSuiteAccountsClientConfiguration({ ...binding, authMode }))
        .toEqual({ ok: false, error: "invalid-auth-mode" });
    }
    for (const extra of [
      { issuer: "https://foreign.example" },
      { grantTypes: ["urn:ietf:params:oauth:grant-type:device_code"] },
      { linkedProduct: "soulscrape" },
    ]) {
      expect(createSuiteAccountsClientConfiguration({ ...binding, ...extra }))
        .toEqual({ ok: false, error: "invalid-binding" });
    }
  });
});
