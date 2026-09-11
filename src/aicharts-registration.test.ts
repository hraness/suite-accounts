import { describe, expect, expectTypeOf, test } from "bun:test";

import { createSuiteAccountsClientConfiguration } from "./client-configuration";
import { parseSuiteConsumerId } from "./identity/consumers";
import { parseSuiteProduct, SUITE_PRODUCTS } from "./identity/principals";
import {
  SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS,
  SUITE_ACCOUNTS_CONSUMERS,
  SUITE_ACCOUNTS_CURRENT_CONSUMERS,
  SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS,
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
  callbackUrl: "https://aicharts.io/api/suite-auth/callback",
  clientId: "hraness:aicharts:production:v1",
  consumer: "aicharts",
  environment: "production",
  origin: "https://aicharts.io",
} as const;

describe("AI Charts current registration", () => {
  test("has one exact production OIDC binding and no billing return", () => {
    expect(SUITE_ACCOUNTS_CURRENT_CONSUMERS.aicharts).toEqual({
      auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
      displayName: "AI Charts",
      environments: {
        production: {
          billingReturn: { kind: "unsupported" },
          siteUrl: "https://aicharts.io",
        },
      },
      id: "aicharts",
    });
    expect(Object.keys(SUITE_ACCOUNTS_CURRENT_CONSUMERS.aicharts.environments))
      .toEqual(["production"]);
    expect(getSuiteAccountsCurrentConsumerEnvironment("aicharts", "production"))
      .toEqual({ billingReturn: { kind: "unsupported" }, siteUrl: binding.origin });
    expect(isSuiteAccountsCurrentConsumerId("aicharts")).toBe(true);
    expect(isSuiteAccountsCurrentOidcConsumerId("aicharts")).toBe(true);
    expect(isSuiteAccountsCurrentOAuthConsumerId("aicharts")).toBe(true);
    expect(suiteAccountsCurrentOidcClientRegistration("aicharts", "production"))
      .toEqual({ callbackUrl: binding.callbackUrl, clientId: binding.clientId });
    expectTypeOf<Extract<SuiteAccountsCurrentOidcConsumerId, "aicharts">>()
      .toEqualTypeOf<"aicharts">();
  });

  test("requires email OTP without granting linked-product trust", () => {
    expect(suiteAccountsCurrentConsumerRequiresEmailOtp("aicharts")).toBe(true);
    expect(suiteAccountsCurrentOidcClientRequiresEmailOtp(binding.clientId))
      .toBe(true);
    expect(SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS)
      .toContain("aicharts");
    expect(isSuiteAccountsCurrentLinkedOidcConsumerId("aicharts")).toBe(false);
    expect(SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS)
      .not.toContain("aicharts");
    expect(SUITE_PRODUCTS).not.toContain("aicharts");
    expect(parseSuiteProduct("aicharts"))
      .toEqual({ ok: false, error: "invalid-product" });
    expectTypeOf<Extract<SuiteAccountsCurrentLinkedOidcConsumerId, "aicharts">>()
      .toEqualTypeOf<never>();
    for (const client of [
      "hraness:aicharts:preview:v1",
      "hraness:aicharts:local:v1",
      "hraness:aicharts:production:v2",
      "hraness:ai-charts:production:v1",
    ]) {
      expect(suiteAccountsCurrentOidcClientRequiresEmailOtp(client)).toBe(false);
    }
  });

  test("does not extend historical identities or deprecated trust", () => {
    expect(parseSuiteConsumerId("aicharts"))
      .toEqual({ ok: false, error: "invalid-consumer" });
    for (const ids of [
      SUITE_CONSUMER_IDS,
      SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS,
      SUITE_ACCOUNTS_REGISTERED_CONSUMER_IDS,
      SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS,
    ]) expect(ids).not.toContain("aicharts");
    expect("aicharts" in SUITE_ACCOUNTS_CONSUMERS).toBe(false);
    expect(isSuiteAccountsRegisteredConsumerId("aicharts")).toBe(false);
    expect(getSuiteAccountsConsumerEnvironment("aicharts", "production"))
      .toBeNull();
    expect(suiteAccountsOidcClientRegistration("aicharts", "production"))
      .toBeNull();
    expect(suiteAccountsOidcClientRequiresEmailOtp(binding.clientId)).toBe(false);
    expectTypeOf<Extract<SuiteAccountsRegisteredConsumerId, "aicharts">>()
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
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.aicharts,
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.aicharts.auth,
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.aicharts.environments,
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.aicharts.environments.production,
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.aicharts.environments.production.billingReturn,
    ]) expect(Object.isFrozen(value)).toBe(true);
    expect(Reflect.set(result.value.binding, "origin", "https://foreign.example"))
      .toBe(false);
    expect(Reflect.set(result.value.provider, "issuer", "https://foreign.example"))
      .toBe(false);
    expect(Reflect.set(
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.aicharts.environments.production,
      "siteUrl",
      "https://foreign.example",
    )).toBe(false);
    expect(Reflect.set(SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS, "0", "foreign"))
      .toBe(false);
    const registration = suiteAccountsCurrentOidcClientRegistration("aicharts", "production");
    expect(Object.isFrozen(registration)).toBe(true);
    if (registration === null) throw new Error("Missing AI Charts registration.");
    expect(Reflect.set(registration, "clientId", "foreign")).toBe(false);
  });

  test("rejects altered origin, callback, client, auth mode and environment", () => {
    for (const origin of [
      "http://aicharts.io", "https://www.aicharts.io", "https://aicharts.io/",
      "https://aicharts.io:443", "https://aicharts.io.evil.example",
      "https://aicharts-git-main.vercel.app", "http://localhost:3000",
    ]) {
      expect(createSuiteAccountsClientConfiguration({ ...binding, origin }))
        .toEqual({ ok: false, error: "invalid-origin" });
    }
    for (const callbackUrl of [
      "https://aicharts.io/api/auth/callback",
      "https://aicharts.io/api/suite-auth/callback/",
      `${binding.callbackUrl}?next=/`, `${binding.callbackUrl}#fragment`,
      "https://foreign.example/api/suite-auth/callback",
    ]) {
      expect(createSuiteAccountsClientConfiguration({ ...binding, callbackUrl }))
        .toEqual({ ok: false, error: "invalid-callback-url" });
    }
    for (const clientId of [
      "hraness:aicharts:preview:v1", "hraness:aicharts:production:v2",
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
      { linkedProduct: "aicharts" },
    ]) {
      expect(createSuiteAccountsClientConfiguration({ ...binding, ...extra }))
        .toEqual({ ok: false, error: "invalid-binding" });
    }
  });
});
