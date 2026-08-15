import {
  parseSuiteAccountId,
  type SuiteAccountId,
} from "./identity/identifiers.js";
import {
  parseSuiteUsername,
  type SuiteUsername,
} from "./identity/usernames.js";
import type { AuthConfig } from "convex/server";

import { deepFreeze } from "./immutable.js";
import {
  getSuiteAccountsConsumerEnvironment,
  type SuiteAccountsOidcConsumerId,
  type SuiteAccountsRemoteEnvironment,
} from "./registry.js";
import {
  suiteAccountsOidcClientRegistration,
  suiteAccountsOidcProviderConfiguration,
} from "./urls.js";
import { SUITE_OIDC_EARLY_REFRESH_WINDOW_MS } from "./oidc-session-policy.js";

export const SUITE_CONVEX_BROWSER_TOKEN_USE =
  "suite-convex-browser-v1" as const;
export const SUITE_CONVEX_BROWSER_TOKEN_TTL_MS = 5 * 60_000;
export const SUITE_CONVEX_BROWSER_PARENT_REFRESH_WINDOW_MS =
  SUITE_OIDC_EARLY_REFRESH_WINDOW_MS;
export const SUITE_CONVEX_BROWSER_TOKEN_PATH =
  "/api/convex-auth/token" as const;
export const SUITE_CONVEX_BROWSER_JWKS_PATH =
  "/api/convex-auth/jwks" as const;
export const SUITE_CONVEX_BROWSER_ISSUER_PATH =
  "/api/convex-auth" as const;
export const SUITE_CONVEX_BROWSER_AUDIENCE_PATH = "/convex" as const;

/**
 * Products admitted to the browser-to-Convex token exchange.
 *
 * Registration is deliberately separate from the broader OIDC consumer
 * union. Adding a suite RP must not silently let it mint a browser bearer.
 */
export const SUITE_CONVEX_BROWSER_CONSUMER_IDS = deepFreeze([
  "elders",
] as const satisfies readonly SuiteAccountsOidcConsumerId[]);

export type SuiteConvexBrowserConsumerId =
  (typeof SUITE_CONVEX_BROWSER_CONSUMER_IDS)[number];

export type SuiteConvexBrowserConfiguration = Readonly<{
  audience: string;
  clientId: string;
  consumer: SuiteConvexBrowserConsumerId;
  environment: SuiteAccountsRemoteEnvironment;
  issuer: string;
  jwksEndpoint: string;
  siteUrl: string;
  suiteIssuer: string;
  tokenEndpoint: string;
}>;

export type SuiteConvexBrowserIdentity = Readonly<{
  issuer: string;
  subject: SuiteAccountId;
  suiteAccountId: SuiteAccountId;
  username: SuiteUsername;
}>;

export type SuiteConvexBrowserIdentityResult =
  | Readonly<{ ok: true; value: SuiteConvexBrowserIdentity }>
  | Readonly<{
      error:
        | "invalid-client"
        | "invalid-identity"
        | "invalid-issuer"
        | "invalid-profile"
        | "invalid-subject"
        | "invalid-token-use";
      ok: false;
    }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function enabledConsumer(
  value: unknown,
): value is SuiteConvexBrowserConsumerId {
  return typeof value === "string"
    && (SUITE_CONVEX_BROWSER_CONSUMER_IDS as readonly string[]).includes(value);
}

/** Resolve every product-token trust value from the checked suite registry. */
export function suiteConvexBrowserConfiguration(
  consumer: SuiteConvexBrowserConsumerId,
  environment: SuiteAccountsRemoteEnvironment,
): SuiteConvexBrowserConfiguration {
  if (!enabledConsumer(consumer)) {
    throw new Error("The suite consumer has no Convex browser-token grant.");
  }
  const consumerEnvironment = getSuiteAccountsConsumerEnvironment(
    consumer,
    environment,
  );
  if (consumerEnvironment === null) {
    throw new Error("The suite consumer is unavailable in this environment.");
  }
  const siteUrl = consumerEnvironment.siteUrl;
  const registration = suiteAccountsOidcClientRegistration(
    consumer,
    environment,
  );
  if (registration === null) {
    throw new Error("The suite consumer has no OIDC client registration.");
  }
  const suiteProvider = suiteAccountsOidcProviderConfiguration(environment);
  return deepFreeze({
    audience: new URL(SUITE_CONVEX_BROWSER_AUDIENCE_PATH, siteUrl).href,
    clientId: registration.clientId,
    consumer,
    environment,
    issuer: new URL(SUITE_CONVEX_BROWSER_ISSUER_PATH, siteUrl).href,
    jwksEndpoint: new URL(SUITE_CONVEX_BROWSER_JWKS_PATH, siteUrl).href,
    siteUrl,
    suiteIssuer: suiteProvider.issuer,
    tokenEndpoint: new URL(SUITE_CONVEX_BROWSER_TOKEN_PATH, siteUrl).href,
  });
}

/** Match an environment only through the registered exact consumer origin. */
export function suiteConvexBrowserEnvironmentForOrigin(
  consumer: SuiteConvexBrowserConsumerId,
  value: unknown,
): SuiteAccountsRemoteEnvironment | null {
  if (typeof value !== "string" || !enabledConsumer(consumer)) return null;
  return getSuiteAccountsConsumerEnvironment(consumer, "production")?.siteUrl
      === value
    ? "production"
    : null;
}

/** Build the exact custom-JWT trust configuration for product Convex. */
export function suiteConvexBrowserAuthConfig(
  consumer: SuiteConvexBrowserConsumerId,
  environment: SuiteAccountsRemoteEnvironment,
): AuthConfig {
  const configuration = suiteConvexBrowserConfiguration(consumer, environment);
  return deepFreeze({
    providers: [
      {
        algorithm: "ES256",
        applicationID: configuration.audience,
        issuer: configuration.issuer,
        jwks: configuration.jwksEndpoint,
        type: "customJwt",
      },
    ],
  });
}

/**
 * Parse the identity Convex exposes after its custom-JWT verifier succeeds.
 *
 * Convex verifies ES256, issuer, audience, and JWKS before this parser runs.
 * The parser pins the remaining signed product, suite, token-use, account, and
 * public-username claims. Product code derives ownership only from this value.
 */
export function parseSuiteConvexBrowserIdentity(
  value: unknown,
  configuration: SuiteConvexBrowserConfiguration,
): SuiteConvexBrowserIdentityResult {
  if (!isRecord(value)) return { error: "invalid-identity", ok: false };
  if (value["issuer"] !== configuration.issuer) {
    return { error: "invalid-issuer", ok: false };
  }
  if (
    value["suite_client_id"] !== configuration.clientId
    || value["suite_issuer"] !== configuration.suiteIssuer
  ) {
    return { error: "invalid-client", ok: false };
  }
  if (value["token_use"] !== SUITE_CONVEX_BROWSER_TOKEN_USE) {
    return { error: "invalid-token-use", ok: false };
  }
  if (
    value["profile_complete"] !== true
    || value["profile_revision"] !== "username-v1"
  ) {
    return { error: "invalid-profile", ok: false };
  }
  const account = parseSuiteAccountId(value["suite_account_id"]);
  const subject = parseSuiteAccountId(value["subject"]);
  if (!account.ok || !subject.ok || account.value !== subject.value) {
    return { error: "invalid-subject", ok: false };
  }
  const username = parseSuiteUsername(value["username"]);
  if (!username.ok) return { error: "invalid-profile", ok: false };
  return deepFreeze({
    ok: true,
    value: {
      issuer: configuration.issuer,
      subject: subject.value,
      suiteAccountId: account.value,
      username: username.value,
    },
  });
}
