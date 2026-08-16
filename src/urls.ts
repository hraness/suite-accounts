import {
  getSuiteAccountsCurrentConsumerEnvironment,
  getSuiteAccountsConsumerEnvironment,
  getSuiteAccountsDeployment,
  isSuiteAccountsConsumerId,
  isSuiteAccountsOAuthConsumerId,
  SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS,
  type SuiteAccountsConsumerId,
  type SuiteAccountsOidcClientRegistration,
  type SuiteAccountsRemoteEnvironment,
} from "./registry.js";
import { deepFreeze } from "./immutable.js";

export type SuiteAccountsCentralDestination = "account" | "home" | "login";
export const SUITE_ACCOUNTS_OAUTH_RESOURCE =
  "https://hraness.com/suite" as const;

export type SuiteAccountsOidcProviderConfiguration = Readonly<{
  authorizationEndpoint: string;
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
): SuiteAccountsOidcClientRegistration | null {
  if (
    !isSuiteAccountsConsumerId(consumer)
    || !isSuiteAccountsOAuthConsumerId(consumer)
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

export function suiteAccountsOidcProviderConfiguration(
  environment: SuiteAccountsRemoteEnvironment,
): SuiteAccountsOidcProviderConfiguration {
  const issuer = getSuiteAccountsDeployment(environment).accountsOrigin;
  const authBase = new URL("/api/auth/", issuer);
  return deepFreeze({
    authorizationEndpoint: new URL("oauth2/authorize", authBase).href,
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
