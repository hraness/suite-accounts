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
    production: unsupported("https://sponge.computer")
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
  "sponge"
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
  sponge: currentOidcSite("sponge", "Sponge", "https://sponge.computer")
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
  suiteAccountsPublicConfigFromEnvironment,
  parseSuiteAccountsPublicConfig,
  SUITE_ACCOUNTS_PUBLIC_ENVIRONMENT_KEYS
};
