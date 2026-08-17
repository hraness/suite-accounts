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
var SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS = deepFreeze([
  "accounts",
  "act60",
  "elders",
  "soundfish",
  "oh-computer",
  "oprte",
  "sponge"
]);
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
    production: unsupported("https://sponge.computer")
  }
});
var SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS = deepFreeze(SUITE_CONSUMER_IDS.filter((consumer) => SUITE_ACCOUNTS_CONSUMERS[consumer].auth.kind === "oidc-rp"));
function suiteAccountsConsumerRequiresEmailOtp(consumer) {
  return SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS.includes(consumer);
}
var SUITE_ACCOUNTS_LINKED_OIDC_CONSUMER_IDS = deepFreeze([
  "soundfish",
  "oprte"
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
function getSuiteAccountsConsumer(consumer) {
  return SUITE_ACCOUNTS_CONSUMERS[consumer];
}
function getSuiteAccountsConsumerEnvironment(consumer, environment) {
  const registration = getSuiteAccountsConsumer(consumer);
  return registration.environments[environment] ?? null;
}
function getSuiteAccountsCurrentConsumerEnvironment(consumer, environment) {
  if (!isSuiteAccountsActiveConsumerId(consumer))
    return null;
  const override = SUITE_ACCOUNTS_CURRENT_ORIGIN_OVERRIDES[consumer];
  return override?.[environment] ?? getSuiteAccountsConsumerEnvironment(consumer, environment);
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
  if (!isSuiteAccountsConsumerId(consumer) || !isSuiteAccountsOAuthConsumerId(consumer))
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
  if (!isSuiteAccountsConsumerId(binding.consumer)) {
    return err2("invalid-consumer");
  }
  if (!isSuiteAccountsActiveConsumerId(binding.consumer)) {
    return err2("invalid-consumer");
  }
  if (binding.environment !== "production") {
    return err2("invalid-environment");
  }
  const consumer = binding.consumer;
  const environment = binding.environment;
  const registration = getSuiteAccountsConsumer(consumer);
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
export {
  createSuiteAccountsClientConfiguration,
  SUITE_ACCOUNTS_WIRE_VERSION,
  SUITE_ACCOUNTS_CLIENT_CONFIGURATION_VERSION
};
