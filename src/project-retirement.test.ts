import { expect, test } from "bun:test";

import { createSuiteBearerVerifier } from "./bearer-verifier";
import { createSuiteAccountsClientConfiguration } from "./client-configuration";
import { parseSuiteConsumerId } from "./identity/consumers";
import { parseSuiteLinkProduct } from "./identity/links";
import { SUITE_MEMBERSHIP_PRODUCTS } from "./identity/membership";
import { parseSuiteProduct } from "./identity/principals";
import {
  getSuiteAccountsConsumerEnvironment,
  getSuiteAccountsCurrentConsumerEnvironment,
  isSuiteAccountsCurrentBrowserDeviceCodeConsumerId,
  isSuiteAccountsCurrentConsumerId,
  isSuiteAccountsRegisteredConsumerId,
  SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS,
} from "./registry";
import {
  suiteAccountsCurrentDeviceCodeClientAllowed,
  suiteAccountsCurrentOidcClientRegistration,
  suiteAccountsCurrentOidcClientRequiresEmailOtp,
  suiteAccountsOidcClientRegistration,
} from "./urls";

const formerClients = [
  { consumer: "act60", origin: "https://act60.me" },
  { consumer: "oh-computer", origin: "https://oh.computer" },
  { consumer: "ghostget", origin: "https://ghostget.com" },
] as const;

for (const { consumer, origin } of formerClients) {
  test(`retired ${consumer} cannot recover trust through current or deprecated APIs`, () => {
  const clientId = `hraness:${consumer}:production:v1`;
  expect(isSuiteAccountsCurrentConsumerId(consumer)).toBe(false);
  expect(isSuiteAccountsRegisteredConsumerId(consumer)).toBe(false);
  expect(getSuiteAccountsCurrentConsumerEnvironment(consumer, "production")).toBeNull();
  expect(getSuiteAccountsConsumerEnvironment(consumer, "production")).toBeNull();
  expect(suiteAccountsCurrentOidcClientRegistration(consumer, "production")).toBeNull();
  expect(suiteAccountsOidcClientRegistration(consumer, "production")).toBeNull();
  expect(isSuiteAccountsCurrentBrowserDeviceCodeConsumerId(consumer)).toBe(false);
  expect(suiteAccountsCurrentDeviceCodeClientAllowed(clientId)).toBe(false);
  expect(suiteAccountsCurrentOidcClientRequiresEmailOtp(clientId)).toBe(false);
  expect(SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS as readonly string[]).not.toContain(consumer);
  expect(createSuiteAccountsClientConfiguration({
    authMode: "oidc-rp", callbackUrl: `${origin}/api/suite-auth/callback`,
    clientId, consumer, environment: "production", origin,
  })).toEqual({ ok: false, error: "invalid-consumer" });
  let requests = 0;
  expect(() => createSuiteBearerVerifier({
    consumer: consumer as never, environment: "production",
    fetch: () => { requests += 1; return Promise.resolve(Response.json({ keys: [] })); },
  })).toThrow();
  expect(requests).toBe(0);
  });
}

test("retired identity evidence remains readable without registration authority", () => {
  for (const consumer of ["act60", "oh-computer"] as const) {
    expect(parseSuiteConsumerId(consumer)).toEqual({ ok: true, value: consumer });
  }
  expect(parseSuiteProduct("ghostget")).toEqual({ ok: true, value: "ghostget" });
  expect(parseSuiteLinkProduct("ghostget")).toEqual({ ok: true, value: "ghostget" });
});

test("unlisting Sponge preserves its exact shared client while remaining products stay promoted", () => {
  expect(suiteAccountsCurrentOidcClientRegistration("sponge", "production")).toEqual({
    clientId: "hraness:sponge:production:v1",
    callbackUrl: "https://sponge.computer/api/suite-auth/callback",
  });
  expect(suiteAccountsOidcClientRegistration("sponge", "production")).toEqual({
    clientId: "hraness:sponge:production:v1",
    callbackUrl: "https://spongesearch.com/api/suite-auth/callback",
  });
  expect(isSuiteAccountsCurrentBrowserDeviceCodeConsumerId("sponge")).toBe(true);
  const ids = new Set<string>(SUITE_MEMBERSHIP_PRODUCTS.map(product => product.id));
  for (const retired of ["act60", "aicharts", "kb", "oh-computer", "ghostget", "eds-research", "direct", "lifedaysleft", "swft", "sponge"]) {
    expect(ids.has(retired)).toBe(false);
  }
  for (const active of ["peopleblade", "slopcamera", "sloptrade", "hraness", "sleepyland", "stripe-history", "platonik", "clankdar"]) {
    expect(ids.has(active)).toBe(true);
  }
});
