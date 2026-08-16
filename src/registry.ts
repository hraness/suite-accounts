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
  gnrte: {
    auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
    displayName: "GNRTE",
    environments: {
      production: unsupported("https://gnrte.com"),
    },
    id: "gnrte",
  },
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
  sup: {
    auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
    displayName: "Sup",
    environments: {
      production: unsupported("https://sup.fan"),
    },
    id: "sup",
  },
} as const satisfies Readonly<
  Record<SuiteAccountsConsumerId, SuiteAccountsConsumerRegistration>
>);

/**
 * Current production-origin changes layered over the immutable released-v1
 * registry. Compatibility readers can keep using `SUITE_ACCOUNTS_CONSUMERS`;
 * active browser and authority boundaries resolve through this map.
 */
export const SUITE_ACCOUNTS_CURRENT_ORIGIN_OVERRIDES = deepFreeze({
  sponge: {
    production: unsupported("https://sponge.computer"),
  },
} as const satisfies Partial<Readonly<Record<
  SuiteAccountsConsumerId,
  SuiteAccountsConsumerEnvironments
>>>);

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
  "gnrte",
  "soundfish",
  "oprte",
  "sup",
] as const satisfies readonly SuiteAccountsOidcConsumerId[]);

export type SuiteAccountsLinkedOidcConsumerId =
  (typeof SUITE_ACCOUNTS_LINKED_OIDC_CONSUMER_IDS)[number];

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

export function getSuiteAccountsCurrentConsumerEnvironment(
  consumer: SuiteAccountsConsumerId,
  environment: SuiteAccountsRemoteEnvironment,
): SuiteAccountsConsumerEnvironment | null {
  const override = SUITE_ACCOUNTS_CURRENT_ORIGIN_OVERRIDES[consumer as
    keyof typeof SUITE_ACCOUNTS_CURRENT_ORIGIN_OVERRIDES];
  return override?.[environment]
    ?? getSuiteAccountsConsumerEnvironment(consumer, environment);
}

export function getSuiteAccountsDeployment(
  environment: SuiteAccountsRemoteEnvironment,
): SuiteAccountsRemoteDeployment {
  return SUITE_ACCOUNTS_DEPLOYMENTS[environment];
}
