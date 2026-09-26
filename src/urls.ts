import {
  getSuiteAccountsCurrentConsumerEnvironment,
  getSuiteAccountsConsumerEnvironment,
  getSuiteAccountsDeployment,
  isSuiteAccountsCurrentBrowserDeviceCodeConsumerId,
  isSuiteAccountsCurrentConsumerId,
  isSuiteAccountsCurrentDeviceClientId,
  isSuiteAccountsCurrentOAuthConsumerId,
  isSuiteAccountsConsumerId,
  isSuiteAccountsOAuthConsumerId,
  SUITE_ACCOUNTS_CURRENT_BROWSER_DEVICE_CODE_CONSUMER_IDS,
  SUITE_ACCOUNTS_CURRENT_DEVICE_CLIENT_IDS,
  SUITE_ACCOUNTS_CURRENT_DEVICE_CLIENTS,
  SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS,
  SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS,
  type SuiteAccountsConsumerId,
  type SuiteAccountsCurrentDeviceClient,
  type SuiteAccountsCurrentDeviceClientId,
  type SuiteAccountsCurrentOidcClientRegistration,
  type SuiteAccountsOidcClientRegistration,
  type SuiteAccountsRemoteEnvironment,
} from "./registry.js";
import { deepFreeze } from "./immutable.js";

export type SuiteAccountsCentralDestination = "account" | "home" | "login";
export const SUITE_ACCOUNTS_OAUTH_RESOURCE =
  "https://hraness.com/suite" as const;

export type SuiteAccountsOidcProviderConfiguration = Readonly<{
  authorizationEndpoint: string;
  deviceAuthorizationEndpoint: string;
  deviceTokenEndpoint: string;
  discoveryEndpoint: string;
  entitlementReceiptEndpoint: string;
  identityLinkReceiptEndpoint: string;
  issuer: string;
  jwksEndpoint: string;
  resource: typeof SUITE_ACCOUNTS_OAUTH_RESOURCE;
  revocationEndpoint: string;
  tokenEndpoint: string;
  userInfoAudience: string;
}>;

const CENTRAL_PATHS = deepFreeze({
  account: "/account",
  home: "/",
  login: "/login",
} as const satisfies Readonly<
  Record<SuiteAccountsCentralDestination, `/${string}`>
>);

export function suiteAccountsCentralUrl(
  environment: SuiteAccountsRemoteEnvironment,
  destination: SuiteAccountsCentralDestination,
): string {
  return new URL(
    CENTRAL_PATHS[destination],
    getSuiteAccountsDeployment(environment).accountsOrigin,
  ).href;
}

export function suiteAccountsBillingReturnUrl(
  consumer: SuiteAccountsConsumerId,
  environment: SuiteAccountsRemoteEnvironment,
): string | null {
  const consumerEnvironment = getSuiteAccountsConsumerEnvironment(
    consumer,
    environment,
  );
  if (consumerEnvironment === null) return null;
  return consumerEnvironment.billingReturn.kind === "supported"
    ? new URL(
        consumerEnvironment.billingReturn.path,
        consumerEnvironment.siteUrl,
      ).href
    : null;
}

export function suiteAccountsOidcClientRegistration(
  consumer: unknown,
  environment: SuiteAccountsRemoteEnvironment,
): SuiteAccountsOidcClientRegistration | null {
  if (
    !isSuiteAccountsConsumerId(consumer)
    || !isSuiteAccountsOAuthConsumerId(consumer)
  ) return null;
  const consumerEnvironment = getSuiteAccountsConsumerEnvironment(
    consumer, environment,
  );
  if (consumerEnvironment === null) return null;
  return deepFreeze({
    callbackUrl: new URL(
      "/api/suite-auth/callback",
      consumerEnvironment.siteUrl,
    ).href,
    clientId: `hraness:${consumer}:${environment}:v1`,
  });
}

/** Active registration, including reviewed origin migrations after v1. */
export function suiteAccountsCurrentOidcClientRegistration(
  consumer: unknown,
  environment: SuiteAccountsRemoteEnvironment,
): SuiteAccountsCurrentOidcClientRegistration | null {
  if (
    !isSuiteAccountsCurrentConsumerId(consumer)
    || !isSuiteAccountsCurrentOAuthConsumerId(consumer)
  ) return null;
  const consumerEnvironment = getSuiteAccountsCurrentConsumerEnvironment(
    consumer,
    environment,
  );
  if (consumerEnvironment === null) return null;
  return deepFreeze({
    callbackUrl: new URL(
      "/api/suite-auth/callback",
      consumerEnvironment.siteUrl,
    ).href,
    clientId: `hraness:${consumer}:${environment}:v1`,
  });
}

/** Match an exact registered browser client that accepts email-code sessions. */
export function suiteAccountsOidcClientRequiresEmailOtp(
  clientId: unknown,
): boolean {
  if (typeof clientId !== "string") return false;
  return SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS.some(consumer =>
    suiteAccountsOidcClientRegistration(consumer, "production")?.clientId
      === clientId
  );
}

/** Match an exact current browser client that accepts email-code sessions. */
export function suiteAccountsCurrentOidcClientRequiresEmailOtp(
  clientId: unknown,
): boolean {
  if (typeof clientId !== "string") return false;
  return SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS.some(
    consumer =>
      suiteAccountsCurrentOidcClientRegistration(
        consumer,
        "production",
      )?.clientId === clientId,
  );
}

/** RFC 8628 grant type; equal to `SUITE_OIDC_DEVICE_CODE_GRANT_TYPE`. */
const DEVICE_CODE_GRANT_TYPE =
  "urn:ietf:params:oauth:grant-type:device_code" as const;

export type SuiteAccountsCurrentDeviceClientRegistration = Readonly<{
  clientId:
    `hraness:${SuiteAccountsCurrentDeviceClientId}:${SuiteAccountsRemoteEnvironment}:v1`;
  consumer: SuiteAccountsCurrentDeviceClient["consumer"];
  grantTypes: readonly [typeof DEVICE_CODE_GRANT_TYPE];
  redirectUris: readonly [];
  scopes: readonly ["openid", "email", "profile"];
  tokenEndpointAuthMethod: "none";
}>;

/**
 * Registration for a dedicated public device-authorization client. It has no
 * redirect URI, no client secret, and exactly one grant.
 */
export function suiteAccountsCurrentDeviceClientRegistration(
  deviceClient: unknown,
  environment: SuiteAccountsRemoteEnvironment,
): SuiteAccountsCurrentDeviceClientRegistration | null {
  if (!isSuiteAccountsCurrentDeviceClientId(deviceClient)) return null;
  const registration: SuiteAccountsCurrentDeviceClient =
    SUITE_ACCOUNTS_CURRENT_DEVICE_CLIENTS[deviceClient];
  if (
    !registration.environments.includes(environment)
    || suiteAccountsCurrentOidcClientRegistration(
      registration.consumer,
      environment,
    ) === null
  ) {
    return null;
  }
  return deepFreeze({
    clientId: `hraness:${deviceClient}:${environment}:v1`,
    consumer: registration.consumer,
    grantTypes: [DEVICE_CODE_GRANT_TYPE],
    redirectUris: [],
    scopes: ["openid", "email", "profile"],
    tokenEndpointAuthMethod: "none",
  } as const);
}

/**
 * Match an exact client that may start the device-code grant: a dedicated
 * device client, or a browser client on the closed pre-v0.9.20 list. A
 * browser client whose product has a dedicated device client never matches.
 */
export function suiteAccountsCurrentDeviceCodeClientAllowed(
  clientId: unknown,
): boolean {
  if (typeof clientId !== "string") return false;
  return SUITE_ACCOUNTS_CURRENT_DEVICE_CLIENT_IDS.some(deviceClient =>
    suiteAccountsCurrentDeviceClientRegistration(deviceClient, "production")
      ?.clientId === clientId
  ) || SUITE_ACCOUNTS_CURRENT_BROWSER_DEVICE_CODE_CONSUMER_IDS.some(consumer =>
    isSuiteAccountsCurrentBrowserDeviceCodeConsumerId(consumer)
    && suiteAccountsCurrentOidcClientRegistration(consumer, "production")
      ?.clientId === clientId
  );
}

export function suiteAccountsOidcProviderConfiguration(
  environment: SuiteAccountsRemoteEnvironment,
): SuiteAccountsOidcProviderConfiguration {
  const issuer = getSuiteAccountsDeployment(environment).accountsOrigin;
  const authBase = new URL("/api/auth/", issuer);
  return deepFreeze({
    authorizationEndpoint: new URL("oauth2/authorize", authBase).href,
    deviceAuthorizationEndpoint:
      new URL("oauth2/device_authorization", authBase).href,
    deviceTokenEndpoint: new URL("oauth2/device/token", authBase).href,
    discoveryEndpoint:
      new URL("/.well-known/openid-configuration", issuer).href,
    entitlementReceiptEndpoint:
      new URL("/suite/entitlements/receipt", issuer).href,
    identityLinkReceiptEndpoint:
      new URL("/suite/identity-links/receipt", issuer).href,
    issuer,
    jwksEndpoint: new URL("jwks", authBase).href,
    resource: SUITE_ACCOUNTS_OAUTH_RESOURCE,
    revocationEndpoint: new URL("oauth2/revoke", authBase).href,
    tokenEndpoint: new URL("oauth2/token", authBase).href,
    userInfoAudience: new URL("oauth2/userinfo", authBase).href,
  });
}
