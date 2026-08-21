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
  "subcounter"
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
  subcounter: currentOidcSite("subcounter", "Subcounter", "https://subcounter.com")
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

// src/convex-browser-auth-server.ts
import {
  createECDH,
  createPrivateKey,
  createPublicKey
} from "node:crypto";
import { SignJWT } from "jose";
var KEYRING_VERSION = "suite-convex-browser-keyring-v1";
var TOKEN_RESPONSE_VERSION = "suite-convex-browser-token-response-v1";
var MAXIMUM_KEY_COUNT = 4;
var activePrivateKeys = new WeakMap;
var CONFIGURATION_KEYS = deepFreeze([
  "audience",
  "clientId",
  "consumer",
  "environment",
  "issuer",
  "jwksEndpoint",
  "siteUrl",
  "suiteIssuer",
  "tokenEndpoint"
]);
function authoritativeConfiguration(configuration) {
  const expected = suiteConvexBrowserConfiguration(configuration.consumer, configuration.environment);
  if (Object.keys(configuration).length !== CONFIGURATION_KEYS.length || CONFIGURATION_KEYS.some((key) => configuration[key] !== expected[key])) {
    throw new Error("The Convex browser configuration does not match the registry.");
  }
  return expected;
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exactKeys(value, required, optional = []) {
  const keys = Object.keys(value);
  const accepted = new Set([...required, ...optional]);
  return required.every((key) => Object.hasOwn(value, key)) && keys.every((key) => accepted.has(key));
}
function canonicalCoordinate(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43}$/u.test(value)) {
    return false;
  }
  try {
    const bytes = Buffer.from(value, "base64url");
    return bytes.byteLength === 32 && bytes.toString("base64url") === value;
  } catch {
    return false;
  }
}
function canonicalKid(value) {
  return typeof value === "string" && /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,63})$/u.test(value);
}
function publicJwk(value) {
  if (!exactKeys(value, ["alg", "crv", "kid", "kty", "use", "x", "y"], ["d"]) || value["alg"] !== "ES256" || value["crv"] !== "P-256" || !canonicalKid(value["kid"]) || value["kty"] !== "EC" || value["use"] !== "sig" || !canonicalCoordinate(value["x"]) || !canonicalCoordinate(value["y"]) || value["d"] !== undefined && !canonicalCoordinate(value["d"])) {
    return null;
  }
  return {
    alg: "ES256",
    crv: "P-256",
    kid: value["kid"],
    kty: "EC",
    use: "sig",
    x: value["x"],
    y: value["y"]
  };
}
function nodeJwk(key, privateCoordinate) {
  return {
    alg: key.alg,
    crv: key.crv,
    ...privateCoordinate === undefined ? {} : { d: privateCoordinate },
    key_ops: privateCoordinate === undefined ? ["verify"] : ["sign"],
    kid: key.kid,
    kty: key.kty,
    use: key.use,
    x: key.x,
    y: key.y
  };
}
function validPublicKey(key) {
  try {
    const imported = createPublicKey({ format: "jwk", key: nodeJwk(key) });
    return imported.asymmetricKeyType === "ec" && imported.asymmetricKeyDetails?.namedCurve === "prime256v1";
  } catch {
    return false;
  }
}
function activePrivateKey(key, privateCoordinate) {
  try {
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(privateCoordinate, "base64url"));
    const derivedPoint = ecdh.getPublicKey(undefined, "uncompressed");
    if (derivedPoint.byteLength !== 65 || derivedPoint[0] !== 4 || derivedPoint.subarray(1, 33).toString("base64url") !== key.x || derivedPoint.subarray(33, 65).toString("base64url") !== key.y) {
      return null;
    }
    const imported = createPrivateKey({
      format: "jwk",
      key: nodeJwk(key, privateCoordinate)
    });
    if (imported.asymmetricKeyType !== "ec" || imported.asymmetricKeyDetails?.namedCurve !== "prime256v1") {
      return null;
    }
    const derived = createPublicKey(imported).export({ format: "jwk" });
    return derived.kty === "EC" && derived.crv === "P-256" && derived.x === key.x && derived.y === key.y ? imported : null;
  } catch {
    return null;
  }
}
function parseSuiteConvexBrowserKeyring(value, configuration) {
  const authoritative = authoritativeConfiguration(configuration);
  if (!isRecord2(value) || !exactKeys(value, ["activeKid", "consumer", "environment", "keys", "version"]) || value["version"] !== KEYRING_VERSION || value["consumer"] !== authoritative.consumer || value["environment"] !== authoritative.environment || !canonicalKid(value["activeKid"]) || !Array.isArray(value["keys"]) || value["keys"].length < 1 || value["keys"].length > MAXIMUM_KEY_COUNT) {
    return null;
  }
  const seen = new Set;
  const parsed = [];
  for (const candidate of value["keys"]) {
    if (!isRecord2(candidate))
      return null;
    const publicKey = publicJwk(candidate);
    if (publicKey === null || seen.has(publicKey.kid) || !validPublicKey(publicKey)) {
      return null;
    }
    seen.add(publicKey.kid);
    parsed.push({
      privateCoordinate: typeof candidate["d"] === "string" ? candidate["d"] : null,
      publicKey
    });
  }
  const active = parsed.find((key) => key.publicKey.kid === value["activeKid"]);
  if (active?.privateCoordinate === null || active === undefined)
    return null;
  const privateKey = activePrivateKey(active.publicKey, active.privateCoordinate);
  if (privateKey === null)
    return null;
  const ordered = parsed.map((key) => key.publicKey).sort((left, right) => {
    if (left.kid === value["activeKid"])
      return -1;
    if (right.kid === value["activeKid"])
      return 1;
    return left.kid.localeCompare(right.kid);
  });
  const keyring = deepFreeze({
    activeKid: value["activeKid"],
    consumer: authoritative.consumer,
    environment: authoritative.environment,
    jwks: { keys: ordered },
    version: KEYRING_VERSION
  });
  activePrivateKeys.set(keyring, privateKey);
  return keyring;
}
function safeTimestamp(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function createSuiteConvexBrowserTokenSigner(configuration, keyring, now = Date.now) {
  const authoritative = authoritativeConfiguration(configuration);
  if (keyring.consumer !== authoritative.consumer || keyring.environment !== authoritative.environment) {
    throw new Error("The Convex browser keyring environment does not match.");
  }
  const privateKey = activePrivateKeys.get(keyring);
  if (privateKey === undefined) {
    throw new Error("The Convex browser keyring was not parsed by this module.");
  }
  return Object.freeze({
    async sign(session) {
      const nowMs = now();
      const suiteAccountId = parseSuiteAccountId(session.suiteAccountId);
      const username = parseSuiteUsername(session.username);
      if (!safeTimestamp(nowMs) || !safeTimestamp(session.accessTokenExpiresAtMs) || !suiteAccountId.ok || !username.ok) {
        throw new Error("The parent suite session is invalid.");
      }
      if (session.accessTokenExpiresAtMs - nowMs < SUITE_CONVEX_BROWSER_PARENT_REFRESH_WINDOW_MS) {
        return { kind: "refresh_required" };
      }
      const issuedAtSeconds = Math.floor(nowMs / 1000);
      const expiresAtSeconds = Math.min(issuedAtSeconds + Math.floor(SUITE_CONVEX_BROWSER_TOKEN_TTL_MS / 1000), Math.floor(session.accessTokenExpiresAtMs / 1000));
      if (expiresAtSeconds <= issuedAtSeconds) {
        return { kind: "refresh_required" };
      }
      const token = await new SignJWT({
        profile_complete: true,
        profile_revision: "username-v1",
        suite_account_id: suiteAccountId.value,
        suite_client_id: authoritative.clientId,
        suite_issuer: authoritative.suiteIssuer,
        token_use: SUITE_CONVEX_BROWSER_TOKEN_USE,
        username: username.value
      }).setProtectedHeader({ alg: "ES256", kid: keyring.activeKid, typ: "JWT" }).setIssuer(authoritative.issuer).setAudience(authoritative.audience).setSubject(suiteAccountId.value).setIssuedAt(issuedAtSeconds).setNotBefore(issuedAtSeconds).setExpirationTime(expiresAtSeconds).sign(privateKey);
      return {
        expiresAtMs: expiresAtSeconds * 1000,
        kind: "token",
        token,
        version: TOKEN_RESPONSE_VERSION
      };
    }
  });
}
function noStoreJson(value, status = 200) {
  return Response.json(value, {
    headers: {
      "cache-control": "no-store",
      "content-security-policy": "default-src 'none'",
      pragma: "no-cache",
      "x-content-type-options": "nosniff"
    },
    status
  });
}
function exactEndpointRequest(request, endpoint, method) {
  let incoming;
  let expected;
  try {
    incoming = new URL(request.url);
    expected = new URL(endpoint);
  } catch {
    return false;
  }
  return request.method === method && incoming.origin === expected.origin && incoming.pathname === expected.pathname && incoming.search === "" && incoming.username === "" && incoming.password === "" && request.body === null;
}
function exactTokenRequest(request, configuration) {
  if (!exactEndpointRequest(request, configuration.tokenEndpoint, "POST")) {
    return false;
  }
  const contentLength = request.headers.get("content-length");
  const fetchDestination = request.headers.get("sec-fetch-dest");
  const fetchMode = request.headers.get("sec-fetch-mode");
  const fetchSite = request.headers.get("sec-fetch-site");
  return request.headers.get("origin") === configuration.siteUrl && (contentLength === null || contentLength === "0") && request.headers.get("content-type") === null && (fetchDestination === null || fetchDestination === "empty") && (fetchMode === null || fetchMode === "cors" || fetchMode === "same-origin") && (fetchSite === null || fetchSite === "same-origin") && request.headers.get("sec-fetch-user") === null;
}
function createSuiteConvexBrowserAuthHandlers(options) {
  const configuration = authoritativeConfiguration(options.configuration);
  const keyring = options.keyring;
  const serverSession = options.serverSession;
  const signer = createSuiteConvexBrowserTokenSigner(configuration, keyring, options.now);
  return Object.freeze({
    jwks: (request) => Promise.resolve(exactEndpointRequest(request, configuration.jwksEndpoint, "GET") ? noStoreJson(keyring.jwks) : noStoreJson({ kind: "request_rejected" }, 403)),
    token: async (request) => {
      if (!exactTokenRequest(request, configuration)) {
        return noStoreJson({ kind: "request_rejected" }, 403);
      }
      const session = await serverSession(request);
      if (session === null) {
        return noStoreJson({ kind: "signed_out" }, 401);
      }
      let result;
      try {
        result = await signer.sign({
          accessTokenExpiresAtMs: session.accessTokenExpiresAtMs,
          suiteAccountId: session.suiteAccountId,
          username: session.username
        });
      } catch {
        return noStoreJson({ kind: "signed_out" }, 401);
      }
      return result.kind === "refresh_required" ? noStoreJson(result, 409) : noStoreJson(result);
    }
  });
}
export {
  parseSuiteConvexBrowserKeyring,
  createSuiteConvexBrowserTokenSigner,
  createSuiteConvexBrowserAuthHandlers
};
