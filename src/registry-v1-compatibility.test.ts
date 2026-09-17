import { createHash } from "node:crypto";

import { expect, test } from "bun:test";

import {
  SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS,
  SUITE_ACCOUNTS_CONSUMERS,
  SUITE_ACCOUNTS_DEPLOYMENTS,
  SUITE_ACCOUNTS_LINKED_OIDC_CONSUMER_IDS,
  SUITE_CONSUMER_IDS,
  SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS,
} from "./registry";
import {
  suiteAccountsBillingReturnUrl,
  suiteAccountsCentralUrl,
  suiteAccountsOidcClientRegistration,
  suiteAccountsOidcProviderConfiguration,
} from "./urls";

test("the remaining deprecated registry remains byte-stable", () => {
  const snapshot = JSON.stringify({
    active: SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS,
    central: (["account", "home", "login"] as const).map(destination =>
      suiteAccountsCentralUrl("production", destination)
    ),
    consumers: SUITE_ACCOUNTS_CONSUMERS,
    deployments: SUITE_ACCOUNTS_DEPLOYMENTS,
    emailOtpRequired: SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS,
    linked: SUITE_ACCOUNTS_LINKED_OIDC_CONSUMER_IDS,
    oauth: SUITE_CONSUMER_IDS.map(consumer => [
      consumer,
      suiteAccountsOidcClientRegistration(consumer, "production"),
    ]).filter(([, registration]) => registration !== null),
    provider: suiteAccountsOidcProviderConfiguration("production"),
    returns: SUITE_CONSUMER_IDS.map(consumer => [
      consumer,
      suiteAccountsBillingReturnUrl(consumer, "production"),
    ]),
  });
  expect(createHash("sha256").update(snapshot).digest("hex")).toBe(
    "1815d9067d277103747c66c6ed5b4d78a3a0e8444d2330a0ecef343325c47737",
  );
});
