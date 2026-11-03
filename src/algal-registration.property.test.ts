import { expect, test } from "bun:test";

import { createSuiteAccountsClientConfiguration } from "./client-configuration";
import {
  SUITE_ACCOUNTS_CURRENT_BROWSER_DEVICE_CODE_CONSUMER_IDS,
} from "./registry";
import { assertProperty, fc } from "./test-support";
import {
  suiteAccountsCurrentDeviceClientRegistration,
  suiteAccountsCurrentDeviceCodeClientAllowed,
  suiteAccountsCurrentOidcClientRegistration,
} from "./urls";

const binding = {
  authMode: "oidc-rp",
  callbackUrl: "https://algal.cloud/api/suite-auth/callback",
  clientId: "hraness:algal:production:v1",
  consumer: "algal",
  environment: "production",
  origin: "https://algal.cloud",
} as const;

const deviceCodeClientIds = new Set<string>([
  ...SUITE_ACCOUNTS_CURRENT_BROWSER_DEVICE_CODE_CONSUMER_IDS.map(consumer => {
    const client = suiteAccountsCurrentOidcClientRegistration(consumer, "production");
    if (client === null) throw new Error(`Missing ${consumer} client.`);
    return client.clientId;
  }),
]);

test("no mutation of the former Algal binding restores retired trust", () => {
  assertProperty(fc.property(
    fc.constantFrom(
      "authMode", "callbackUrl", "clientId", "environment", "origin",
    ),
    fc.anything(),
    (key, value) => {
      const result = createSuiteAccountsClientConfiguration({ ...binding, [key]: value });
      expect(result).toEqual({ ok: false, error: "invalid-consumer" });
    },
  ));
});

test("the device-code grant matches only exact registered client IDs", () => {
  assertProperty(fc.property(
    fc.oneof(
      fc.anything(),
      fc.string(),
      fc.constantFrom(...deviceCodeClientIds).chain(clientId =>
        fc.tuple(fc.string(), fc.string()).map(([prefix, suffix]) =>
          `${prefix}${clientId}${suffix}`
        )
      ),
    ),
    value => {
      expect(suiteAccountsCurrentDeviceCodeClientAllowed(value))
        .toBe(typeof value === "string" && deviceCodeClientIds.has(value));
      expect(suiteAccountsCurrentDeviceClientRegistration(value, "production"))
        .toBeNull();
    },
  ));
  expect(suiteAccountsCurrentDeviceCodeClientAllowed("hraness:algal:production:v1"))
    .toBe(false);
});
