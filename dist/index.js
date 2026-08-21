// src/identity/consumers.ts
import { err, ok } from "@hraness/result";

// src/immutable.ts
function deepFreeze(value) {
  const visited = new WeakSet;
  function freezeOwned(current) {
    if (current === null || typeof current !== "object")
      return;
    if (visited.has(current))
      return;
    visited.add(current);
    for (const key of Reflect.ownKeys(current)) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (descriptor !== undefined && "value" in descriptor) {
        freezeOwned(descriptor.value);
      }
    }
    Object.freeze(current);
  }
  freezeOwned(value);
  return value;
}

// src/identity/consumers.ts
var SUITE_CONSUMER_IDS = deepFreeze([
  "accounts",
  "act60",
  "elders",
  "soundfish",
  "oh-computer",
  "draw-money",
  "oprte",
  "sponge"
]);
var LEGACY_SUITE_CONSUMER_IDS = deepFreeze([
  "kitchen"
]);
function parseSuiteConsumerId(value) {
  switch (value) {
    case "accounts":
    case "act60":
    case "elders":
    case "soundfish":
    case "oh-computer":
    case "draw-money":
    case "oprte":
    case "sponge":
      return ok(value);
    case "kitchen":
      return ok("oprte");
    default:
      return err("invalid-consumer");
  }
}

// src/registry.ts
var SUITE_ACCOUNTS_REMOTE_ENVIRONMENTS = deepFreeze([
  "production"
]);
var accountsCookies = deepFreeze({
  chunked: ["account_data", "session_data"],
  names: [
    "account_data",
    "convex_jwt",
    "dont_remember",
    "session_data",
    "session_token"
  ]
});
var consumerCookies = deepFreeze({
  chunked: ["session_data"],
  names: ["dont_remember", "session_data", "session_token"]
});
var SUITE_ACCOUNTS_DEPLOYMENTS = deepFreeze({
  production: {
    accountsOrigin: "https://account.hraness.com",
    convexSiteUrl: "https://qualified-marmot-22.convex.site",
    convexUrl: "https://qualified-marmot-22.convex.cloud"
  }
});
function unsupported(siteUrl) {
  return { billingReturn: { kind: "unsupported" }, siteUrl };
}
function oidcSite(id, displayName, productionSiteUrl) {
  return {
    auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
    displayName,
    environments: {
      production: unsupported(productionSiteUrl)
    },
    id
  };
}
var SUITE_ACCOUNTS_CONSUMERS = deepFreeze({
  accounts: {
    auth: {
      basePath: "/api/auth",
      cookies: accountsCookies,
      kind: "authority"
    },
    displayName: "Accounts",
    environments: {
      production: {
        billingReturn: { kind: "supported", path: "/account" },
        siteUrl: "https://account.hraness.com"
      }
    },
    id: "accounts"
  },
  act60: oidcSite("act60", "ACT60", "https://act60.me"),
  elders: oidcSite("elders", "Elders", "https://elders.hraness.com"),
  soundfish: {
    auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
    displayName: "Soundfish",
    environments: {
      production: unsupported("https://sound.fish")
    },
    id: "soundfish"
  },
  "oh-computer": oidcSite("oh-computer", "Oh", "https://oh.computer"),
  "draw-money": {
    auth: {
      basePath: "/api/auth",
      cookies: consumerCookies,
      kind: "proxy"
    },
    displayName: "Draw Money",
    environments: {
      production: unsupported("https://draw.money")
    },
    id: "draw-money"
  },
  oprte: {
    auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
    displayName: "OPRTE",
    environments: {
      production: unsupported("https://oprte.com")
    },
    id: "oprte"
  },
  sponge: oidcSite("sponge", "Sponge", "https://spongesearch.com")
});
var SUITE_ACCOUNTS_CURRENT_ORIGIN_OVERRIDES = deepFreeze({
  sponge: {
    production: unsupported("https://spongeresearch.com")
  }
});
var SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS = deepFreeze([
  "accounts",
  "act60",
  "elders",
  "soundfish",
  "oh-computer",
  "oprte",
  "hra",
  "sponge",
  "subcounter",
  "slackorgs"
]);
function currentOidcSite(id, displayName, productionSiteUrl) {
  return {
    auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
    displayName,
    environments: {
      production: unsupported(productionSiteUrl)
    },
    id
  };
}
var SUITE_ACCOUNTS_CURRENT_CONSUMERS = deepFreeze({
  accounts: SUITE_ACCOUNTS_CONSUMERS.accounts,
  act60: SUITE_ACCOUNTS_CONSUMERS.act60,
  elders: SUITE_ACCOUNTS_CONSUMERS.elders,
  soundfish: SUITE_ACCOUNTS_CONSUMERS.soundfish,
  "oh-computer": SUITE_ACCOUNTS_CONSUMERS["oh-computer"],
  oprte: SUITE_ACCOUNTS_CONSUMERS.oprte,
  hra: currentOidcSite("hra", "HRA", "https://hra.sh"),
  sponge: currentOidcSite("sponge", "Sponge", SUITE_ACCOUNTS_CURRENT_ORIGIN_OVERRIDES.sponge.production.siteUrl),
  subcounter: currentOidcSite("subcounter", "Subcounter", "https://subcounter.com"),
  slackorgs: currentOidcSite("slackorgs", "SlackOrgs", "https://slackorgs.com")
});
var SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS = deepFreeze([
  "accounts",
  "act60",
  "elders",
  "soundfish",
  "oh-computer",
  "oprte",
  "sponge"
]);
var SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS = deepFreeze(SUITE_CONSUMER_IDS.filter((consumer) => SUITE_ACCOUNTS_CONSUMERS[consumer].auth.kind === "oidc-rp"));
function suiteAccountsConsumerRequiresEmailOtp(consumer) {
  return SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS.includes(consumer);
}
var SUITE_ACCOUNTS_LINKED_OIDC_CONSUMER_IDS = deepFreeze([
  "soundfish",
  "oprte"
]);
var SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS = deepFreeze(SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS.filter((consumer) => SUITE_ACCOUNTS_CURRENT_CONSUMERS[consumer].auth.kind === "oidc-rp"));
var SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS = deepFreeze([
  "soundfish",
  "oprte",
  "hra"
]);
function isSuiteAccountsConsumerId(value) {
  return typeof value === "string" && SUITE_CONSUMER_IDS.includes(value);
}
function isSuiteAccountsOidcConsumerId(value) {
  return getSuiteAccountsConsumer(value).auth.kind === "oidc-rp";
}
function isSuiteAccountsLinkedOidcConsumerId(value) {
  return SUITE_ACCOUNTS_LINKED_OIDC_CONSUMER_IDS.includes(value);
}
function isSuiteAccountsOAuthConsumerId(value) {
  return getSuiteAccountsConsumer(value).auth.kind === "oidc-rp";
}
function isSuiteAccountsCurrentConsumerId(value) {
  return typeof value === "string" && SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS.includes(value);
}
function isSuiteAccountsCurrentOidcConsumerId(value) {
  return getSuiteAccountsCurrentConsumer(value).auth.kind === "oidc-rp";
}
function isSuiteAccountsCurrentLinkedOidcConsumerId(value) {
  return SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS.includes(value);
}
function isSuiteAccountsCurrentOAuthConsumerId(value) {
  return getSuiteAccountsCurrentConsumer(value).auth.kind === "oidc-rp";
}
function suiteAccountsCurrentConsumerRequiresEmailOtp(consumer) {
  return SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS.includes(consumer);
}
function getSuiteAccountsConsumer(consumer) {
  return SUITE_ACCOUNTS_CONSUMERS[consumer];
}
function getSuiteAccountsConsumerEnvironment(consumer, environment) {
  const registration = getSuiteAccountsConsumer(consumer);
  return registration.environments[environment] ?? null;
}
function getSuiteAccountsCurrentConsumer(consumer) {
  return SUITE_ACCOUNTS_CURRENT_CONSUMERS[consumer];
}
function getSuiteAccountsCurrentConsumerEnvironment(consumer, environment) {
  if (!isSuiteAccountsCurrentConsumerId(consumer))
    return null;
  return getSuiteAccountsCurrentConsumer(consumer).environments[environment] ?? null;
}
function isSuiteAccountsActiveConsumerId(value) {
  return SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS.includes(value);
}
function getSuiteAccountsDeployment(environment) {
  return SUITE_ACCOUNTS_DEPLOYMENTS[environment];
}

// src/urls.ts
var SUITE_ACCOUNTS_OAUTH_RESOURCE = "https://hraness.com/suite";
var CENTRAL_PATHS = deepFreeze({
  account: "/account",
  home: "/",
  login: "/login"
});
function suiteAccountsCentralUrl(environment, destination) {
  return new URL(CENTRAL_PATHS[destination], getSuiteAccountsDeployment(environment).accountsOrigin).href;
}
function suiteAccountsBillingReturnUrl(consumer, environment) {
  const consumerEnvironment = getSuiteAccountsConsumerEnvironment(consumer, environment);
  if (consumerEnvironment === null)
    return null;
  return consumerEnvironment.billingReturn.kind === "supported" ? new URL(consumerEnvironment.billingReturn.path, consumerEnvironment.siteUrl).href : null;
}
function suiteAccountsOidcClientRegistration(consumer, environment) {
  if (!isSuiteAccountsConsumerId(consumer) || !isSuiteAccountsOAuthConsumerId(consumer))
    return null;
  const consumerEnvironment = getSuiteAccountsConsumerEnvironment(consumer, environment);
  if (consumerEnvironment === null)
    return null;
  return deepFreeze({
    callbackUrl: new URL("/api/suite-auth/callback", consumerEnvironment.siteUrl).href,
    clientId: `hraness:${consumer}:${environment}:v1`
  });
}
function suiteAccountsCurrentOidcClientRegistration(consumer, environment) {
  if (!isSuiteAccountsCurrentConsumerId(consumer) || !isSuiteAccountsCurrentOAuthConsumerId(consumer))
    return null;
  const consumerEnvironment = getSuiteAccountsCurrentConsumerEnvironment(consumer, environment);
  if (consumerEnvironment === null)
    return null;
  return deepFreeze({
    callbackUrl: new URL("/api/suite-auth/callback", consumerEnvironment.siteUrl).href,
    clientId: `hraness:${consumer}:${environment}:v1`
  });
}
function suiteAccountsOidcClientRequiresEmailOtp(clientId) {
  if (typeof clientId !== "string")
    return false;
  return SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS.some((consumer) => suiteAccountsOidcClientRegistration(consumer, "production")?.clientId === clientId);
}
function suiteAccountsCurrentOidcClientRequiresEmailOtp(clientId) {
  if (typeof clientId !== "string")
    return false;
  return SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS.some((consumer) => suiteAccountsCurrentOidcClientRegistration(consumer, "production")?.clientId === clientId);
}
function suiteAccountsOidcProviderConfiguration(environment) {
  const issuer = getSuiteAccountsDeployment(environment).accountsOrigin;
  const authBase = new URL("/api/auth/", issuer);
  return deepFreeze({
    authorizationEndpoint: new URL("oauth2/authorize", authBase).href,
    discoveryEndpoint: new URL("/.well-known/openid-configuration", issuer).href,
    entitlementReceiptEndpoint: new URL("/suite/entitlements/receipt", issuer).href,
    identityLinkReceiptEndpoint: new URL("/suite/identity-links/receipt", issuer).href,
    issuer,
    jwksEndpoint: new URL("jwks", authBase).href,
    resource: SUITE_ACCOUNTS_OAUTH_RESOURCE,
    revocationEndpoint: new URL("oauth2/revoke", authBase).href,
    tokenEndpoint: new URL("oauth2/token", authBase).href,
    userInfoAudience: new URL("oauth2/userinfo", authBase).href
  });
}

// src/client-configuration.ts
import { err as err2, isRecord, ok as ok2 } from "@hraness/result";
var SUITE_ACCOUNTS_CLIENT_CONFIGURATION_VERSION = "suite-accounts-client-configuration-v1";
var SUITE_ACCOUNTS_WIRE_VERSION = "v1";
var BINDING_KEYS = [
  "authMode",
  "callbackUrl",
  "clientId",
  "consumer",
  "environment",
  "origin"
];
function snapshotBinding(input) {
  if (!isRecord(input))
    return null;
  try {
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.length !== BINDING_KEYS.length || keys.some((key) => typeof key !== "string" || !BINDING_KEYS.includes(key))) {
      return null;
    }
    for (const key of BINDING_KEYS) {
      const descriptor = descriptors[key];
      if (descriptor === undefined || !("value" in descriptor))
        return null;
    }
    return {
      authMode: descriptors.authMode.value,
      callbackUrl: descriptors.callbackUrl.value,
      clientId: descriptors.clientId.value,
      consumer: descriptors.consumer.value,
      environment: descriptors.environment.value,
      origin: descriptors.origin.value
    };
  } catch {
    return null;
  }
}
function freezeConfiguration(binding, authBasePath, provider) {
  return deepFreeze({
    authBasePath,
    binding,
    configurationVersion: SUITE_ACCOUNTS_CLIENT_CONFIGURATION_VERSION,
    provider,
    wireVersion: SUITE_ACCOUNTS_WIRE_VERSION
  });
}
function createSuiteAccountsClientConfiguration(input) {
  const binding = snapshotBinding(input);
  if (binding === null)
    return err2("invalid-binding");
  if (!isSuiteAccountsCurrentConsumerId(binding.consumer)) {
    return err2("invalid-consumer");
  }
  if (binding.environment !== "production") {
    return err2("invalid-environment");
  }
  const consumer = binding.consumer;
  const environment = binding.environment;
  const registration = getSuiteAccountsCurrentConsumer(consumer);
  const deployed = getSuiteAccountsCurrentConsumerEnvironment(consumer, environment);
  if (deployed === null || binding.origin !== deployed.siteUrl) {
    return err2("invalid-origin");
  }
  if (binding.authMode !== registration.auth.kind) {
    return err2("invalid-auth-mode");
  }
  const oauth = suiteAccountsCurrentOidcClientRegistration(consumer, environment);
  const expectedClientId = oauth?.clientId ?? null;
  const expectedCallbackUrl = oauth?.callbackUrl ?? null;
  if (binding.clientId !== expectedClientId) {
    return err2("invalid-client-id");
  }
  if (binding.callbackUrl !== expectedCallbackUrl) {
    return err2("invalid-callback-url");
  }
  return ok2(freezeConfiguration({
    authMode: registration.auth.kind,
    callbackUrl: expectedCallbackUrl,
    clientId: expectedClientId,
    consumer,
    environment,
    origin: deployed.siteUrl
  }, registration.auth.basePath, suiteAccountsOidcProviderConfiguration(environment)));
}

// src/oidc-session-policy.ts
var SUITE_OIDC_EARLY_REFRESH_WINDOW_MS = 30000;

// src/identity/identifiers.ts
import { err as err3, ok as ok3 } from "@hraness/result";
var suiteAccountIdPattern = /^acct_[0-9a-f]{32}$/u;
var suiteInvoiceRefPattern = /^invref_[0-9a-f]{32}$/u;
var uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
function parseSuiteAccountId(value) {
  return typeof value === "string" && suiteAccountIdPattern.test(value) ? ok3(value) : err3("invalid-suite-account-id");
}
function parseSuiteInvoiceRef(value) {
  return typeof value === "string" && suiteInvoiceRefPattern.test(value) ? ok3(value) : err3("invalid-suite-invoice-ref");
}
function generateSuiteAccountId(randomUuid = () => crypto.randomUUID()) {
  const uuid = randomUuid();
  if (!uuidPattern.test(uuid)) {
    throw new TypeError("The suite account ID source did not return a UUID.");
  }
  const candidate = `acct_${uuid.replaceAll("-", "").toLowerCase()}`;
  const parsed = parseSuiteAccountId(candidate);
  if (!parsed.ok) {
    throw new TypeError("The suite account ID source produced an invalid value.");
  }
  return parsed.value;
}
function generateSuiteInvoiceRef(randomUuid = () => crypto.randomUUID()) {
  const uuid = randomUuid();
  if (!uuidPattern.test(uuid)) {
    throw new TypeError("The suite invoice reference source did not return a UUID.");
  }
  const candidate = `invref_${uuid.replaceAll("-", "").toLowerCase()}`;
  const parsed = parseSuiteInvoiceRef(candidate);
  if (!parsed.ok) {
    throw new TypeError("The suite invoice reference source produced an invalid value.");
  }
  return parsed.value;
}

// src/identity/usernames.ts
import { err as err4, ok as ok4 } from "@hraness/result";
var SUITE_USERNAME_MIN_LENGTH = 3;
var SUITE_USERNAME_MAX_LENGTH = 24;
var suiteUsernamePattern = /^[a-z0-9](?:[a-z0-9]|[-_](?=[a-z0-9]))*[a-z0-9]$/u;
var reservedSuiteUsernames = new Set([
  "account",
  "accounts",
  "admin",
  "api",
  "auth",
  "billing",
  "design",
  "docs",
  "help",
  "hraness",
  "login",
  "logout",
  "new",
  "newsletter",
  "party",
  "place",
  "preview",
  "pub",
  "root",
  "settings",
  "social-image",
  "source",
  "sources",
  "support",
  "system",
  "user",
  "users",
  "www"
]);
function validateCanonicalSuiteUsername(value) {
  if (value.length < SUITE_USERNAME_MIN_LENGTH) {
    return err4("suite-username-too-short");
  }
  if (value.length > SUITE_USERNAME_MAX_LENGTH) {
    return err4("suite-username-too-long");
  }
  if (!suiteUsernamePattern.test(value)) {
    return err4("invalid-suite-username");
  }
  return ok4(value);
}
function normalizeSuiteUsername(value) {
  if (typeof value !== "string")
    return err4("invalid-suite-username");
  for (let index = 0;index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code > 127 || code < 32 || code === 127) {
      return err4("invalid-suite-username");
    }
  }
  const trimmed = value.trim();
  const parsed = validateCanonicalSuiteUsername(trimmed.toLowerCase());
  if (!parsed.ok)
    return parsed;
  return reservedSuiteUsernames.has(parsed.value) ? err4("suite-username-reserved") : parsed;
}
function parseSuiteUsername(value) {
  if (typeof value !== "string")
    return err4("invalid-suite-username");
  const parsed = validateCanonicalSuiteUsername(value);
  return parsed.ok && parsed.value === value ? parsed : err4(parsed.ok ? "invalid-suite-username" : parsed.error);
}

// src/convex-browser-auth.ts
var SUITE_CONVEX_BROWSER_TOKEN_USE = "suite-convex-browser-v1";
var SUITE_CONVEX_BROWSER_TOKEN_TTL_MS = 5 * 60000;
var SUITE_CONVEX_BROWSER_PARENT_REFRESH_WINDOW_MS = SUITE_OIDC_EARLY_REFRESH_WINDOW_MS;
var SUITE_CONVEX_BROWSER_TOKEN_PATH = "/api/convex-auth/token";
var SUITE_CONVEX_BROWSER_JWKS_PATH = "/api/convex-auth/jwks";
var SUITE_CONVEX_BROWSER_ISSUER_PATH = "/api/convex-auth";
var SUITE_CONVEX_BROWSER_AUDIENCE_PATH = "/convex";
var SUITE_CONVEX_BROWSER_CONSUMER_IDS = deepFreeze([
  "elders"
]);
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function enabledConsumer(value) {
  return typeof value === "string" && SUITE_CONVEX_BROWSER_CONSUMER_IDS.includes(value);
}
function suiteConvexBrowserConfiguration(consumer, environment) {
  if (!enabledConsumer(consumer)) {
    throw new Error("The suite consumer has no Convex browser-token grant.");
  }
  const consumerEnvironment = getSuiteAccountsConsumerEnvironment(consumer, environment);
  if (consumerEnvironment === null) {
    throw new Error("The suite consumer is unavailable in this environment.");
  }
  const siteUrl = consumerEnvironment.siteUrl;
  const registration = suiteAccountsOidcClientRegistration(consumer, environment);
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
    tokenEndpoint: new URL(SUITE_CONVEX_BROWSER_TOKEN_PATH, siteUrl).href
  });
}
function suiteConvexBrowserEnvironmentForOrigin(consumer, value) {
  if (typeof value !== "string" || !enabledConsumer(consumer))
    return null;
  return getSuiteAccountsConsumerEnvironment(consumer, "production")?.siteUrl === value ? "production" : null;
}
function suiteConvexBrowserAuthConfig(consumer, environment) {
  const configuration = suiteConvexBrowserConfiguration(consumer, environment);
  return deepFreeze({
    providers: [
      {
        algorithm: "ES256",
        applicationID: configuration.audience,
        issuer: configuration.issuer,
        jwks: configuration.jwksEndpoint,
        type: "customJwt"
      }
    ]
  });
}
function parseSuiteConvexBrowserIdentity(value, configuration) {
  if (!isRecord2(value))
    return { error: "invalid-identity", ok: false };
  if (value["issuer"] !== configuration.issuer) {
    return { error: "invalid-issuer", ok: false };
  }
  if (value["suite_client_id"] !== configuration.clientId || value["suite_issuer"] !== configuration.suiteIssuer) {
    return { error: "invalid-client", ok: false };
  }
  if (value["token_use"] !== SUITE_CONVEX_BROWSER_TOKEN_USE) {
    return { error: "invalid-token-use", ok: false };
  }
  if (value["profile_complete"] !== true || value["profile_revision"] !== "username-v1") {
    return { error: "invalid-profile", ok: false };
  }
  const account = parseSuiteAccountId(value["suite_account_id"]);
  const subject = parseSuiteAccountId(value["subject"]);
  if (!account.ok || !subject.ok || account.value !== subject.value) {
    return { error: "invalid-subject", ok: false };
  }
  const username = parseSuiteUsername(value["username"]);
  if (!username.ok)
    return { error: "invalid-profile", ok: false };
  return deepFreeze({
    ok: true,
    value: {
      issuer: configuration.issuer,
      subject: subject.value,
      suiteAccountId: account.value,
      username: username.value
    }
  });
}

// src/convex-url.ts
var LOCAL_HOSTNAMES = new Set(["127.0.0.1", "[::1]", "localhost"]);
function invalid(input, reason, message) {
  return deepFreeze({ input, kind: "invalid", message, reason });
}
function parseConvexDeployment(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return deepFreeze({ kind: "missing" });
  }
  const input = value.trim();
  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    return invalid(input, "not-a-url", "Use a complete Convex deployment URL.");
  }
  if (parsed.username !== "" || parsed.password !== "") {
    return invalid(input, "credentials", "Deployment URLs cannot contain credentials.");
  }
  if (parsed.pathname !== "/" || parsed.search !== "" || parsed.hash !== "") {
    return invalid(input, "not-an-origin", "Use the deployment origin without a path or query.");
  }
  const local = LOCAL_HOSTNAMES.has(parsed.hostname);
  if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) {
    return invalid(input, "insecure-remote", "Remote Convex deployments must use HTTPS.");
  }
  return deepFreeze({
    kind: "ready",
    origin: parsed.origin,
    transport: local ? "local" : "cloud",
    url: parsed.origin
  });
}

// src/public-config.ts
var LOOPBACK_HOSTS = new Set(["127.0.0.1", "[::1]", "localhost"]);
var SUITE_ACCOUNTS_PUBLIC_ENVIRONMENT_KEYS = deepFreeze([
  "NEXT_PUBLIC_ACCOUNTS_CONVEX_URL",
  "NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL",
  "NEXT_PUBLIC_SITE_URL"
]);
function parseOrigin(value, field) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${field} must be an absolute URL.`);
  }
  const loopback = LOOPBACK_HOSTS.has(url.hostname);
  if (url.protocol !== "https:" && !(loopback && url.protocol === "http:")) {
    throw new Error(`${field} must use HTTPS (HTTP is allowed only on loopback).`);
  }
  if (url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "" || url.pathname !== "" && url.pathname !== "/") {
    throw new Error(`${field} must be a credential-free origin.`);
  }
  return new URL(url.origin);
}
function readyRemoteConfig(consumer, siteUrl, convexUrl, convexSiteUrl) {
  const registration = getPublicConsumer(consumer);
  const environment = "production";
  const consumerEnvironment = getSuiteAccountsCurrentConsumerEnvironment(consumer, environment);
  const deployment = getSuiteAccountsDeployment(environment);
  if (consumerEnvironment?.siteUrl === siteUrl && deployment.convexUrl === convexUrl && deployment.convexSiteUrl === convexSiteUrl) {
    return deepFreeze({
      ...publicAuthConfiguration(registration.auth),
      canonicalProductOrigin: siteUrl,
      consumer,
      convexSiteUrl,
      convexUrl,
      environment,
      kind: "ready",
      siteUrl,
      surfaceOrigin: siteUrl
    });
  }
  return null;
}
function publicAuthConfiguration(auth) {
  switch (auth.kind) {
    case "authority":
      return { authBasePath: auth.basePath, authMode: auth.kind };
    case "oidc-rp":
      return { authBasePath: auth.basePath, authMode: auth.kind };
    case "proxy":
      return { authBasePath: auth.basePath, authMode: auth.kind };
  }
}
function getPublicConsumer(consumer) {
  return isSuiteAccountsCurrentConsumerId(consumer) ? getSuiteAccountsCurrentConsumer(consumer) : getSuiteAccountsConsumer(consumer);
}
function parseSuiteAccountsPublicConfig(consumer, environment) {
  const missing = SUITE_ACCOUNTS_PUBLIC_ENVIRONMENT_KEYS.filter((name) => {
    const value = environment[name];
    return typeof value !== "string" || value.trim() === "";
  });
  if (missing.length > 0)
    return deepFreeze({ kind: "missing", missing });
  const site = parseOrigin(environment.NEXT_PUBLIC_SITE_URL, "NEXT_PUBLIC_SITE_URL");
  const convexSite = parseOrigin(environment.NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL, "NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL");
  const deployment = parseConvexDeployment(environment.NEXT_PUBLIC_ACCOUNTS_CONVEX_URL);
  if (deployment.kind !== "ready") {
    throw new Error(deployment.kind === "invalid" ? `NEXT_PUBLIC_ACCOUNTS_CONVEX_URL is invalid: ${deployment.message}` : "NEXT_PUBLIC_ACCOUNTS_CONVEX_URL is required.");
  }
  const convex = parseOrigin(deployment.url, "NEXT_PUBLIC_ACCOUNTS_CONVEX_URL");
  const loopback = [site, convex, convexSite].map((url) => LOOPBACK_HOSTS.has(url.hostname));
  if (loopback.every(Boolean)) {
    if (deployment.transport !== "local" || site.hostname !== convex.hostname || site.hostname !== convexSite.hostname) {
      throw new Error("Local consumer and Accounts endpoints must use the same loopback host.");
    }
    const registration = getPublicConsumer(consumer);
    return deepFreeze({
      ...publicAuthConfiguration(registration.auth),
      canonicalProductOrigin: site.origin,
      consumer,
      convexSiteUrl: convexSite.origin,
      convexUrl: convex.origin,
      environment: "local",
      kind: "ready",
      siteUrl: site.origin,
      surfaceOrigin: site.origin
    });
  }
  if (loopback.some(Boolean)) {
    throw new Error("Consumer and Accounts endpoints cannot mix local and remote environments.");
  }
  const previewSurfaceValue = environment.NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN;
  if (previewSurfaceValue !== undefined) {
    const previewSurface = parseOrigin(previewSurfaceValue, "NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN");
    if (!previewSurface.hostname.endsWith(".vercel.app")) {
      throw new Error("NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN must use a generated .vercel.app origin.");
    }
    const production = readyRemoteConfig(consumer, site.origin, convex.origin, convexSite.origin);
    if (production === null) {
      throw new Error(`${getPublicConsumer(consumer).displayName} and Accounts endpoints ` + "do not match the production deployment.");
    }
    return deepFreeze({
      canonicalProductOrigin: site.origin,
      environment: "production",
      kind: "unavailable",
      message: "Suite authentication is unavailable on generated Vercel Preview origins.",
      surfaceOrigin: previewSurface.origin
    });
  }
  const remote = readyRemoteConfig(consumer, site.origin, convex.origin, convexSite.origin);
  if (remote !== null)
    return remote;
  throw new Error(`${getPublicConsumer(consumer).displayName} and Accounts endpoints ` + "do not match an owned deployment environment.");
}
function suiteAccountsPublicConfigFromEnvironment(consumer, environment = {
  NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN: process.env.NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN,
  NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL: process.env.NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL,
  NEXT_PUBLIC_ACCOUNTS_CONVEX_URL: process.env.NEXT_PUBLIC_ACCOUNTS_CONVEX_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL
}) {
  try {
    return parseSuiteAccountsPublicConfig(consumer, environment);
  } catch (error) {
    return deepFreeze({
      kind: "invalid",
      message: error instanceof Error ? error.message : "Suite Accounts configuration is invalid."
    });
  }
}
export {
  suiteConvexBrowserEnvironmentForOrigin,
  suiteConvexBrowserConfiguration,
  suiteConvexBrowserAuthConfig,
  suiteAccountsPublicConfigFromEnvironment,
  suiteAccountsOidcProviderConfiguration,
  suiteAccountsOidcClientRequiresEmailOtp,
  suiteAccountsOidcClientRegistration,
  suiteAccountsCurrentOidcClientRequiresEmailOtp,
  suiteAccountsCurrentOidcClientRegistration,
  suiteAccountsCurrentConsumerRequiresEmailOtp,
  suiteAccountsConsumerRequiresEmailOtp,
  suiteAccountsCentralUrl,
  suiteAccountsBillingReturnUrl,
  parseSuiteConvexBrowserIdentity,
  parseSuiteAccountsPublicConfig,
  isSuiteAccountsOidcConsumerId,
  isSuiteAccountsOAuthConsumerId,
  isSuiteAccountsLinkedOidcConsumerId,
  isSuiteAccountsCurrentOidcConsumerId,
  isSuiteAccountsCurrentOAuthConsumerId,
  isSuiteAccountsCurrentLinkedOidcConsumerId,
  isSuiteAccountsCurrentConsumerId,
  isSuiteAccountsConsumerId,
  isSuiteAccountsActiveConsumerId,
  getSuiteAccountsDeployment,
  getSuiteAccountsCurrentConsumerEnvironment,
  getSuiteAccountsCurrentConsumer,
  getSuiteAccountsConsumerEnvironment,
  getSuiteAccountsConsumer,
  createSuiteAccountsClientConfiguration,
  SUITE_OIDC_EARLY_REFRESH_WINDOW_MS,
  SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS,
  SUITE_CONVEX_BROWSER_TOKEN_USE,
  SUITE_CONVEX_BROWSER_TOKEN_TTL_MS,
  SUITE_CONVEX_BROWSER_TOKEN_PATH,
  SUITE_CONVEX_BROWSER_PARENT_REFRESH_WINDOW_MS,
  SUITE_CONVEX_BROWSER_JWKS_PATH,
  SUITE_CONVEX_BROWSER_ISSUER_PATH,
  SUITE_CONVEX_BROWSER_CONSUMER_IDS,
  SUITE_CONVEX_BROWSER_AUDIENCE_PATH,
  SUITE_CONSUMER_IDS,
  SUITE_ACCOUNTS_WIRE_VERSION,
  SUITE_ACCOUNTS_REMOTE_ENVIRONMENTS,
  SUITE_ACCOUNTS_PUBLIC_ENVIRONMENT_KEYS,
  SUITE_ACCOUNTS_OAUTH_RESOURCE,
  SUITE_ACCOUNTS_LINKED_OIDC_CONSUMER_IDS,
  SUITE_ACCOUNTS_DEPLOYMENTS,
  SUITE_ACCOUNTS_CURRENT_ORIGIN_OVERRIDES,
  SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS,
  SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS,
  SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS,
  SUITE_ACCOUNTS_CURRENT_CONSUMERS,
  SUITE_ACCOUNTS_CONSUMERS,
  SUITE_ACCOUNTS_CLIENT_CONFIGURATION_VERSION,
  SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS
};
