import { expect, test } from "bun:test";

import { createSuiteAccountsClientConfiguration } from "./client-configuration";
import { parseSuiteProduct } from "./identity/principals";
import {
  getSuiteAccountsCurrentConsumerEnvironment,
  getSuiteAccountsConsumerEnvironment,
  isSuiteAccountsCurrentConsumerId,
  SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS,
  SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS,
  isSuiteAccountsRegisteredConsumerId,
} from "./registry";
import {
  suiteAccountsCurrentOidcClientRegistration,
  suiteAccountsOidcClientRegistration,
} from "./urls";
import { assertProperty, fc } from "./test-support";

const retiredConsumers = ["hra", "oprte", "kitchen"] as const;

test("retired Oompa identities remain readable without browser authority", () => {
  for (const consumer of retiredConsumers) {
    expect(parseSuiteProduct(consumer)).toEqual({ ok: true, value: "hra" });
    expect(isSuiteAccountsCurrentConsumerId(consumer)).toBe(false);
    expect(SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS).not.toContain(consumer);
    expect(SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS).not.toContain(consumer);
    expect(isSuiteAccountsRegisteredConsumerId(consumer)).toBe(false);
    expect(getSuiteAccountsCurrentConsumerEnvironment(consumer, "production"))
      .toBeNull();
    expect(getSuiteAccountsConsumerEnvironment(consumer, "production"))
      .toBeNull();
    expect(suiteAccountsCurrentOidcClientRegistration(consumer, "production"))
      .toBeNull();
    expect(suiteAccountsOidcClientRegistration(consumer, "production"))
      .toBeNull();
  }
});

test("former production host bindings cannot reactivate Oompa", () => {
  for (const origin of ["https://oompa.app", "https://oompa.dev", "https://hra.sh"]) {
    expect(createSuiteAccountsClientConfiguration({
      authMode: "oidc-rp",
      callbackUrl: `${origin}/api/suite-auth/callback`,
      clientId: "hraness:hra:production:v1",
      consumer: "hra",
      environment: "production",
      origin,
    })).toEqual({ ok: false, error: "invalid-consumer" });
  }
});

test("no caller-selected binding fields restore a retired consumer", () => {
  assertProperty(fc.property(
    fc.constantFrom(...retiredConsumers),
    fc.string(), fc.string(), fc.string(),
    (consumer, origin, callbackUrl, clientId) => {
      expect(createSuiteAccountsClientConfiguration({
        authMode: "oidc-rp", callbackUrl, clientId, consumer,
        environment: "production", origin,
      })).toEqual({ ok: false, error: "invalid-consumer" });
    },
  ));
});
