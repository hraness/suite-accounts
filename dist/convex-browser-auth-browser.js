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
  "gnrte",
  "soundfish",
  "oh-computer",
  "draw-money",
  "oprte",
  "sponge",
  "sup"
]);
var LEGACY_SUITE_CONSUMER_IDS = deepFreeze([
  "kitchen"
]);
function parseSuiteConsumerId(value) {
  switch (value) {
    case "accounts":
    case "act60":
    case "elders":
    case "gnrte":
    case "soundfish":
    case "oh-computer":
    case "draw-money":
    case "oprte":
    case "sponge":
    case "sup":
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
  gnrte: {
    auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
    displayName: "GNRTE",
    environments: {
      production: unsupported("https://gnrte.com")
    },
    id: "gnrte"
  },
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
  sponge: oidcSite("sponge", "Sponge", "https://spongesearch.com"),
  sup: {
    auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
    displayName: "Sup",
    environments: {
      production: unsupported("https://sup.fan")
    },
    id: "sup"
  }
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
  "gnrte",
  "soundfish",
  "oprte",
  "sup"
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
  const override = SUITE_ACCOUNTS_CURRENT_ORIGIN_OVERRIDES[consumer];
  return override?.[environment] ?? getSuiteAccountsConsumerEnvironment(consumer, environment);
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

// src/oidc-session-policy.ts
var SUITE_OIDC_EARLY_REFRESH_WINDOW_MS = 30000;

// src/identity/identifiers.ts
import { err as err2, ok as ok2 } from "@hraness/result";
var suiteAccountIdPattern = /^acct_[0-9a-f]{32}$/u;
var suiteInvoiceRefPattern = /^invref_[0-9a-f]{32}$/u;
var uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
function parseSuiteAccountId(value) {
  return typeof value === "string" && suiteAccountIdPattern.test(value) ? ok2(value) : err2("invalid-suite-account-id");
}
function parseSuiteInvoiceRef(value) {
  return typeof value === "string" && suiteInvoiceRefPattern.test(value) ? ok2(value) : err2("invalid-suite-invoice-ref");
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
import { err as err3, ok as ok3 } from "@hraness/result";
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
    return err3("suite-username-too-short");
  }
  if (value.length > SUITE_USERNAME_MAX_LENGTH) {
    return err3("suite-username-too-long");
  }
  if (!suiteUsernamePattern.test(value)) {
    return err3("invalid-suite-username");
  }
  return ok3(value);
}
function normalizeSuiteUsername(value) {
  if (typeof value !== "string")
    return err3("invalid-suite-username");
  for (let index = 0;index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code > 127 || code < 32 || code === 127) {
      return err3("invalid-suite-username");
    }
  }
  const trimmed = value.trim();
  const parsed = validateCanonicalSuiteUsername(trimmed.toLowerCase());
  if (!parsed.ok)
    return parsed;
  return reservedSuiteUsernames.has(parsed.value) ? err3("suite-username-reserved") : parsed;
}
function parseSuiteUsername(value) {
  if (typeof value !== "string")
    return err3("invalid-suite-username");
  const parsed = validateCanonicalSuiteUsername(value);
  return parsed.ok && parsed.value === value ? parsed : err3(parsed.ok ? "invalid-suite-username" : parsed.error);
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
function isRecord(value) {
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
  if (!isRecord(value))
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

// src/browser-session.ts
var MAXIMUM_SESSION_RESPONSE_BYTES = 32768;
var SESSION_PATH = "/api/suite-auth/session";
var REFRESH_PATH = "/api/suite-auth/refresh";
var SIGN_OUT_PATH = "/api/suite-auth/sign-out";
var SUITE_OIDC_REFRESH_LOCK_NAME = "jungle-suite-accounts:oidc-refresh:v1";
var SUITE_OIDC_SESSION_CHANNEL_NAME = "jungle-suite-accounts:oidc-session:v1";
var SIGNED_OUT_EVENT = Object.freeze({
  kind: "signed_out",
  version: "suite-oidc-session-event-v1"
});
var localRefresh = null;
function isExactRefreshRequired(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length === 1 && Reflect.get(value, "kind") === "refresh_required";
}
async function readBoundedJson(response) {
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json" || response.body === null) {
    throw new Error("The suite session response was not JSON.");
  }
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null && (!/^(?:0|[1-9]\d*)$/u.test(declaredLength) || Number(declaredLength) > MAXIMUM_SESSION_RESPONSE_BYTES)) {
    await response.body.cancel().catch(() => {
      return;
    });
    throw new Error("The suite session response was too large.");
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done)
        break;
      total += result.value.byteLength;
      if (total > MAXIMUM_SESSION_RESPONSE_BYTES) {
        await reader.cancel().catch(() => {
          return;
        });
        throw new Error("The suite session response was too large.");
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
async function requestJson(fetcher, path, method) {
  const response = await fetcher(path, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { accept: "application/json" },
    method,
    redirect: "error"
  });
  const value = await readBoundedJson(response);
  if (!response.ok) {
    throw new Error("The suite session request failed.");
  }
  return value;
}
function exactSignedOut(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length === 1 && Reflect.get(value, "kind") === "signed_out";
}
function broadcastSuiteOidcBrowserSignOut() {
  if (typeof BroadcastChannel === "undefined")
    return;
  const channel = new BroadcastChannel(SUITE_OIDC_SESSION_CHANNEL_NAME);
  try {
    channel.postMessage(SIGNED_OUT_EVENT);
  } finally {
    channel.close();
  }
}
function subscribeSuiteOidcBrowserSignOut(listener) {
  if (typeof BroadcastChannel === "undefined")
    return () => {
      return;
    };
  const channel = new BroadcastChannel(SUITE_OIDC_SESSION_CHANNEL_NAME);
  const onMessage = (event) => {
    const value = event.data;
    if (typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length === 2 && Reflect.get(value, "kind") === SIGNED_OUT_EVENT.kind && Reflect.get(value, "version") === SIGNED_OUT_EVENT.version) {
      listener();
    }
  };
  channel.addEventListener("message", onMessage);
  return () => {
    channel.removeEventListener("message", onMessage);
    channel.close();
  };
}
async function withLocalRefreshLock(task) {
  if (localRefresh !== null)
    return await localRefresh;
  const pending = task();
  localRefresh = pending;
  try {
    return await pending;
  } finally {
    if (localRefresh === pending)
      localRefresh = null;
  }
}
async function withRefreshLock(task, injectedLock) {
  if (injectedLock !== undefined) {
    return injectedLock === null ? await withLocalRefreshLock(task) : await injectedLock(SUITE_OIDC_REFRESH_LOCK_NAME, task);
  }
  if (typeof navigator !== "undefined" && navigator.locks !== undefined) {
    return await navigator.locks.request(SUITE_OIDC_REFRESH_LOCK_NAME, { mode: "exclusive" }, task);
  }
  return await withLocalRefreshLock(task);
}
async function loadSuiteOidcBrowserSession(dependencies = {}) {
  const fetcher = dependencies.fetch ?? globalThis.fetch;
  const withExclusiveLock = dependencies.withExclusiveLock;
  const current = await requestJson(fetcher, SESSION_PATH, "GET");
  if (!isExactRefreshRequired(current))
    return current;
  return await withRefreshLock(async () => {
    const latest = await requestJson(fetcher, SESSION_PATH, "GET");
    return isExactRefreshRequired(latest) ? await requestJson(fetcher, REFRESH_PATH, "POST") : latest;
  }, withExclusiveLock);
}
async function signOutSuiteOidcBrowserSession(dependencies = {}) {
  const fetcher = dependencies.fetch ?? globalThis.fetch;
  const notifySignedOut = dependencies.notifySignedOut ?? broadcastSuiteOidcBrowserSignOut;
  const withExclusiveLock = dependencies.withExclusiveLock;
  await withRefreshLock(async () => {
    const value = await requestJson(fetcher, SIGN_OUT_PATH, "POST");
    if (!exactSignedOut(value)) {
      throw new Error("The suite sign-out response was invalid.");
    }
  }, withExclusiveLock);
  notifySignedOut();
}

// src/convex-browser-auth-browser.ts
var MAXIMUM_TOKEN_RESPONSE_BYTES = 20 * 1024;
var TOKEN_RESPONSE_VERSION = "suite-convex-browser-token-response-v1";
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exactKeys(value, keys) {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}
function compactJwt(value) {
  return typeof value === "string" && value.length >= 32 && value.length <= 16384 && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u.test(value);
}
async function readBoundedJson2(response) {
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  const cacheControl = response.headers.get("cache-control")?.toLowerCase();
  if (contentType !== "application/json" || cacheControl === undefined || !cacheControl.split(",").some((value) => value.trim() === "no-store") || response.body === null) {
    throw new Error("The Convex token response was unsafe.");
  }
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null && (!/^(?:0|[1-9]\d*)$/u.test(declaredLength) || Number(declaredLength) > MAXIMUM_TOKEN_RESPONSE_BYTES)) {
    await response.body.cancel().catch(() => {
      return;
    });
    throw new Error("The Convex token response was too large.");
  }
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done)
        break;
      length += result.value.byteLength;
      if (length > MAXIMUM_TOKEN_RESPONSE_BYTES) {
        await reader.cancel().catch(() => {
          return;
        });
        throw new Error("The Convex token response was too large.");
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
function parseEndpointResult(value, status, nowMs) {
  if (!isRecord2(value)) {
    throw new Error("The Convex token response was invalid.");
  }
  if (status === 401 && exactKeys(value, ["kind"]) && value["kind"] === "signed_out") {
    return { kind: "signed_out" };
  }
  if (status === 409 && exactKeys(value, ["kind"]) && value["kind"] === "refresh_required") {
    return { kind: "refresh_required" };
  }
  if (status !== 200 || !exactKeys(value, ["expiresAtMs", "kind", "token", "version"]) || value["kind"] !== "token" || value["version"] !== TOKEN_RESPONSE_VERSION || !compactJwt(value["token"]) || typeof value["expiresAtMs"] !== "number" || !Number.isSafeInteger(value["expiresAtMs"]) || value["expiresAtMs"] <= nowMs || value["expiresAtMs"] > nowMs + 5 * 60000) {
    throw new Error("The Convex token response was invalid.");
  }
  return {
    expiresAtMs: value["expiresAtMs"],
    kind: "token",
    token: value["token"]
  };
}
async function requestToken(fetcher, now) {
  const response = await fetcher(SUITE_CONVEX_BROWSER_TOKEN_PATH, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { accept: "application/json" },
    method: "POST",
    redirect: "error"
  });
  return parseEndpointResult(await readBoundedJson2(response), response.status, now());
}
function createSuiteConvexBrowserTokenLoader(dependencies = {}) {
  const fetcher = dependencies.fetch ?? globalThis.fetch;
  const now = dependencies.now ?? Date.now;
  const withExclusiveLock = dependencies.withExclusiveLock;
  const refreshSuiteSession = dependencies.refreshSuiteSession ?? (() => loadSuiteOidcBrowserSession({
    fetch: fetcher,
    ...withExclusiveLock === undefined ? {} : { withExclusiveLock }
  }));
  let cached = null;
  let pending = null;
  let custodyGeneration = 0;
  async function exchange(generation) {
    const first = await requestToken(fetcher, now);
    const result = first.kind === "refresh_required" ? await (async () => {
      await refreshSuiteSession();
      return await requestToken(fetcher, now);
    })() : first;
    if (result.kind === "refresh_required") {
      throw new Error("The suite session still requires refresh.");
    }
    if (result.kind === "signed_out") {
      if (custodyGeneration === generation)
        cached = null;
      return null;
    }
    if (custodyGeneration !== generation)
      return null;
    cached = { expiresAtMs: result.expiresAtMs, token: result.token };
    return result.token;
  }
  return Object.freeze({
    clear() {
      custodyGeneration += 1;
      cached = null;
    },
    async fetchAccessToken() {
      const nowMs = now();
      if (cached !== null && cached.expiresAtMs - nowMs >= SUITE_CONVEX_BROWSER_PARENT_REFRESH_WINDOW_MS) {
        return cached.token;
      }
      if (pending !== null)
        return await pending;
      const request = exchange(custodyGeneration);
      pending = request;
      try {
        return await request;
      } finally {
        if (pending === request)
          pending = null;
      }
    }
  });
}
export {
  createSuiteConvexBrowserTokenLoader
};
