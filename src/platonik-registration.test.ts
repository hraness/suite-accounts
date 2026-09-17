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
  callbackUrl: "https://platonik.space/api/suite-auth/callback",
  clientId: "hraness:platonik:production:v1",
  consumer: "platonik",
  environment: "production",
  origin: "https://platonik.space",
} as const;

describe("Platonik current registration", () => {
  test("has one exact production OIDC binding and no billing return", () => {
    expect(SUITE_ACCOUNTS_CURRENT_CONSUMERS.platonik).toEqual({
      auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
      displayName: "Platonik",
      environments: {
        production: {
          billingReturn: { kind: "unsupported" },
          siteUrl: "https://platonik.space",
        },
      },
      id: "platonik",
    });
    expect(Object.keys(SUITE_ACCOUNTS_CURRENT_CONSUMERS.platonik.environments))
      .toEqual(["production"]);
    expect(getSuiteAccountsCurrentConsumerEnvironment("platonik", "production"))
      .toEqual({ billingReturn: { kind: "unsupported" }, siteUrl: binding.origin });
    expect(isSuiteAccountsCurrentConsumerId("platonik")).toBe(true);
    expect(isSuiteAccountsCurrentOidcConsumerId("platonik")).toBe(true);
    expect(isSuiteAccountsCurrentOAuthConsumerId("platonik")).toBe(true);
    expect(suiteAccountsCurrentOidcClientRegistration("platonik", "production"))
      .toEqual({ callbackUrl: binding.callbackUrl, clientId: binding.clientId });
    expectTypeOf<Extract<SuiteAccountsCurrentOidcConsumerId, "platonik">>()
      .toEqualTypeOf<"platonik">();
  });

  test("requires email OTP without granting linked-product trust", () => {
    expect(suiteAccountsCurrentConsumerRequiresEmailOtp("platonik")).toBe(true);
    expect(suiteAccountsCurrentOidcClientRequiresEmailOtp(binding.clientId))
      .toBe(true);
    expect(SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS)
      .toContain("platonik");
    expect(isSuiteAccountsCurrentLinkedOidcConsumerId("platonik")).toBe(false);
    expect(SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS)
      .not.toContain("platonik");
    expect(SUITE_PRODUCTS).not.toContain("platonik");
    expect(parseSuiteProduct("platonik"))
      .toEqual({ ok: false, error: "invalid-product" });
    expectTypeOf<Extract<SuiteAccountsCurrentLinkedOidcConsumerId, "platonik">>()
      .toEqualTypeOf<never>();
    for (const client of [
      "hraness:platonik:preview:v1",
      "hraness:platonik:local:v1",
      "hraness:platonik:production:v2",
      "hraness:plato-nik:production:v1",
    ]) {
      expect(suiteAccountsCurrentOidcClientRequiresEmailOtp(client)).toBe(false);
    }
  });

  test("does not extend historical identities or deprecated trust", () => {
    expect(parseSuiteConsumerId("platonik"))
      .toEqual({ ok: false, error: "invalid-consumer" });
    for (const ids of [
      SUITE_CONSUMER_IDS,
      SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS,
      SUITE_ACCOUNTS_REGISTERED_CONSUMER_IDS,
      SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS,
    ]) expect(ids).not.toContain("platonik");
    expect("platonik" in SUITE_ACCOUNTS_CONSUMERS).toBe(false);
    expect(isSuiteAccountsRegisteredConsumerId("platonik")).toBe(false);
    expect(getSuiteAccountsConsumerEnvironment("platonik", "production"))
      .toBeNull();
    expect(suiteAccountsOidcClientRegistration("platonik", "production"))
      .toBeNull();
    expect(suiteAccountsOidcClientRequiresEmailOtp(binding.clientId)).toBe(false);
    expectTypeOf<Extract<SuiteAccountsRegisteredConsumerId, "platonik">>()
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
        deviceAuthorizationEndpoint:
          "https://account.hraness.com/api/auth/oauth2/device_authorization",
        issuer: "https://account.hraness.com",
        jwksEndpoint: "https://account.hraness.com/api/auth/jwks",
        resource: "https://hraness.com/suite",
        tokenEndpoint: "https://account.hraness.com/api/auth/oauth2/token",
      },
    });
    expect("grantTypes" in result.value).toBe(false);
    expect("deviceAuthorizationEndpoint" in result.value.provider).toBe(true);
    expect("deviceTokenEndpoint" in result.value.provider).toBe(true);
    for (const value of [
      result.value,
      result.value.binding,
      result.value.provider,
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.platonik,
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.platonik.auth,
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.platonik.environments,
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.platonik.environments.production,
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.platonik.environments.production.billingReturn,
    ]) expect(Object.isFrozen(value)).toBe(true);
    expect(Reflect.set(result.value.binding, "origin", "https://foreign.example"))
      .toBe(false);
    expect(Reflect.set(result.value.provider, "issuer", "https://foreign.example"))
      .toBe(false);
    expect(Reflect.set(
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.platonik.environments.production,
      "siteUrl",
      "https://foreign.example",
    )).toBe(false);
    const registration = suiteAccountsCurrentOidcClientRegistration("platonik", "production");
    expect(Object.isFrozen(registration)).toBe(true);
    if (registration === null) throw new Error("Missing Platonik registration.");
    expect(Reflect.set(registration, "clientId", "foreign")).toBe(false);
  });

  test("rejects altered origin, callback, client, auth mode and environment", () => {
    for (const origin of [
      "http://platonik.space", "https://www.platonik.space", "https://platonik.space/",
      "https://platonik.space:443", "https://platonik.space.evil.example",
      "https://platonik-git-main.vercel.app", "http://localhost:3000",
    ]) {
      expect(createSuiteAccountsClientConfiguration({ ...binding, origin }))
        .toEqual({ ok: false, error: "invalid-origin" });
    }
    for (const callbackUrl of [
      "https://platonik.space/api/auth/callback",
      "https://platonik.space/api/suite-auth/callback/",
      `${binding.callbackUrl}?next=/`, `${binding.callbackUrl}#fragment`,
      "https://foreign.example/api/suite-auth/callback",
    ]) {
      expect(createSuiteAccountsClientConfiguration({ ...binding, callbackUrl }))
        .toEqual({ ok: false, error: "invalid-callback-url" });
    }
    for (const clientId of [
      "hraness:platonik:preview:v1", "hraness:platonik:production:v2",
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
      { linkedProduct: "platonik" },
    ]) {
      expect(createSuiteAccountsClientConfiguration({ ...binding, ...extra }))
        .toEqual({ ok: false, error: "invalid-binding" });
    }
  });
});
