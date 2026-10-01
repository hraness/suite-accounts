import { expect, test } from "bun:test";
import { assertProperty, fc } from "./test-support";

import { createSuiteAccountsClientConfiguration } from "./client-configuration";
import {
  SUITE_ACCOUNTS_CONSUMERS,
  SUITE_ACCOUNTS_CURRENT_BROWSER_DEVICE_CODE_CONSUMER_IDS,
  SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS,
  suiteAccountsCurrentConsumerRequiresEmailOtp,
} from "./registry";

const binding = {
  authMode: "oidc-rp",
  callbackUrl: "https://textmock.com/api/suite-auth/callback",
  clientId: "hraness:textmock:production:v1",
  consumer: "textmock",
  environment: "production",
  origin: "https://textmock.com",
} as const;

test("Textmock has one exact production browser binding", () => {
  expect(createSuiteAccountsClientConfiguration(binding)).toMatchObject({
    ok: true,
    value: { binding },
  });
  for (const origin of [
    "http://textmock.com", "https://www.textmock.com", "https://textmock.com.evil.example",
    "https://textmock.vercel.app", "http://localhost:3000",
  ]) {
    expect(createSuiteAccountsClientConfiguration({ ...binding, origin })).toEqual({
      ok: false, error: "invalid-origin",
    });
  }
  expect(createSuiteAccountsClientConfiguration({
    ...binding, callbackUrl: "https://textmock.com/other-callback",
  })).toEqual({ ok: false, error: "invalid-callback-url" });
  expect(createSuiteAccountsClientConfiguration({
    ...binding, clientId: "hraness:textmock:preview:v1",
  })).toEqual({ ok: false, error: "invalid-client-id" });
});

test("Textmock gains no legacy, identity-link, or device-grant authority", () => {
  expect(suiteAccountsCurrentConsumerRequiresEmailOtp("textmock")).toBe(true);
  expect("textmock" in SUITE_ACCOUNTS_CONSUMERS).toBe(false);
  expect(SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS).not.toContain("textmock");
  expect(SUITE_ACCOUNTS_CURRENT_BROWSER_DEVICE_CODE_CONSUMER_IDS).not.toContain("textmock");
});

 test("Textmock rejects arbitrary changes to its binding coordinates", () => {
  assertProperty(fc.property(
    fc.constantFrom("authMode", "callbackUrl", "clientId", "environment", "origin"),
    fc.anything(),
    (key, value) => {
      expect(createSuiteAccountsClientConfiguration({ ...binding, [key]: value }).ok).toBe(value === binding[key]);
    },
  ));
});
