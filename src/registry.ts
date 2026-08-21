import {
  SUITE_CONSUMER_IDS,
  type SuiteConsumerId,
} from "./identity/consumers.js";
import { deepFreeze } from "./immutable.js";

export { SUITE_CONSUMER_IDS };
export type SuiteAccountsConsumerId = SuiteConsumerId;

export const SUITE_ACCOUNTS_REMOTE_ENVIRONMENTS = deepFreeze([
  "production",
] as const);

export type SuiteAccountsRemoteEnvironment =
  (typeof SUITE_ACCOUNTS_REMOTE_ENVIRONMENTS)[number];
export type SuiteAccountsEnvironment =
  | "local"
  | SuiteAccountsRemoteEnvironment;

export type SuiteAccountsCookieName =
  | "account_data"
  | "convex_jwt"
  | "dont_remember"
  | "session_data"
  | "session_token";

export type SuiteAccountsCookieCapabilities = Readonly<{
  chunked: readonly SuiteAccountsCookieName[];
  names: readonly SuiteAccountsCookieName[];
}>;

export type SuiteAccountsAuthConfiguration =
  | Readonly<{
      basePath: "/api/auth";
      cookies: SuiteAccountsCookieCapabilities;
      kind: "authority";
    }>
  | Readonly<{
      basePath: "/api/suite-auth";
      kind: "oidc-rp";
    }>
  | Readonly<{
      basePath: "/api/auth";
      cookies: SuiteAccountsCookieCapabilities;
      kind: "proxy";
    }>;

export type SuiteAccountsRemoteDeployment = Readonly<{
  accountsOrigin: string;
  convexSiteUrl: string;
  convexUrl: string;
}>;

export type SuiteAccountsConsumerEnvironment = Readonly<{
  billingReturn:
    | Readonly<{ kind: "supported"; path: `/${string}` }>
    | Readonly<{ kind: "unsupported" }>;
  siteUrl: string;
}>;

export type SuiteAccountsConsumerEnvironments = Readonly<{
  production: SuiteAccountsConsumerEnvironment;
}>;

export type SuiteAccountsConsumerRegistration = Readonly<{
  auth: SuiteAccountsAuthConfiguration;
  displayName: string;
  environments: SuiteAccountsConsumerEnvironments;
  id: SuiteAccountsConsumerId;
}>;

const accountsCookies = deepFreeze({
  chunked: ["account_data", "session_data"],
  names: [
    "account_data",
    "convex_jwt",
    "dont_remember",
    "session_data",
    "session_token",
  ],
} as const satisfies SuiteAccountsCookieCapabilities);

const consumerCookies = deepFreeze({
  chunked: ["session_data"],
  names: ["dont_remember", "session_data", "session_token"],
} as const satisfies SuiteAccountsCookieCapabilities);

/**
 * Frozen v1 deployment data for already-released clients.
 *
 * @deprecated New consumers must use `createSuiteAccountsClientConfiguration`
 * and must be registered by the Accounts authority before release.
 */
export const SUITE_ACCOUNTS_DEPLOYMENTS = deepFreeze({
  production: {
    accountsOrigin: "https://account.hraness.com",
    convexSiteUrl: "https://qualified-marmot-22.convex.site",
    convexUrl: "https://qualified-marmot-22.convex.cloud",
  },
} as const satisfies Readonly<
  Record<SuiteAccountsRemoteEnvironment, SuiteAccountsRemoteDeployment>
>);

function unsupported(siteUrl: string): SuiteAccountsConsumerEnvironment {
  return { billingReturn: { kind: "unsupported" }, siteUrl };
}

function oidcSite<const Consumer extends SuiteAccountsConsumerId>(
  id: Consumer,
  displayName: string,
  productionSiteUrl: string,
) {
  return {
    auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
    displayName,
    environments: {
      production: unsupported(productionSiteUrl),
    },
    id,
  } as const;
}

/**
 * Frozen v1 registrations retained for source and wire compatibility.
 *
 * @deprecated New consumers must use `createSuiteAccountsClientConfiguration`
 * and must not extend or copy this object.
 */
export const SUITE_ACCOUNTS_CONSUMERS = deepFreeze({
  accounts: {
    auth: {
      basePath: "/api/auth",
      cookies: accountsCookies,
      kind: "authority",
    },
    displayName: "Accounts",
    environments: {
      production: {
        billingReturn: { kind: "supported", path: "/account" },
        siteUrl: "https://account.hraness.com",
      },
    },
    id: "accounts",
  },
  act60: oidcSite(
    "act60",
    "ACT60",
    "https://act60.me",
  ),
  "elders": oidcSite(
    "elders",
    "Elders",
    "https://elders.hraness.com",
  ),
  soundfish: {
    auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
    displayName: "Soundfish",
    environments: {
      production: unsupported("https://sound.fish"),
    },
    id: "soundfish",
  },
  "oh-computer": oidcSite(
    "oh-computer",
    "Oh",
    "https://oh.computer",
  ),
  "draw-money": {
    auth: {
      basePath: "/api/auth",
      cookies: consumerCookies,
      kind: "proxy",
    },
    displayName: "Draw Money",
    environments: {
      production: unsupported("https://draw.money"),
    },
    id: "draw-money",
  },
  oprte: {
    auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
    displayName: "OPRTE",
    environments: {
      production: unsupported("https://oprte.com"),
    },
    id: "oprte",
  },
  sponge: oidcSite(
    "sponge",
    "Sponge",
    "https://spongesearch.com",
  ),
} as const satisfies Readonly<
  Record<SuiteAccountsConsumerId, SuiteAccountsConsumerRegistration>
>);

/**
 * Previously published production-origin overrides retained for source
 * compatibility. The current registry below incorporates these values rather
 * than mutating the released-v1 registrations.
 */
export const SUITE_ACCOUNTS_CURRENT_ORIGIN_OVERRIDES = deepFreeze({
  sponge: {
    production: unsupported("https://spongeresearch.com"),
  },
} as const satisfies Partial<Readonly<Record<
  SuiteAccountsConsumerId,
  SuiteAccountsConsumerEnvironments
>>>);

/** Consumers that may establish new production trust through current APIs. */
export const SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS = deepFreeze([
  "accounts",
  "act60",
  "elders",
  "soundfish",
  "oh-computer",
  "oprte",
  "hra",
  "sponge",
  "subcounter",
  "slackorgs",
] as const);

export type SuiteAccountsCurrentConsumerId =
  (typeof SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS)[number];

export type SuiteAccountsCurrentConsumerRegistration = Readonly<{
  auth: SuiteAccountsAuthConfiguration;
  displayName: string;
  environments: SuiteAccountsConsumerEnvironments;
  id: SuiteAccountsCurrentConsumerId;
}>;

function currentOidcSite<const Consumer extends SuiteAccountsCurrentConsumerId>(
  id: Consumer,
  displayName: string,
  productionSiteUrl: string,
) {
  return {
    auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
    displayName,
    environments: {
      production: unsupported(productionSiteUrl),
    },
    id,
  } as const;
}

/**
 * Current Accounts authority registrations.
 *
 * OPRTE remains present only for the bounded HRA cutover rollback window. HRA
 * is a separate current registration, while the frozen v1 registry above
 * remains unchanged for already-released clients.
 */
export const SUITE_ACCOUNTS_CURRENT_CONSUMERS = deepFreeze({
  accounts: SUITE_ACCOUNTS_CONSUMERS.accounts,
  act60: SUITE_ACCOUNTS_CONSUMERS.act60,
  elders: SUITE_ACCOUNTS_CONSUMERS.elders,
  soundfish: SUITE_ACCOUNTS_CONSUMERS.soundfish,
  "oh-computer": SUITE_ACCOUNTS_CONSUMERS["oh-computer"],
  oprte: SUITE_ACCOUNTS_CONSUMERS.oprte,
  hra: currentOidcSite("hra", "HRA", "https://hra.sh"),
  sponge: currentOidcSite(
    "sponge",
    "Sponge",
    SUITE_ACCOUNTS_CURRENT_ORIGIN_OVERRIDES.sponge.production.siteUrl,
  ),
  subcounter: currentOidcSite(
    "subcounter",
    "Subcounter",
    "https://subcounter.com",
  ),
  slackorgs: currentOidcSite(
    "slackorgs",
    "SlackOrgs",
    "https://slackorgs.com",
  ),
} as const satisfies Readonly<
  Record<
    SuiteAccountsCurrentConsumerId,
    SuiteAccountsCurrentConsumerRegistration
  >
>);

/**
 * Frozen v0.2 compatibility name for the consumers that were active before the
 * current registry became a distinct authority surface.
 *
 * @deprecated Use `SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS`.
 */
export const SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS = deepFreeze([
  "accounts",
  "act60",
  "elders",
  "soundfish",
  "oh-computer",
  "oprte",
  "sponge",
] as const satisfies readonly SuiteAccountsConsumerId[]);
export type SuiteAccountsActiveConsumerId =
  (typeof SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS)[number];

export type SuiteAccountsOidcConsumerId = {
  [Consumer in SuiteAccountsConsumerId]:
    (typeof SUITE_ACCOUNTS_CONSUMERS)[Consumer]["auth"]["kind"] extends "oidc-rp"
      ? Consumer
      : never;
}[SuiteAccountsConsumerId];

/** Every canonical browser OIDC product accepts only email-code sessions. */
export const SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS:
  readonly SuiteAccountsOidcConsumerId[] = deepFreeze(
    SUITE_CONSUMER_IDS.filter((consumer): consumer is SuiteAccountsOidcConsumerId =>
      SUITE_ACCOUNTS_CONSUMERS[consumer].auth.kind === "oidc-rp"
    ),
  );

export type SuiteEmailOtpRequiredOidcConsumerId = SuiteAccountsOidcConsumerId;

export function suiteAccountsConsumerRequiresEmailOtp(
  consumer: SuiteAccountsOidcConsumerId,
): consumer is SuiteEmailOtpRequiredOidcConsumerId {
  return (SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS as readonly string[])
    .includes(consumer);
}

/**
 * Product clients that can exchange signed product-link and entitlement
 * receipts. Editorial site clients authenticate the same suite account but do
 * not gain a product identity-link boundary.
 */
export const SUITE_ACCOUNTS_LINKED_OIDC_CONSUMER_IDS = deepFreeze([
  "soundfish",
  "oprte",
] as const satisfies readonly SuiteAccountsOidcConsumerId[]);

export type SuiteAccountsLinkedOidcConsumerId =
  (typeof SUITE_ACCOUNTS_LINKED_OIDC_CONSUMER_IDS)[number];

export type SuiteAccountsCurrentOidcConsumerId = {
  [Consumer in SuiteAccountsCurrentConsumerId]:
    (typeof SUITE_ACCOUNTS_CURRENT_CONSUMERS)[Consumer]["auth"]["kind"] extends
      "oidc-rp"
      ? Consumer
      : never;
}[SuiteAccountsCurrentConsumerId];

export type SuiteAccountsCurrentOAuthConsumerId =
  SuiteAccountsCurrentOidcConsumerId;

export const SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS:
  readonly SuiteAccountsCurrentOidcConsumerId[] = deepFreeze(
    SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS.filter(
      (consumer): consumer is SuiteAccountsCurrentOidcConsumerId =>
        SUITE_ACCOUNTS_CURRENT_CONSUMERS[consumer].auth.kind === "oidc-rp",
    ),
  );

export type SuiteAccountsCurrentEmailOtpRequiredOidcConsumerId =
  SuiteAccountsCurrentOidcConsumerId;

export const SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS = deepFreeze([
  "soundfish",
  "oprte",
  "hra",
] as const satisfies readonly SuiteAccountsCurrentOidcConsumerId[]);

export type SuiteAccountsCurrentLinkedOidcConsumerId =
  (typeof SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS)[number];

export type SuiteAccountsOAuthConsumerId = {
  [Consumer in SuiteAccountsConsumerId]:
    (typeof SUITE_ACCOUNTS_CONSUMERS)[Consumer]["auth"]["kind"] extends
      "oidc-rp"
      ? Consumer
      : never;
}[SuiteAccountsConsumerId];

export type SuiteAccountsOidcClientId =
  `hraness:${SuiteAccountsOAuthConsumerId}:${SuiteAccountsRemoteEnvironment}:v1`;

export type SuiteAccountsOidcClientRegistration = Readonly<{
  callbackUrl: string;
  clientId: SuiteAccountsOidcClientId;
}>;

export type SuiteAccountsCurrentOidcClientId =
  `hraness:${SuiteAccountsCurrentOAuthConsumerId}:${SuiteAccountsRemoteEnvironment}:v1`;

export type SuiteAccountsCurrentOidcClientRegistration = Readonly<{
  callbackUrl: string;
  clientId: SuiteAccountsCurrentOidcClientId;
}>;

export function isSuiteAccountsConsumerId(
  value: unknown,
): value is SuiteAccountsConsumerId {
  return typeof value === "string"
    && (SUITE_CONSUMER_IDS as readonly string[]).includes(value);
}

export function isSuiteAccountsOidcConsumerId(
  value: SuiteAccountsConsumerId,
): value is SuiteAccountsOidcConsumerId {
  return getSuiteAccountsConsumer(value).auth.kind === "oidc-rp";
}

export function isSuiteAccountsLinkedOidcConsumerId(
  value: SuiteAccountsOidcConsumerId,
): value is SuiteAccountsLinkedOidcConsumerId {
  return (
    SUITE_ACCOUNTS_LINKED_OIDC_CONSUMER_IDS as readonly string[]
  ).includes(value);
}

export function isSuiteAccountsOAuthConsumerId(
  value: SuiteAccountsConsumerId,
): value is SuiteAccountsOAuthConsumerId {
  return getSuiteAccountsConsumer(value).auth.kind === "oidc-rp";
}

export function isSuiteAccountsCurrentConsumerId(
  value: unknown,
): value is SuiteAccountsCurrentConsumerId {
  return typeof value === "string"
    && (SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS as readonly string[])
      .includes(value);
}

export function isSuiteAccountsCurrentOidcConsumerId(
  value: SuiteAccountsCurrentConsumerId,
): value is SuiteAccountsCurrentOidcConsumerId {
  return getSuiteAccountsCurrentConsumer(value).auth.kind === "oidc-rp";
}

export function isSuiteAccountsCurrentLinkedOidcConsumerId(
  value: SuiteAccountsCurrentOidcConsumerId,
): value is SuiteAccountsCurrentLinkedOidcConsumerId {
  return (
    SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS as readonly string[]
  ).includes(value);
}

export function isSuiteAccountsCurrentOAuthConsumerId(
  value: SuiteAccountsCurrentConsumerId,
): value is SuiteAccountsCurrentOAuthConsumerId {
  return getSuiteAccountsCurrentConsumer(value).auth.kind === "oidc-rp";
}

export function suiteAccountsCurrentConsumerRequiresEmailOtp(
  consumer: SuiteAccountsCurrentOidcConsumerId,
): consumer is SuiteAccountsCurrentEmailOtpRequiredOidcConsumerId {
  return (
    SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS as
      readonly string[]
  ).includes(consumer);
}

export function getSuiteAccountsConsumer<
  const Consumer extends SuiteAccountsConsumerId,
>(
  consumer: Consumer,
): (typeof SUITE_ACCOUNTS_CONSUMERS)[Consumer] {
  return SUITE_ACCOUNTS_CONSUMERS[consumer];
}

export function getSuiteAccountsConsumerEnvironment(
  consumer: SuiteAccountsConsumerId,
  environment: SuiteAccountsRemoteEnvironment,
): SuiteAccountsConsumerEnvironment | null {
  const registration: SuiteAccountsConsumerRegistration =
    getSuiteAccountsConsumer(consumer);
  return registration.environments[environment] ?? null;
}

export function getSuiteAccountsCurrentConsumer<
  const Consumer extends SuiteAccountsCurrentConsumerId,
>(
  consumer: Consumer,
): (typeof SUITE_ACCOUNTS_CURRENT_CONSUMERS)[Consumer] {
  return SUITE_ACCOUNTS_CURRENT_CONSUMERS[consumer];
}

export function getSuiteAccountsCurrentConsumerEnvironment(
  consumer: unknown,
  environment: SuiteAccountsRemoteEnvironment,
): SuiteAccountsConsumerEnvironment | null {
  if (!isSuiteAccountsCurrentConsumerId(consumer)) return null;
  return getSuiteAccountsCurrentConsumer(consumer).environments[environment]
    ?? null;
}

export function isSuiteAccountsActiveConsumerId(
  value: SuiteAccountsConsumerId,
): value is SuiteAccountsActiveConsumerId {
  return (SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS as readonly string[])
    .includes(value);
}

export function getSuiteAccountsDeployment(
  environment: SuiteAccountsRemoteEnvironment,
): SuiteAccountsRemoteDeployment {
  return SUITE_ACCOUNTS_DEPLOYMENTS[environment];
}
