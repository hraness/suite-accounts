import { describe, expect, expectTypeOf, test } from "bun:test";

import { createSuiteAccountsClientConfiguration } from "./client-configuration";
import { SUITE_MEMBERSHIP_PRODUCTS } from "./identity/membership";
import {
  SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS,
  SUITE_ACCOUNTS_CONSUMERS,
  SUITE_ACCOUNTS_CURRENT_BROWSER_DEVICE_CODE_CONSUMER_IDS,
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
  type SuiteAccountsCurrentOidcConsumerId,
} from "./registry";
import {
  suiteAccountsCurrentDeviceCodeClientAllowed,
  suiteAccountsCurrentOidcClientRegistration,
  suiteAccountsCurrentOidcClientRequiresEmailOtp,
  suiteAccountsOidcClientRegistration,
} from "./urls";

const formerBinding = {
  authMode: "oidc-rp",
  callbackUrl: "https://aicharts.io/api/suite-auth/callback",
  clientId: "hraness:aicharts:production:v1",
  consumer: "aicharts",
  environment: "production",
  origin: "https://aicharts.io",
} as const;

describe("aicharts authentication retirement", () => {
  test("removes its origin and client from every current and deprecated trust registry", () => {
    for (const ids of [
      SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS,
      SUITE_ACCOUNTS_CURRENT_BROWSER_DEVICE_CODE_CONSUMER_IDS,
      SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS,
      SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS,
      SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS,
      SUITE_ACCOUNTS_REGISTERED_CONSUMER_IDS,
      SUITE_CONSUMER_IDS,
      SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS,
    ]) expect(ids).not.toContain("aicharts");
    expect("aicharts" in SUITE_ACCOUNTS_CURRENT_CONSUMERS).toBe(false);
    expect("aicharts" in SUITE_ACCOUNTS_CONSUMERS).toBe(false);
    expect(isSuiteAccountsCurrentConsumerId("aicharts")).toBe(false);
    expect(() => { Reflect.apply(isSuiteAccountsCurrentOidcConsumerId, undefined, ["aicharts"]); })
      .toThrow();
    expect(() => { Reflect.apply(isSuiteAccountsCurrentOAuthConsumerId, undefined, ["aicharts"]); })
      .toThrow();
    expect(Reflect.apply(isSuiteAccountsCurrentLinkedOidcConsumerId, undefined, ["aicharts"]))
      .toBe(false);
    expect(isSuiteAccountsRegisteredConsumerId("aicharts")).toBe(false);
    expect(Reflect.apply(suiteAccountsCurrentConsumerRequiresEmailOtp, undefined, ["aicharts"]))
      .toBe(false);
    expectTypeOf<Extract<SuiteAccountsCurrentOidcConsumerId, "aicharts">>()
      .toEqualTypeOf<never>();
    for (const environment of ["production"] as const) {
      expect(getSuiteAccountsCurrentConsumerEnvironment("aicharts", environment))
        .toBeNull();
      expect(getSuiteAccountsConsumerEnvironment("aicharts", environment)).toBeNull();
      expect(suiteAccountsCurrentOidcClientRegistration("aicharts", environment))
        .toBeNull();
      expect(suiteAccountsOidcClientRegistration("aicharts", environment)).toBeNull();
    }
  });

  test("rejects the exact former binding and its browser device-code grant", () => {
    expect(createSuiteAccountsClientConfiguration(formerBinding))
      .toEqual({ ok: false, error: "invalid-consumer" });
    for (const clientId of [
      formerBinding.clientId,
      "hraness:aicharts:preview:v1",
      "hraness:aicharts:local:v1",
      "hraness:aicharts-cli:production:v1",
      "hraness:aicharts:production:v2",
    ]) {
      expect(suiteAccountsCurrentDeviceCodeClientAllowed(clientId)).toBe(false);
      expect(suiteAccountsCurrentOidcClientRequiresEmailOtp(clientId)).toBe(false);
    }
  });

  test("keeps existing products and the benchmark reference separate from sign-in trust", () => {
    const aicharts = SUITE_MEMBERSHIP_PRODUCTS.find(product => product.id === "aicharts");
    expect(aicharts?.href).toBe(formerBinding.origin);
    expect(aicharts?.description).toContain("benchmark");
    for (const consumer of ["hraness", "soundfish", "peopleblade"] as const) {
      expect(isSuiteAccountsCurrentOidcConsumerId(consumer)).toBe(true);
      expect(suiteAccountsCurrentOidcClientRegistration(consumer, "production"))
        .not.toBeNull();
    }
  });

  test("does not introduce an xcb registration during retirement", () => {
    expect(isSuiteAccountsCurrentConsumerId("xcb")).toBe(false);
    expect(suiteAccountsCurrentOidcClientRegistration("xcb", "production"))
      .toBeNull();
    expect(suiteAccountsCurrentDeviceCodeClientAllowed("hraness:xcb:production:v1"))
      .toBe(false);
  });
});
