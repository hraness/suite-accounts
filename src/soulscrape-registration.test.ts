import { describe, expect, expectTypeOf, test } from "bun:test";

import { createSuiteBearerVerifier } from "./bearer-verifier";
import { createSuiteAccountsClientConfiguration } from "./client-configuration";
import { parseSuiteConsumerId } from "./identity/consumers";
import { SUITE_MEMBERSHIP_PRODUCTS } from "./identity/membership";
import { parseSuiteProduct, SUITE_PRODUCTS } from "./identity/principals";
import {
  SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS,
  SUITE_ACCOUNTS_CONSUMERS,
  SUITE_ACCOUNTS_CURRENT_BROWSER_DEVICE_CODE_CONSUMER_IDS,
  SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS,
  SUITE_ACCOUNTS_CURRENT_CONSUMERS,
  SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS,
  SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS,
  SUITE_ACCOUNTS_REGISTERED_CONSUMER_IDS,
  SUITE_CONSUMER_IDS,
  SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS,
  getSuiteAccountsConsumerEnvironment,
  getSuiteAccountsCurrentConsumerEnvironment,
  isSuiteAccountsCurrentBrowserDeviceCodeConsumerId,
  isSuiteAccountsCurrentConsumerId,
  isSuiteAccountsRegisteredConsumerId,
  type SuiteAccountsCurrentOidcConsumerId,
  type SuiteAccountsRegisteredConsumerId,
} from "./registry";
import {
  suiteAccountsCurrentDeviceCodeClientAllowed,
  suiteAccountsCurrentOidcClientRegistration,
  suiteAccountsCurrentOidcClientRequiresEmailOtp,
  suiteAccountsOidcClientRegistration,
  suiteAccountsOidcClientRequiresEmailOtp,
} from "./urls";

const formerBinding = {
  authMode: "oidc-rp",
  callbackUrl: "https://soulscrape.com/api/suite-auth/callback",
  clientId: "hraness:soulscrape:production:v1",
  consumer: "soulscrape",
  environment: "production",
  origin: "https://soulscrape.com",
} as const;

describe("Soulscrape authentication retirement", () => {
  test("removes current browser, OTP, device and membership registration", () => {
    expect("soulscrape" in SUITE_ACCOUNTS_CURRENT_CONSUMERS).toBe(false);
    for (const predicate of [
      isSuiteAccountsCurrentConsumerId,
      isSuiteAccountsCurrentBrowserDeviceCodeConsumerId,
    ]) expect(predicate("soulscrape")).toBe(false);
    for (const ids of [
      SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS,
      SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS,
      SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS,
      SUITE_ACCOUNTS_CURRENT_BROWSER_DEVICE_CODE_CONSUMER_IDS,
    ]) expect(ids).not.toContain("soulscrape" as never);
    expect(SUITE_MEMBERSHIP_PRODUCTS.map(product => product.id))
      .not.toContain("soulscrape");
    expectTypeOf<Extract<SuiteAccountsCurrentOidcConsumerId, "soulscrape">>()
      .toEqualTypeOf<never>();
    expect(getSuiteAccountsCurrentConsumerEnvironment("soulscrape", "production"))
      .toBeNull();
    expect(suiteAccountsCurrentOidcClientRegistration("soulscrape", "production"))
      .toBeNull();
    expect(suiteAccountsCurrentOidcClientRequiresEmailOtp(formerBinding.clientId))
      .toBe(false);
    for (const clientId of [
      formerBinding.clientId, "hraness:soulscrape:preview:v1",
      "hraness:soulscrape:production:v2", "hraness:ensoul:production:v1",
    ]) expect(suiteAccountsCurrentDeviceCodeClientAllowed(clientId)).toBe(false);
  });

  test("rejects the former exact binding and former-name aliases", () => {
    expect(createSuiteAccountsClientConfiguration(formerBinding))
      .toEqual({ ok: false, error: "invalid-consumer" });
    for (const consumer of ["soulscrape", "ensoul", "soul-scrape"]) {
      expect(createSuiteAccountsClientConfiguration({ ...formerBinding, consumer }))
        .toEqual({ ok: false, error: "invalid-consumer" });
    }
    expect(() => createSuiteBearerVerifier({
      consumer: "soulscrape" as never,
      environment: "production",
      fetch: () => Promise.reject(new Error("Retired verifier must not fetch.")),
    })).toThrow();
  });

  test("preserves the existing historical identity and deprecated-trust boundary", () => {
    expect(parseSuiteConsumerId("soulscrape"))
      .toEqual({ ok: false, error: "invalid-consumer" });
    expect(parseSuiteProduct("soulscrape"))
      .toEqual({ ok: false, error: "invalid-product" });
    expect(SUITE_PRODUCTS).not.toContain("soulscrape");
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
    expect(suiteAccountsOidcClientRequiresEmailOtp(formerBinding.clientId)).toBe(false);
    expectTypeOf<Extract<SuiteAccountsRegisteredConsumerId, "soulscrape">>()
      .toEqualTypeOf<never>();
  });
});
