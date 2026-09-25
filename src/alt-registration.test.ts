import { describe, expect, expectTypeOf, test } from "bun:test";

import { createSuiteAccountsClientConfiguration } from "./client-configuration";
import {
  SUITE_CONVEX_BROWSER_CONSUMER_IDS,
  suiteConvexBrowserAuthConfig,
  suiteConvexBrowserConfiguration,
  suiteConvexBrowserEnvironmentForOrigin,
  type SuiteConvexBrowserConsumerId,
} from "./convex-browser-auth";
import { parseSuiteConsumerId } from "./identity/consumers";
import { parseSuiteProduct, SUITE_PRODUCTS } from "./identity/principals";
import {
  SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS,
  SUITE_ACCOUNTS_CONSUMERS,
  SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS,
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
  callbackUrl: "https://alt.cool/api/suite-auth/callback",
  clientId: "hraness:alt:production:v1",
  consumer: "alt",
  environment: "production",
  origin: "https://alt.cool",
} as const;

describe("Alt current registration", () => {
  test("has one exact production OIDC binding and no billing return", () => {
    expect(SUITE_ACCOUNTS_CURRENT_CONSUMERS.alt).toEqual({
      auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
      displayName: "Alt",
      environments: {
        production: {
          billingReturn: { kind: "unsupported" },
          siteUrl: "https://alt.cool",
        },
      },
      id: "alt",
    });
    expect(Object.keys(SUITE_ACCOUNTS_CURRENT_CONSUMERS.alt.environments))
      .toEqual(["production"]);
    expect(getSuiteAccountsCurrentConsumerEnvironment("alt", "production"))
      .toEqual({ billingReturn: { kind: "unsupported" }, siteUrl: binding.origin });
    expect(isSuiteAccountsCurrentConsumerId("alt")).toBe(true);
    expect(isSuiteAccountsCurrentOidcConsumerId("alt")).toBe(true);
    expect(isSuiteAccountsCurrentOAuthConsumerId("alt")).toBe(true);
    expect(suiteAccountsCurrentOidcClientRegistration("alt", "production"))
      .toEqual({ callbackUrl: binding.callbackUrl, clientId: binding.clientId });
    expectTypeOf<Extract<SuiteAccountsCurrentOidcConsumerId, "alt">>()
      .toEqualTypeOf<"alt">();
  });

  test("requires email OTP without granting linked-product trust", () => {
    expect(suiteAccountsCurrentConsumerRequiresEmailOtp("alt")).toBe(true);
    expect(suiteAccountsCurrentOidcClientRequiresEmailOtp(binding.clientId))
      .toBe(true);
    expect(SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS)
      .toContain("alt");
    expect(isSuiteAccountsCurrentLinkedOidcConsumerId("alt")).toBe(false);
    expect(SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS)
      .not.toContain("alt");
    expect(SUITE_PRODUCTS).not.toContain("alt");
    expect(parseSuiteProduct("alt"))
      .toEqual({ ok: false, error: "invalid-product" });
    expectTypeOf<Extract<SuiteAccountsCurrentLinkedOidcConsumerId, "alt">>()
      .toEqualTypeOf<never>();
    for (const client of [
      "hraness:alt:preview:v1",
      "hraness:alt:local:v1",
      "hraness:alt:production:v2",
      "hraness:alt-cool:production:v1",
      "hraness:Alt:production:v1",
    ]) {
      expect(suiteAccountsCurrentOidcClientRequiresEmailOtp(client)).toBe(false);
    }
  });

  test("does not extend historical identities or deprecated trust", () => {
    expect(parseSuiteConsumerId("alt"))
      .toEqual({ ok: false, error: "invalid-consumer" });
    for (const ids of [
      SUITE_CONSUMER_IDS,
      SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS,
      SUITE_ACCOUNTS_REGISTERED_CONSUMER_IDS,
      SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS,
    ]) expect(ids).not.toContain("alt");
    expect("alt" in SUITE_ACCOUNTS_CONSUMERS).toBe(false);
    expect(isSuiteAccountsRegisteredConsumerId("alt")).toBe(false);
    expect(getSuiteAccountsConsumerEnvironment("alt", "production"))
      .toBeNull();
    expect(suiteAccountsOidcClientRegistration("alt", "production"))
      .toBeNull();
    expect(suiteAccountsOidcClientRequiresEmailOtp(binding.clientId)).toBe(false);
    expectTypeOf<Extract<SuiteAccountsRegisteredConsumerId, "alt">>()
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
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.alt,
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.alt.auth,
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.alt.environments,
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.alt.environments.production,
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.alt.environments.production.billingReturn,
    ]) expect(Object.isFrozen(value)).toBe(true);
    expect(Reflect.set(result.value.binding, "origin", "https://foreign.example"))
      .toBe(false);
    expect(Reflect.set(result.value.provider, "issuer", "https://foreign.example"))
      .toBe(false);
    expect(Reflect.set(
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.alt.environments.production,
      "siteUrl",
      "https://foreign.example",
    )).toBe(false);
    const registration = suiteAccountsCurrentOidcClientRegistration("alt", "production");
    expect(Object.isFrozen(registration)).toBe(true);
    if (registration === null) throw new Error("Missing Alt registration.");
    expect(Reflect.set(registration, "clientId", "foreign")).toBe(false);
  });

  test("rejects altered origin, callback, client, auth mode and environment", () => {
    for (const origin of [
      "http://alt.cool", "https://www.alt.cool", "https://alt.cool/",
      "https://alt.cool:443", "https://alt.cool.evil.example",
      "https://alt-git-main-hraness.vercel.app", "http://localhost:3000",
    ]) {
      expect(createSuiteAccountsClientConfiguration({ ...binding, origin }))
        .toEqual({ ok: false, error: "invalid-origin" });
    }
    for (const callbackUrl of [
      "https://alt.cool/api/auth/callback",
      "https://alt.cool/api/suite-auth/callback/",
      `${binding.callbackUrl}?next=/`, `${binding.callbackUrl}#fragment`,
      "https://foreign.example/api/suite-auth/callback",
    ]) {
      expect(createSuiteAccountsClientConfiguration({ ...binding, callbackUrl }))
        .toEqual({ ok: false, error: "invalid-callback-url" });
    }
    for (const clientId of [
      "hraness:alt:preview:v1", "hraness:alt:production:v2",
      "hraness:platonik:production:v1", null,
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
      { linkedProduct: "alt" },
    ]) {
      expect(createSuiteAccountsClientConfiguration({ ...binding, ...extra }))
        .toEqual({ ok: false, error: "invalid-binding" });
    }
  });

  test("is the only consumer admitted to the Convex browser-token exchange", () => {
    expect(SUITE_CONVEX_BROWSER_CONSUMER_IDS).toEqual(["alt"]);
    const configuration = suiteConvexBrowserConfiguration("alt", "production");
    expect(configuration).toEqual({
      audience: "https://alt.cool/convex",
      clientId: binding.clientId,
      consumer: "alt",
      environment: "production",
      issuer: "https://alt.cool/api/convex-auth",
      jwksEndpoint: "https://alt.cool/api/convex-auth/jwks",
      siteUrl: binding.origin,
      suiteIssuer: "https://account.hraness.com",
      tokenEndpoint: "https://alt.cool/api/convex-auth/token",
    });
    expect(suiteConvexBrowserEnvironmentForOrigin("alt", binding.origin))
      .toBe("production");
    for (const consumer of SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS) {
      if (consumer === "alt") continue;
      const denied = consumer as SuiteConvexBrowserConsumerId;
      expect(() => suiteConvexBrowserConfiguration(denied, "production"))
        .toThrow("no Convex browser-token grant");
      expect(() => suiteConvexBrowserAuthConfig(denied, "production"))
        .toThrow("no Convex browser-token grant");
      expect(suiteConvexBrowserEnvironmentForOrigin(
        denied,
        getSuiteAccountsCurrentConsumerEnvironment(consumer, "production")?.siteUrl,
      )).toBeNull();
    }
  });
});
