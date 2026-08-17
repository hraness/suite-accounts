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

test("the complete frozen v1 protocol registry remains byte-stable", () => {
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
    "e06596700ffd39a76ae171586536d26f2451e7fab6e6045cea32a98480d650a6",
  );
});
