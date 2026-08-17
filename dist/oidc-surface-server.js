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

// src/oidc-session-policy.ts
var SUITE_OIDC_EARLY_REFRESH_WINDOW_MS = 30000;

// src/identity/catalog.ts
import { err as err2, ok as ok2 } from "@hraness/result";
var SUITE_CATALOG_REVISION = "cclrte-suite-v3";
var PREVIOUS_SUITE_CATALOG_REVISION = "cclrte-suite-v2";
var LEGACY_SUITE_CATALOG_REVISION = "cclrte-suite-v1";
var SUITE_CATALOG_REVISIONS = deepFreeze([
  LEGACY_SUITE_CATALOG_REVISION,
  PREVIOUS_SUITE_CATALOG_REVISION,
  SUITE_CATALOG_REVISION
]);
var SUITE_PLAN_IDS = deepFreeze(["individual", "business"]);
var SUITE_CURRENT_FEATURE_IDS = deepFreeze([
  "suite.paid",
  "suite.believer"
]);
var SUITE_LEGACY_FEATURE_IDS = deepFreeze([
  "suite.paid",
  "suite.business"
]);
var SUITE_FEATURE_IDS = deepFreeze([
  "suite.paid",
  "suite.believer",
  "suite.business"
]);
var CURRENT_PLAN_FEATURES = deepFreeze({
  business: ["suite.paid", "suite.believer"],
  individual: ["suite.paid"]
});
var LEGACY_PLAN_FEATURES = deepFreeze({
  business: ["suite.paid", "suite.business"],
  individual: ["suite.paid"]
});
function parseSuitePlanId(value) {
  return value === "individual" || value === "business" ? ok2(value) : err2("invalid-plan");
}
function parseCurrentSuiteFeatureId(value) {
  return value === "suite.paid" || value === "suite.believer" ? ok2(value) : err2("invalid-feature");
}
function parseSuiteFeatureId(value) {
  return typeof value === "string" && SUITE_FEATURE_IDS.includes(value) ? ok2(value) : err2("invalid-feature");
}
function parseSuiteCatalogRevision(value) {
  return value === LEGACY_SUITE_CATALOG_REVISION || value === PREVIOUS_SUITE_CATALOG_REVISION || value === SUITE_CATALOG_REVISION ? ok2(value) : err2("invalid-catalog-revision");
}
function featuresForSuitePlan(plan, revision = SUITE_CATALOG_REVISION) {
  return revision === LEGACY_SUITE_CATALOG_REVISION ? [...LEGACY_PLAN_FEATURES[plan]] : [...CURRENT_PLAN_FEATURES[plan]];
}
function suitePlanIncludesFeature(plan, feature) {
  return plan !== null && featuresForSuitePlan(plan).includes(feature);
}

// src/identity/principals.ts
import { err as err5, isRecord, ok as ok5 } from "@hraness/result";

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

// src/identity/principals.ts
var SUITE_PRODUCTS = deepFreeze([
  "soundfish",
  "oprte",
  "crclte",
  "pub"
]);
var LEGACY_SUITE_PRODUCT_IDS = deepFreeze(["kitchen"]);
var SUITE_ENVIRONMENTS = deepFreeze([
  "development",
  "staging",
  "production"
]);
var SUITE_ISSUABLE_ENVIRONMENTS = deepFreeze([
  "development",
  "production"
]);
var localIssuerHosts = new Set(["127.0.0.1", "[::1]", "localhost"]);
function containsAsciiControl(value) {
  for (let index = 0;index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127)
      return true;
  }
  return false;
}
function parseIdentityIssuer(value) {
  if (typeof value !== "string" || value.length > 2048 || value.trim() !== value) {
    return err5("invalid-issuer");
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return err5("invalid-issuer");
  }
  const local = localIssuerHosts.has(parsed.hostname);
  if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:") || parsed.username !== "" || parsed.password !== "" || parsed.pathname !== "/" || parsed.search !== "" || parsed.hash !== "") {
    return err5("invalid-issuer");
  }
  return ok5(parsed.origin);
}
function parseIdentitySubject(value) {
  if (typeof value !== "string" || value.length < 1 || value.length > 255 || value.trim() !== value || containsAsciiControl(value)) {
    return err5("invalid-subject");
  }
  return ok5(value);
}
function parseIssuerSubject(value) {
  if (!isRecord(value))
    return err5("invalid-subject");
  const issuer = parseIdentityIssuer(value["issuer"]);
  if (!issuer.ok)
    return issuer;
  const subject = parseIdentitySubject(value["subject"]);
  return subject.ok ? ok5({ issuer: issuer.value, subject: subject.value }) : subject;
}
function parseSuiteProduct(value) {
  switch (value) {
    case "soundfish":
    case "oprte":
    case "crclte":
    case "pub":
      return ok5(value);
    case "kitchen":
      return ok5("oprte");
    default:
      return err5("invalid-product");
  }
}
function parseSuiteEnvironment(value) {
  return typeof value === "string" && SUITE_ENVIRONMENTS.includes(value) ? ok5(value) : err5("invalid-environment");
}
function isSuiteIssuableEnvironment(value) {
  return value === "development" || value === "production";
}
function parseLegacyPrincipalLink(value) {
  if (!isRecord(value))
    return err5("invalid-legacy-link");
  const product = parseSuiteProduct(value["product"]);
  if (!product.ok)
    return product;
  const environment = parseSuiteEnvironment(value["environment"]);
  if (!environment.ok)
    return environment;
  const legacySubject = parseIdentitySubject(value["legacySubject"]);
  if (!legacySubject.ok)
    return legacySubject;
  return ok5({
    environment: environment.value,
    legacySubject: legacySubject.value,
    product: product.value
  });
}
function parseAudience(value) {
  const values = typeof value === "string" ? [value] : value;
  if (!Array.isArray(values) || values.length < 1 || values.length > 8 || values.some((entry) => typeof entry !== "string" || entry.length < 1 || entry.length > 255 || entry.trim() !== entry || containsAsciiControl(entry)) || new Set(values).size !== values.length) {
    return err5("invalid-audience");
  }
  return ok5(values);
}
function parseTimestamp(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
function parseSuiteJwtClaims(value) {
  if (!isRecord(value))
    return err5("invalid-jwt-claims");
  const principal = parseIssuerSubject({
    issuer: value["iss"],
    subject: value["sub"]
  });
  if (!principal.ok)
    return principal;
  const suiteAccountId = parseSuiteAccountId(value["suite_account_id"]);
  if (!suiteAccountId.ok)
    return suiteAccountId;
  const audience = parseAudience(value["aud"]);
  if (!audience.ok)
    return audience;
  const issuedAtSeconds = parseTimestamp(value["iat"]);
  const expiresAtSeconds = parseTimestamp(value["exp"]);
  const notBeforeSeconds = value["nbf"] === undefined ? undefined : parseTimestamp(value["nbf"]);
  const legacyProfile = value["profile_revision"] === undefined && value["profile_complete"] === undefined && value["username"] === undefined;
  const profileRevision = legacyProfile ? null : value["profile_revision"] === "username-v1" ? "username-v1" : undefined;
  const profileComplete = legacyProfile ? false : typeof value["profile_complete"] === "boolean" ? value["profile_complete"] : undefined;
  const username = legacyProfile || value["username"] === null ? null : parseSuiteUsername(value["username"]);
  if (issuedAtSeconds === null || expiresAtSeconds === null || expiresAtSeconds <= issuedAtSeconds || notBeforeSeconds === null || notBeforeSeconds !== undefined && notBeforeSeconds > expiresAtSeconds || profileRevision === undefined || profileComplete === undefined || username !== null && !username.ok || profileComplete !== (username !== null)) {
    return err5("invalid-jwt-claims");
  }
  return ok5({
    audience: audience.value,
    expiresAtSeconds,
    issuedAtSeconds,
    ...notBeforeSeconds === undefined ? {} : { notBeforeSeconds },
    principal: principal.value,
    profileComplete,
    profileRevision,
    suiteAccountId: suiteAccountId.value,
    username: username?.value ?? null
  });
}

// src/entitlements.ts
var SUITE_ENTITLEMENTS_CLAIM_VERSION = "suite-entitlements-v1";
var SUITE_ENTITLEMENT_MAX_PROVIDER_AGE_MS = 26 * 60 * 60000;
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nonNegativeInteger(value) {
  return Number.isSafeInteger(value) && typeof value === "number" && value >= 0;
}
function canonicalFeatures(features) {
  return features.length === 0 || features.length === 1 && features[0] === "suite.paid" || features.length === 2 && features[0] === "suite.paid" && features[1] === "suite.believer";
}
function validReceiptProjection(projection) {
  return projection.suiteAccountId.length >= 1 && projection.suiteAccountId.length <= 128 && canonicalFeatures(projection.features) && nonNegativeInteger(projection.observedAtMs) && nonNegativeInteger(projection.expiresAtMs) && projection.expiresAtMs > projection.observedAtMs && nonNegativeInteger(projection.projectionRevision) && nonNegativeInteger(projection.receiptIssuedAtMs) && projection.receiptIssuedAtMs < projection.expiresAtMs && (projection.receiptDigest === undefined || /^[a-f0-9]{64}$/u.test(projection.receiptDigest));
}
function sameFeatures(left, right) {
  return left.length === right.length && left.every((feature, index) => feature === right[index]);
}
function decideSuiteEntitlementReceiptProjection(current, incoming) {
  if (!validReceiptProjection(incoming))
    return "conflict";
  if (current === null)
    return "insert";
  if (!validReceiptProjection(current) || current.suiteAccountId !== incoming.suiteAccountId || incoming.projectionRevision < current.projectionRevision || incoming.observedAtMs < current.observedAtMs || incoming.receiptIssuedAtMs < current.receiptIssuedAtMs) {
    return "conflict";
  }
  if (incoming.projectionRevision > current.projectionRevision || incoming.receiptIssuedAtMs > current.receiptIssuedAtMs) {
    return "replace";
  }
  return incoming.expiresAtMs === current.expiresAtMs && incoming.observedAtMs === current.observedAtMs && sameFeatures(incoming.features, current.features) && incoming.receiptDigest === current.receiptDigest ? "replay" : "conflict";
}
function parseEntitlements(value) {
  if (!isRecord2(value))
    return null;
  if (value["version"] !== SUITE_ENTITLEMENTS_CLAIM_VERSION || value["catalogRevision"] !== SUITE_CATALOG_REVISION || !nonNegativeInteger(value["observedAtMs"]) || !nonNegativeInteger(value["expiresAtMs"]) || !nonNegativeInteger(value["projectionRevision"]) || !Array.isArray(value["features"]) || value["features"].length > 16) {
    return null;
  }
  const features = [];
  for (const valueFeature of value["features"]) {
    const feature = parseCurrentSuiteFeatureId(valueFeature);
    if (!feature.ok || features.includes(feature.value))
      return null;
    features.push(feature.value);
  }
  if (value["expiresAtMs"] <= value["observedAtMs"])
    return null;
  return {
    catalogRevision: SUITE_CATALOG_REVISION,
    expiresAtMs: value["expiresAtMs"],
    features,
    observedAtMs: value["observedAtMs"],
    projectionRevision: value["projectionRevision"],
    version: SUITE_ENTITLEMENTS_CLAIM_VERSION
  };
}
function validExpectedString(value) {
  let hasControl = false;
  for (let index = 0;index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) {
      hasControl = true;
      break;
    }
  }
  return value.length >= 1 && value.length <= 2048 && value.trim() === value && !hasControl;
}
async function verifySuiteEntitlementToken(compactToken, options) {
  if (compactToken.length < 1 || compactToken.length > 16384 || !validExpectedString(options.expectedAudience) || !validExpectedString(options.expectedIssuer)) {
    return { kind: "invalid", reason: "claims" };
  }
  let payload;
  try {
    payload = await options.verify(compactToken);
  } catch {
    return { kind: "invalid", reason: "signature" };
  }
  const parsed = parseSuiteJwtClaims(payload);
  if (!parsed.ok)
    return { kind: "invalid", reason: "claims" };
  const claims = parsed.value;
  if (claims.principal.issuer !== options.expectedIssuer) {
    return { kind: "invalid", reason: "issuer" };
  }
  if (!claims.audience.includes(options.expectedAudience)) {
    return { kind: "invalid", reason: "audience" };
  }
  const nowMs = options.nowMs ?? Date.now();
  const clockSkewMs = options.clockSkewMs ?? 30000;
  const maxTokenLifetimeMs = options.maxTokenLifetimeMs ?? 20 * 60000;
  const maxProjectionAgeMs = options.maxProjectionAgeMs ?? SUITE_ENTITLEMENT_MAX_PROVIDER_AGE_MS;
  if (!nonNegativeInteger(nowMs) || !nonNegativeInteger(clockSkewMs) || !nonNegativeInteger(maxTokenLifetimeMs) || !nonNegativeInteger(maxProjectionAgeMs)) {
    return { kind: "invalid", reason: "time" };
  }
  const issuedAtMs = claims.issuedAtSeconds * 1000;
  const expiresAtMs = claims.expiresAtSeconds * 1000;
  const notBeforeMs = claims.notBeforeSeconds === undefined ? issuedAtMs : claims.notBeforeSeconds * 1000;
  if (expiresAtMs - issuedAtMs > maxTokenLifetimeMs || issuedAtMs > nowMs + clockSkewMs || notBeforeMs > nowMs + clockSkewMs || expiresAtMs <= nowMs - clockSkewMs) {
    return { kind: "invalid", reason: "time" };
  }
  if (!isRecord2(payload))
    return { kind: "invalid", reason: "claims" };
  const rawEntitlements = payload["suite_entitlements"];
  if (rawEntitlements === undefined) {
    return {
      claims,
      entitlements: { claim: null, features: [], kind: "legacy" },
      kind: "verified"
    };
  }
  const claim = parseEntitlements(rawEntitlements);
  if (claim === null || claim.expiresAtMs > expiresAtMs) {
    return { kind: "invalid", reason: "entitlements" };
  }
  const fresh = claim.observedAtMs <= nowMs + clockSkewMs && claim.expiresAtMs > nowMs - clockSkewMs && nowMs - claim.observedAtMs <= maxProjectionAgeMs;
  return {
    claims,
    entitlements: fresh ? { claim, features: claim.features, kind: "fresh" } : { claim, features: [], kind: "stale" },
    kind: "verified"
  };
}
function suiteTokenGrantsFeature(result, feature) {
  return result.kind === "verified" && result.entitlements.kind === "fresh" && result.entitlements.features.includes(feature);
}

// src/identity/links.ts
import { ok as ok6 } from "@hraness/result";
var IDENTITY_LINK_PROOF_VERSION = "suite-product-link-proof-v1";
var IDENTITY_LINK_RECEIPT_VERSION = "suite-link-receipt-v1";
var SUITE_ENTITLEMENTS_CLAIM_VERSION2 = "suite-entitlements-v1";
var SUITE_ENTITLEMENT_RECEIPT_VERSION = "suite-entitlement-receipt-v1";
var IDENTITY_LINK_MAX_TTL_MS = 5 * 60000;
var SUITE_ENTITLEMENT_RECEIPT_MAX_TTL_MS = 5 * 60000;
var IDENTITY_LINK_CLOCK_SKEW_MS = 30000;
var SUITE_LINK_PRODUCTS = deepFreeze([
  "soundfish",
  "oprte",
  "crclte",
  "pub"
]);
var LEGACY_SUITE_LINK_PRODUCTS = deepFreeze([
  "kitchen"
]);
function parseSuiteLinkProduct(value) {
  const parsed = parseSuiteProduct(value);
  if (!parsed.ok)
    return parsed;
  switch (parsed.value) {
    case "soundfish":
    case "oprte":
    case "crclte":
    case "pub":
      return ok6(parsed.value);
  }
}
function safeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}
function validateProductLinkProof(input, now) {
  const product = parseSuiteLinkProduct(input.product);
  const environment = parseSuiteEnvironment(input.environment);
  const localSubject = parseIdentitySubject(input.localSubject);
  if (!safeInteger(now) || !product.ok || !environment.ok || !localSubject.ok || !/^[A-Za-z0-9_-]{22,128}$/u.test(input.challengeId) || !/^[a-z0-9][a-z0-9._-]{0,31}$/u.test(input.keyVersion) || !safeInteger(input.issuedAtMs) || !safeInteger(input.expiresAtMs) || input.expiresAtMs <= input.issuedAtMs || input.expiresAtMs - input.issuedAtMs > IDENTITY_LINK_MAX_TTL_MS) {
    return "invalid";
  }
  if (input.issuedAtMs > now + IDENTITY_LINK_CLOCK_SKEW_MS) {
    return "not-yet-valid";
  }
  return input.expiresAtMs <= now ? "expired" : null;
}
function productLinkProofMessage(input) {
  return JSON.stringify([
    IDENTITY_LINK_PROOF_VERSION,
    input.product,
    input.environment,
    input.localSubject,
    input.challengeId,
    input.issuedAtMs,
    input.expiresAtMs,
    input.keyVersion
  ]);
}
function suiteLinkReceiptMessage(input) {
  return JSON.stringify([
    IDENTITY_LINK_RECEIPT_VERSION,
    input.product,
    input.environment,
    input.localSubject,
    input.suiteAccountId,
    input.challengeId,
    input.issuedAtMs,
    input.expiresAtMs,
    input.keyVersion
  ]);
}
function validateSuiteLinkReceipt(input, now) {
  const proofIssue = validateProductLinkProof(input, now);
  if (proofIssue !== null || input.version !== IDENTITY_LINK_RECEIPT_VERSION || !parseSuiteAccountId(input.suiteAccountId).ok || !/^[A-Za-z0-9_-]{43}$/u.test(input.signature)) {
    return proofIssue ?? "invalid";
  }
  return null;
}
function exactCurrentFeatures(values) {
  if (values.length > 2)
    return false;
  const parsed = [];
  for (const value of values) {
    const feature = parseCurrentSuiteFeatureId(value);
    if (!feature.ok || parsed.includes(feature.value))
      return false;
    parsed.push(feature.value);
  }
  return parsed.length === 0 || parsed.length === 1 && parsed[0] === "suite.paid" || parsed.length === 2 && parsed[0] === "suite.paid" && parsed[1] === "suite.believer";
}
function validateSuiteEntitlementsClaim(input) {
  return input.version === SUITE_ENTITLEMENTS_CLAIM_VERSION2 && input.catalogRevision === SUITE_CATALOG_REVISION && safeInteger(input.observedAtMs) && safeInteger(input.expiresAtMs) && input.expiresAtMs > input.observedAtMs && safeInteger(input.projectionRevision) && Array.isArray(input.features) && exactCurrentFeatures(input.features);
}
function suiteEntitlementReceiptMessage(input) {
  return JSON.stringify([
    SUITE_ENTITLEMENT_RECEIPT_VERSION,
    input.product,
    input.environment,
    input.suiteAccountId,
    input.keyVersion,
    input.issuedAtMs,
    input.expiresAtMs,
    input.entitlements.version,
    input.entitlements.catalogRevision,
    input.entitlements.observedAtMs,
    input.entitlements.expiresAtMs,
    input.entitlements.projectionRevision,
    input.entitlements.features
  ]);
}
function validateSuiteEntitlementReceipt(input, now) {
  const product = parseSuiteLinkProduct(input.product);
  const environment = parseSuiteEnvironment(input.environment);
  if (!safeInteger(now) || input.version !== SUITE_ENTITLEMENT_RECEIPT_VERSION || !product.ok || !environment.ok || !parseSuiteAccountId(input.suiteAccountId).ok || !/^[a-z0-9][a-z0-9._-]{0,31}$/u.test(input.keyVersion) || !safeInteger(input.issuedAtMs) || !safeInteger(input.expiresAtMs) || input.expiresAtMs <= input.issuedAtMs || input.expiresAtMs - input.issuedAtMs > SUITE_ENTITLEMENT_RECEIPT_MAX_TTL_MS || !validateSuiteEntitlementsClaim(input.entitlements) || input.expiresAtMs > input.entitlements.expiresAtMs || !/^[A-Za-z0-9_-]{43}$/u.test(input.signature)) {
    return "invalid";
  }
  if (input.issuedAtMs > now + IDENTITY_LINK_CLOCK_SKEW_MS || input.entitlements.observedAtMs > now + IDENTITY_LINK_CLOCK_SKEW_MS) {
    return "not-yet-valid";
  }
  return input.expiresAtMs <= now ? "expired" : null;
}

// src/oidc-rp.ts
import {
  createLocalJWKSet,
  decodeProtectedHeader,
  jwtVerify
} from "jose";
var TRANSACTION_TTL_MS = 10 * 60000;
var SESSION_TTL_MS = 7 * 24 * 60 * 60000;
var FETCH_TIMEOUT_MS = 8000;
var MAX_PROVIDER_BODY_BYTES = 64 * 1024;
var MAX_COOKIE_BYTES = 4096;
var MAX_RETURN_PATH_BYTES = 1024;
var MAX_CODE_BYTES = 2048;
var ALLOWED_TOKEN_ALGORITHMS = ["ES256"];
var REMOTE_TRANSACTION_COOKIE = "__Host-hraness-suite-oidc-transaction";
var REMOTE_SESSION_COOKIE = "__Host-hraness-suite-oidc-session";
var LOCAL_TRANSACTION_COOKIE = "hraness-suite-oidc-local-transaction";
var LOCAL_SESSION_COOKIE = "hraness-suite-oidc-local-session";
function isReceiptConsumer(consumer) {
  return isSuiteAccountsLinkedOidcConsumerId(consumer);
}
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function safeInteger2(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function boundedString(value, minimum, maximum) {
  return typeof value === "string" && value.length >= minimum && value.length <= maximum && !value.includes("\x00");
}
function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes)
    binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}
function decodeBase64Url(value) {
  if (!/^[A-Za-z0-9_-]+$/u.test(value))
    return null;
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4);
  try {
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}
function ownedBytes(value) {
  const result = new Uint8Array(new ArrayBuffer(value.byteLength));
  result.set(value);
  return result;
}
function randomValue(length, source) {
  const bytes = source(length);
  if (bytes.byteLength !== length) {
    throw new Error("The OIDC random source returned the wrong byte length.");
  }
  return encodeBase64Url(bytes);
}
async function sha256Base64Url(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return encodeBase64Url(new Uint8Array(digest));
}
function cookieNames(siteUrl) {
  const secure = new URL(siteUrl).protocol === "https:";
  return {
    secure,
    session: secure ? REMOTE_SESSION_COOKIE : LOCAL_SESSION_COOKIE,
    transaction: secure ? REMOTE_TRANSACTION_COOKIE : LOCAL_TRANSACTION_COOKIE
  };
}
function cookieAttributes(secure, maxAgeSeconds) {
  return [
    `Max-Age=${maxAgeSeconds}`,
    "Path=/",
    "HttpOnly",
    ...secure ? ["Secure"] : [],
    "SameSite=Lax"
  ].join("; ");
}
function setCookie(name, value, secure, maxAgeSeconds) {
  return `${name}=${value}; ${cookieAttributes(secure, maxAgeSeconds)}`;
}
function clearCookie(name, secure) {
  return [
    `${name}=`,
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Path=/",
    "HttpOnly",
    ...secure ? ["Secure"] : [],
    "SameSite=Lax"
  ].join("; ");
}
function requestCookie(request, name) {
  const header = request.headers.get("cookie");
  if (header === null || header.length > 16384)
    return null;
  const values = [];
  for (const segment of header.split(";")) {
    const trimmed = segment.trim();
    const separator = trimmed.indexOf("=");
    if (separator <= 0 || trimmed.slice(0, separator) !== name)
      continue;
    values.push(trimmed.slice(separator + 1));
  }
  return values.length === 1 ? values[0] : null;
}
async function deriveCookieKey(secret, consumer, environment) {
  const material = new TextEncoder().encode(`hraness-suite-oidc-cookie-v1\x00${consumer}\x00${environment}\x00${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", material);
  return await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["decrypt", "encrypt"]);
}
async function sealCookie(value, key, purpose, randomBytes) {
  const iv = ownedBytes(randomBytes(12));
  if (iv.byteLength !== 12)
    throw new Error("Invalid OIDC cookie IV.");
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  if (plaintext.byteLength > MAX_COOKIE_BYTES - 256) {
    throw new Error("The OIDC cookie payload was too large.");
  }
  const aad = new TextEncoder().encode(`hraness-suite-oidc-${purpose}-v1`);
  const encrypted = await crypto.subtle.encrypt({ additionalData: aad, iv, name: "AES-GCM", tagLength: 128 }, key, plaintext);
  const sealed = `v1.${encodeBase64Url(iv)}.${encodeBase64Url(new Uint8Array(encrypted))}`;
  if (sealed.length > MAX_COOKIE_BYTES) {
    throw new Error("The sealed OIDC cookie was too large.");
  }
  return sealed;
}
async function unsealCookie(value, key, purpose) {
  if (value.length < 1 || value.length > MAX_COOKIE_BYTES)
    return null;
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "v1")
    return null;
  const iv = decodeBase64Url(parts[1]);
  const ciphertext = decodeBase64Url(parts[2]);
  if (iv?.byteLength !== 12 || ciphertext === null)
    return null;
  try {
    const plaintext = await crypto.subtle.decrypt({
      additionalData: new TextEncoder().encode(`hraness-suite-oidc-${purpose}-v1`),
      iv: ownedBytes(iv),
      name: "AES-GCM",
      tagLength: 128
    }, key, ownedBytes(ciphertext));
    if (plaintext.byteLength > MAX_COOKIE_BYTES)
      return null;
    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    return null;
  }
}
function parseTransaction(value, consumer, environment, nowMs) {
  if (!isRecord3(value) || value["version"] !== 1 || value["consumer"] !== consumer || value["environment"] !== environment || !safeInteger2(value["issuedAtMs"]) || !safeInteger2(value["expiresAtMs"]) || value["expiresAtMs"] <= nowMs || value["issuedAtMs"] > nowMs + 30000 || value["expiresAtMs"] - value["issuedAtMs"] > TRANSACTION_TTL_MS || !boundedString(value["state"], 43, 128) || !boundedString(value["nonce"], 43, 128) || !boundedString(value["verifier"], 43, 128) || parseReturnPath(value["returnTo"], "") === null) {
    return null;
  }
  return value;
}
function parseStoredEntitlements(value) {
  if (!isRecord3(value) || !Array.isArray(value["features"]))
    return null;
  const features = [];
  for (const rawFeature of value["features"]) {
    const feature = parseCurrentSuiteFeatureId(rawFeature);
    if (!feature.ok || features.includes(feature.value))
      return null;
    features.push(feature.value);
  }
  if (value["kind"] === "legacy") {
    return value["claim"] === null && features.length === 0 ? { claim: null, features: [], kind: "legacy" } : null;
  }
  if (value["kind"] !== "fresh" && value["kind"] !== "stale")
    return null;
  const claim = value["claim"];
  if (!isRecord3(claim) || claim["version"] !== "suite-entitlements-v1" || claim["catalogRevision"] !== SUITE_CATALOG_REVISION || !safeInteger2(claim["observedAtMs"]) || !safeInteger2(claim["expiresAtMs"]) || !safeInteger2(claim["projectionRevision"]) || !Array.isArray(claim["features"])) {
    return null;
  }
  const claimFeatures = [];
  for (const rawFeature of claim["features"]) {
    const feature = parseCurrentSuiteFeatureId(rawFeature);
    if (!feature.ok || claimFeatures.includes(feature.value))
      return null;
    claimFeatures.push(feature.value);
  }
  if (claim["expiresAtMs"] <= claim["observedAtMs"] || value["kind"] === "fresh" && (features.length !== claimFeatures.length || features.some((feature) => !claimFeatures.includes(feature)))) {
    return null;
  }
  const parsedClaim = {
    catalogRevision: SUITE_CATALOG_REVISION,
    expiresAtMs: claim["expiresAtMs"],
    features: claimFeatures,
    observedAtMs: claim["observedAtMs"],
    projectionRevision: claim["projectionRevision"],
    version: "suite-entitlements-v1"
  };
  return value["kind"] === "fresh" ? { claim: parsedClaim, features, kind: "fresh" } : { claim: parsedClaim, features: [], kind: "stale" };
}
function parseEntitlementReceipt(value, consumer, environment, keyVersion, suiteAccountId, nowMs) {
  if (!isReceiptConsumer(consumer))
    return null;
  if (!isRecord3(value) || !isRecord3(value["entitlements"])) {
    return null;
  }
  try {
    const receipt = value;
    return validateSuiteEntitlementReceipt(receipt, nowMs) === null && receipt.product === consumer && receipt.environment === environment && receipt.keyVersion === keyVersion && receipt.suiteAccountId === suiteAccountId ? receipt : null;
  } catch {
    return null;
  }
}
function parseIdentityLinkReceiptRequest(value, consumer, environment, nowMs) {
  if (!isReceiptConsumer(consumer))
    return null;
  if (!isRecord3(value) || Object.keys(value).length !== 8 || value["product"] !== consumer || value["environment"] !== environment || !boundedString(value["challengeId"], 22, 128) || !boundedString(value["localSubject"], 1, 255) || !boundedString(value["keyVersion"], 1, 32) || !boundedString(value["proofSignature"], 43, 43) || !safeInteger2(value["issuedAtMs"]) || !safeInteger2(value["expiresAtMs"])) {
    return null;
  }
  const proof = {
    challengeId: value["challengeId"],
    environment,
    expiresAtMs: value["expiresAtMs"],
    issuedAtMs: value["issuedAtMs"],
    keyVersion: value["keyVersion"],
    localSubject: value["localSubject"],
    product: consumer
  };
  return validateProductLinkProof(proof, nowMs) === null && /^[A-Za-z0-9_-]{43}$/u.test(value["proofSignature"]) ? { ...proof, proofSignature: value["proofSignature"] } : null;
}
function parseIdentityLinkReceipt(value, proof, suiteAccountId, nowMs) {
  if (!isRecord3(value))
    return null;
  try {
    const receipt = value;
    return validateSuiteLinkReceipt(receipt, nowMs) === null && receipt.challengeId === proof.challengeId && receipt.environment === proof.environment && receipt.expiresAtMs === proof.expiresAtMs && receipt.issuedAtMs === proof.issuedAtMs && receipt.keyVersion === proof.keyVersion && receipt.localSubject === proof.localSubject && receipt.product === proof.product && receipt.suiteAccountId === suiteAccountId ? receipt : null;
  } catch {
    return null;
  }
}
function parseStoredProfile(value) {
  const profileRevision = value["profileRevision"];
  const profileComplete = value["profileComplete"];
  const rawUsername = value["username"];
  if (profileComplete === false && (profileRevision === null || profileRevision === "username-v1") && rawUsername === null) {
    return {
      profileComplete: false,
      profileRevision,
      username: null
    };
  }
  if (profileComplete !== true || profileRevision !== "username-v1") {
    return null;
  }
  const username = parseSuiteUsername(rawUsername);
  return username.ok ? {
    profileComplete: true,
    profileRevision: "username-v1",
    username: username.value
  } : null;
}
function profileFromClaims(claims) {
  if (claims.profileComplete && claims.profileRevision === "username-v1" && claims.username !== null) {
    return {
      profileComplete: true,
      profileRevision: "username-v1",
      username: claims.username
    };
  }
  return !claims.profileComplete && claims.username === null ? {
    profileComplete: false,
    profileRevision: claims.profileRevision,
    username: null
  } : null;
}
function parseSession(value, configuration, consumer, environment, receiptKeyVersion, nowMs) {
  if (!isRecord3(value) || value["version"] !== 2 || value["environment"] !== environment || value["issuer"] !== configuration.provider.issuer || !boundedString(value["accessToken"], 16, 16384) || value["audience"] !== configuration.provider.resource || !boundedString(value["subject"], 1, 255) || !/^acct_[0-9a-f]{32}$/u.test(String(value["suiteAccountId"])) || !boundedString(value["nonce"], 43, 128) || !boundedString(value["refreshToken"], 16, 2048) || !safeInteger2(value["accessTokenExpiresAtMs"]) || !safeInteger2(value["expiresAtMs"]) || value["expiresAtMs"] <= nowMs || value["expiresAtMs"] > nowMs + SESSION_TTL_MS + 30000) {
    return null;
  }
  const suiteAccountId = parseSuiteAccountId(value["suiteAccountId"]);
  const entitlements = parseStoredEntitlements(value["entitlements"]);
  const profile = parseStoredProfile(value);
  const pendingEntitlementReceipt = value["pendingEntitlementReceipt"] === null ? null : parseEntitlementReceipt(value["pendingEntitlementReceipt"], consumer, environment, receiptKeyVersion, String(value["suiteAccountId"]), nowMs);
  return entitlements === null || profile === null || !suiteAccountId.ok ? null : {
    ...value,
    entitlements,
    pendingEntitlementReceipt,
    ...profile,
    suiteAccountId: suiteAccountId.value
  };
}
function parseReturnPath(value, fallback = "/") {
  if (value === undefined || value === null || value === "")
    return fallback;
  if (typeof value !== "string" || value.length > MAX_RETURN_PATH_BYTES || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("#")) {
    return null;
  }
  let parsed;
  try {
    parsed = new URL(value, "https://return.invalid");
  } catch {
    return null;
  }
  if (parsed.origin !== "https://return.invalid" || parsed.username !== "" || parsed.password !== "" || parsed.pathname.startsWith("/api/suite-auth/")) {
    return null;
  }
  return `${parsed.pathname}${parsed.search}`;
}
function exactRequest(request, siteUrl, path, method) {
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return false;
  }
  if (request.method !== method || url.origin !== siteUrl || url.pathname !== path) {
    return false;
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== null && fetchSite.toLowerCase() !== "same-origin") {
    return false;
  }
  if (method === "POST" && request.headers.get("origin") !== siteUrl) {
    return false;
  }
  return true;
}
function exactCallbackRequest(request, siteUrl) {
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return false;
  }
  if (request.method !== "GET" || url.origin !== siteUrl || url.pathname !== "/api/suite-auth/callback") {
    return false;
  }
  const mode = request.headers.get("sec-fetch-mode");
  const destination = request.headers.get("sec-fetch-dest");
  const site = request.headers.get("sec-fetch-site");
  return (mode === null || mode.toLowerCase() === "navigate") && (destination === null || destination.toLowerCase() === "document") && (site === null || ["cross-site", "same-origin", "same-site", "none"].includes(site.toLowerCase()));
}
function jsonResponse(body, status, cookies = []) {
  const headers = new Headers({
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    pragma: "no-cache"
  });
  for (const cookie of cookies)
    headers.append("set-cookie", cookie);
  return new Response(JSON.stringify(body), { headers, status });
}
function failure(code, status, cookies = []) {
  return jsonResponse({
    error: { code, retryable: status >= 500 },
    schemaVersion: 1
  }, status, cookies);
}
async function readBoundedJson(response, maximumBytes = MAX_PROVIDER_BODY_BYTES) {
  const declared = response.headers.get("content-length");
  if (declared !== null && (!/^(?:0|[1-9]\d*)$/u.test(declared) || Number(declared) > maximumBytes)) {
    throw new Error("Provider response was too large.");
  }
  if (response.body === null)
    throw new Error("Provider response was empty.");
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const result = await reader.read();
    if (result.done)
      break;
    length += result.value.byteLength;
    if (length > maximumBytes) {
      await reader.cancel();
      throw new Error("Provider response was too large.");
    }
    chunks.push(result.value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
async function consumeBoundedBody(response, maximumBytes) {
  const declared = response.headers.get("content-length");
  if (declared !== null && (!/^(?:0|[1-9]\d*)$/u.test(declared) || Number(declared) > maximumBytes)) {
    throw new Error("Provider response was too large.");
  }
  if (response.body === null)
    return;
  const reader = response.body.getReader();
  let length = 0;
  while (true) {
    const result = await reader.read();
    if (result.done)
      return;
    length += result.value.byteLength;
    if (length > maximumBytes) {
      await reader.cancel();
      throw new Error("Provider response was too large.");
    }
  }
}
async function readBoundedRequestJson(request, maximumBytes) {
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^(?:0|[1-9]\d*)$/u.test(declared) || Number(declared) > maximumBytes)) {
    throw new Error("Request body was too large.");
  }
  if (request.body === null)
    throw new Error("Request body was empty.");
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const result = await reader.read();
    if (result.done)
      break;
    if (result.value.byteLength > maximumBytes - length) {
      await reader.cancel();
      throw new Error("Request body was too large.");
    }
    length += result.value.byteLength;
    chunks.push(result.value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
async function providerJson(url, init, fetchImplementation, timeoutMs) {
  const controller = new AbortController;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImplementation(url, {
      ...init,
      redirect: "manual",
      signal: controller.signal
    });
    if (response.status !== 200 || response.headers.has("location")) {
      throw new Error("Provider request failed.");
    }
    return await readBoundedJson(response);
  } finally {
    clearTimeout(timeout);
  }
}
function validateSuiteOidcDiscovery(value, expected) {
  if (!isRecord3(value))
    return false;
  const exact = value["issuer"] === expected.issuer && value["authorization_endpoint"] === expected.authorizationEndpoint && value["token_endpoint"] === expected.tokenEndpoint && value["jwks_uri"] === expected.jwksEndpoint && value["revocation_endpoint"] === expected.revocationEndpoint;
  const responseTypes = value["response_types_supported"];
  const grants = value["grant_types_supported"];
  const challenges = value["code_challenge_methods_supported"];
  const methods = value["token_endpoint_auth_methods_supported"];
  const algorithms = value["id_token_signing_alg_values_supported"];
  return exact && Array.isArray(responseTypes) && responseTypes.includes("code") && Array.isArray(grants) && grants.includes("authorization_code") && grants.includes("refresh_token") && Array.isArray(challenges) && challenges.includes("S256") && Array.isArray(methods) && methods.includes("none") && Array.isArray(algorithms) && algorithms.length === 1 && algorithms[0] === "ES256" && !algorithms.includes("HS256");
}
function parseTokenResponse(value, requireIdToken) {
  if (!isRecord3(value) || value["token_type"] !== "Bearer" || !boundedString(value["access_token"], 16, 16384) || !boundedString(value["refresh_token"], 16, 4096) || value["id_token"] !== undefined && !boundedString(value["id_token"], 64, 16384) || requireIdToken && !boundedString(value["id_token"], 64, 16384)) {
    return null;
  }
  return {
    accessToken: value["access_token"],
    idToken: typeof value["id_token"] === "string" ? value["id_token"] : null,
    refreshToken: value["refresh_token"],
    tokenType: "Bearer"
  };
}
function parseJwks(value) {
  if (!isRecord3(value) || !Array.isArray(value["keys"]) || value["keys"].length < 1 || value["keys"].length > 8) {
    return null;
  }
  for (const key of value["keys"]) {
    if (!isRecord3(key) || !boundedString(key["kid"], 1, 128) || key["alg"] !== undefined && key["alg"] !== "ES256" || key["kty"] !== "EC" || key["crv"] !== "P-256" || !boundedString(key["x"], 1, 256) || !boundedString(key["y"], 1, 256) || key["d"] !== undefined) {
      return null;
    }
  }
  return value;
}
async function verifiedIdToken(input) {
  const header = decodeProtectedHeader(input.idToken);
  if (!boundedString(header.kid, 1, 128) || header.alg !== "ES256") {
    return null;
  }
  const verified = await jwtVerify(input.idToken, createLocalJWKSet(input.jwks), {
    algorithms: [...ALLOWED_TOKEN_ALGORITHMS],
    audience: input.configuration.clientId,
    clockTolerance: 30,
    currentDate: new Date(input.nowMs),
    issuer: input.configuration.provider.issuer,
    maxTokenAge: "20m"
  });
  if (verified.payload["nonce"] !== input.expectedNonce || !boundedString(verified.payload.sub, 1, 255)) {
    return null;
  }
  const claims = parseSuiteJwtClaims(verified.payload);
  if (!claims.ok)
    return null;
  const profile = profileFromClaims(claims.value);
  if (profile === null)
    return null;
  return {
    profile,
    subject: String(claims.value.principal.subject),
    suiteAccountId: claims.value.suiteAccountId
  };
}
function exactAccessTokenAudience(value, provider) {
  if (!Array.isArray(value) || value.length !== 2)
    return false;
  const audiences = new Set(value);
  return audiences.size === 2 && audiences.has(provider.resource) && audiences.has(provider.userInfoAudience);
}
async function verifiedSessionFromAccessToken(input) {
  const header = decodeProtectedHeader(input.accessToken);
  if (!boundedString(header.kid, 1, 128) || header.alg !== "ES256") {
    return null;
  }
  let verifiedPayload;
  try {
    const verified = await jwtVerify(input.accessToken, createLocalJWKSet(input.jwks), {
      algorithms: [...ALLOWED_TOKEN_ALGORITHMS],
      audience: input.configuration.provider.resource,
      clockTolerance: 30,
      currentDate: new Date(input.nowMs),
      issuer: input.configuration.provider.issuer,
      maxTokenAge: "20m"
    });
    verifiedPayload = verified.payload;
  } catch {
    return null;
  }
  const result = await verifySuiteEntitlementToken(input.accessToken, {
    expectedAudience: input.configuration.provider.resource,
    expectedIssuer: input.configuration.provider.issuer,
    nowMs: input.nowMs,
    verify: () => Promise.resolve(verifiedPayload)
  });
  const profile = result.kind === "verified" ? profileFromClaims(result.claims) : null;
  const expectedProfileMatches = input.expectedProfile === undefined || (input.expectedProfile.profileComplete ? profile?.profileComplete === true && profile.username === input.expectedProfile.username : input.profileTransition === "forward" ? profile?.profileComplete === true || profile?.profileComplete === false && (input.expectedProfile.profileRevision === null || profile.profileRevision === input.expectedProfile.profileRevision) : profile?.profileComplete === false && profile.profileRevision === input.expectedProfile.profileRevision);
  if (result.kind !== "verified" || profile === null || !expectedProfileMatches || !exactAccessTokenAudience(verifiedPayload.aud, input.configuration.provider) || verifiedPayload["azp"] !== input.configuration.clientId || verifiedPayload["suite_client_id"] !== input.configuration.clientId || input.expectedSubject !== undefined && result.claims.principal.subject !== input.expectedSubject || input.expectedAccountId !== undefined && result.claims.suiteAccountId !== input.expectedAccountId) {
    return null;
  }
  return {
    accessToken: input.accessToken,
    audience: input.configuration.provider.resource,
    entitlements: result.entitlements,
    environment: input.environment,
    expiresAtMs: input.nowMs + SESSION_TTL_MS,
    accessTokenExpiresAtMs: result.claims.expiresAtSeconds * 1000,
    issuer: input.configuration.provider.issuer,
    nonce: input.nonce,
    pendingEntitlementReceipt: null,
    ...profile,
    refreshToken: input.refreshToken,
    subject: String(result.claims.principal.subject),
    suiteAccountId: result.claims.suiteAccountId,
    version: 2
  };
}
function currentView(session, nowMs) {
  if (session.accessTokenExpiresAtMs <= nowMs)
    return null;
  const entitlements = session.entitlements;
  const fresh = entitlements.kind === "fresh" && entitlements.claim.expiresAtMs > nowMs && nowMs - entitlements.claim.observedAtMs <= SUITE_ENTITLEMENT_MAX_PROVIDER_AGE_MS;
  const base = {
    entitlementReceipt: session.pendingEntitlementReceipt,
    entitlements: {
      features: fresh ? entitlements.features : [],
      kind: entitlements.kind === "legacy" ? "legacy" : fresh ? "fresh" : "stale"
    },
    suiteAccountId: session.suiteAccountId
  };
  return session.profileComplete ? {
    ...base,
    profileComplete: true,
    profileRevision: "username-v1",
    username: session.username
  } : {
    ...base,
    profileComplete: false,
    profileRevision: session.profileRevision,
    username: null
  };
}
function liveUserInfoMatchesSession(value, configuration, session, view) {
  if (!isRecord3(value))
    return false;
  const account = parseSuiteAccountId(value["suite_account_id"]);
  if (!account.ok || account.value !== session.suiteAccountId || value["suite_client_id"] !== configuration.clientId || value["sub"] !== session.subject || value["profile_complete"] !== view.profileComplete || value["profile_revision"] !== view.profileRevision) {
    return false;
  }
  if (!view.profileComplete)
    return value["username"] === null;
  const username = parseSuiteUsername(value["username"]);
  return username.ok && username.value === view.username;
}
function verifiedEmailFromUserInfo(value) {
  if (!isRecord3(value) || value["email_verified"] !== true)
    return null;
  const rawEmail = value["email"];
  if (typeof rawEmail !== "string" || rawEmail.length === 0 || rawEmail.length > 320 || rawEmail.trim() !== rawEmail || [...rawEmail].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 32 || codePoint === 127);
  }) || !/^[^@]+@[^@]+\.[^@]+$/u.test(rawEmail))
    return null;
  return rawEmail.toLocaleLowerCase("en-US");
}
function createSuiteOidcRelyingParty(options) {
  const consumer = options.consumer;
  const cookieSecret = options.cookieSecret;
  const environment = options.environment;
  const receiptKeyVersion = options.receiptKeyVersion;
  const cookieSecretBytes = new TextEncoder().encode(cookieSecret);
  if (cookieSecretBytes.byteLength < 32 || cookieSecretBytes.byteLength > 1024) {
    throw new Error("The suite OIDC cookie secret must be 32–1024 bytes.");
  }
  if (!/^[a-z0-9][a-z0-9._-]{0,31}$/u.test(receiptKeyVersion)) {
    throw new Error("The suite receipt key version was invalid.");
  }
  const registration = suiteAccountsCurrentOidcClientRegistration(consumer, environment);
  if (registration === null) {
    throw new Error("The suite consumer has no OIDC client in this environment.");
  }
  const consumerEnvironment = getSuiteAccountsCurrentConsumerEnvironment(consumer, environment);
  if (consumerEnvironment === null) {
    throw new Error("The suite consumer has no registered origin in this environment.");
  }
  const siteUrl = consumerEnvironment.siteUrl;
  const provider = suiteAccountsOidcProviderConfiguration(environment);
  const configuration = deepFreeze({
    callbackUrl: registration.callbackUrl,
    clientId: registration.clientId,
    provider,
    siteUrl
  });
  const names = cookieNames(siteUrl);
  const fetchImplementation = options.fetch ?? fetch;
  const timeoutMs = options.fetchTimeoutMs ?? FETCH_TIMEOUT_MS;
  if (!safeInteger2(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) {
    throw new Error("The suite OIDC fetch timeout must be 100–30000ms.");
  }
  const now = options.now ?? Date.now;
  const randomBytes = options.randomBytes ?? ((length) => {
    const value = new Uint8Array(length);
    crypto.getRandomValues(value);
    return value;
  });
  const key = deriveCookieKey(cookieSecret, consumer, environment);
  async function discovery() {
    const value = await providerJson(provider.discoveryEndpoint, { headers: { accept: "application/json" }, method: "GET" }, fetchImplementation, timeoutMs);
    if (!validateSuiteOidcDiscovery(value, provider)) {
      throw new Error("The OIDC provider metadata did not match the registry.");
    }
  }
  async function jwks() {
    const value = await providerJson(provider.jwksEndpoint, { headers: { accept: "application/json" }, method: "GET" }, fetchImplementation, timeoutMs);
    const parsed = parseJwks(value);
    if (parsed === null)
      throw new Error("The OIDC JWKS was invalid.");
    return parsed;
  }
  async function tokenRequest(body, requireIdToken) {
    const value = await providerJson(provider.tokenEndpoint, {
      body,
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
        origin: provider.issuer
      },
      method: "POST"
    }, fetchImplementation, timeoutMs);
    const parsed = parseTokenResponse(value, requireIdToken);
    if (parsed === null)
      throw new Error("The OIDC token response was invalid.");
    return parsed;
  }
  async function revokeRefreshToken(refreshToken) {
    const controller = new AbortController;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImplementation(provider.revocationEndpoint, {
        body: new URLSearchParams({
          client_id: configuration.clientId,
          token: refreshToken,
          token_type_hint: "refresh_token"
        }),
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
          origin: provider.issuer
        },
        method: "POST",
        redirect: "manual",
        signal: controller.signal
      });
      if (response.status !== 200 || response.headers.has("location")) {
        throw new Error("OIDC refresh-token revocation failed.");
      }
      await consumeBoundedBody(response, 1024);
    } finally {
      clearTimeout(timeout);
    }
  }
  async function entitlementReceipt(accessToken, suiteAccountId) {
    if (!isReceiptConsumer(consumer))
      return null;
    const value = await providerJson(provider.entitlementReceiptEndpoint, {
      body: JSON.stringify({
        environment,
        keyVersion: receiptKeyVersion,
        product: consumer
      }),
      headers: {
        accept: "application/json",
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json"
      },
      method: "POST"
    }, fetchImplementation, timeoutMs);
    const parsed = parseEntitlementReceipt(value, consumer, environment, receiptKeyVersion, suiteAccountId, now());
    if (parsed === null) {
      throw new Error("The suite entitlement receipt was invalid.");
    }
    return parsed;
  }
  async function requestIdentityLinkReceipt(accessToken, proof, suiteAccountId) {
    const controller = new AbortController;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImplementation(provider.identityLinkReceiptEndpoint, {
        body: JSON.stringify(proof),
        headers: {
          accept: "application/json",
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json"
        },
        method: "POST",
        redirect: "manual",
        signal: controller.signal
      });
      if (response.headers.has("location")) {
        throw new Error("Identity-link receipt endpoint redirected.");
      }
      if ([400, 401, 403, 409, 410, 413].includes(response.status)) {
        await consumeBoundedBody(response, 16384);
        return {
          kind: "rejected",
          status: response.status
        };
      }
      if (response.status !== 200) {
        throw new Error("Identity-link receipt endpoint failed.");
      }
      const value = await readBoundedJson(response, 16384);
      const receipt = parseIdentityLinkReceipt(value, proof, suiteAccountId, now());
      if (receipt === null) {
        throw new Error("Identity-link receipt was invalid.");
      }
      return { kind: "receipt", receipt };
    } finally {
      clearTimeout(timeout);
    }
  }
  async function loadSession(request) {
    const sealed = requestCookie(request, names.session);
    if (sealed === null)
      return null;
    return parseSession(await unsealCookie(sealed, await key, "session"), configuration, consumer, environment, receiptKeyVersion, now());
  }
  async function start(request) {
    if (!exactRequest(request, siteUrl, "/api/suite-auth/start", "GET")) {
      return failure("OIDC_START_REJECTED", 403);
    }
    const requestUrl = new URL(request.url);
    const returnTo = parseReturnPath(requestUrl.searchParams.get("return_to"));
    if (returnTo === null)
      return failure("OIDC_RETURN_REJECTED", 400);
    const issuedAtMs = now();
    const verifier = randomValue(48, randomBytes);
    const transaction = {
      consumer,
      environment,
      expiresAtMs: issuedAtMs + TRANSACTION_TTL_MS,
      issuedAtMs,
      nonce: randomValue(32, randomBytes),
      returnTo,
      state: randomValue(32, randomBytes),
      verifier,
      version: 1
    };
    const authorize = new URL(provider.authorizationEndpoint);
    authorize.searchParams.set("client_id", configuration.clientId);
    authorize.searchParams.set("code_challenge", await sha256Base64Url(verifier));
    authorize.searchParams.set("code_challenge_method", "S256");
    authorize.searchParams.set("nonce", transaction.nonce);
    if (suiteAccountsConsumerRequiresEmailOtp(consumer)) {
      authorize.searchParams.set("prompt", "login");
    }
    authorize.searchParams.set("redirect_uri", configuration.callbackUrl);
    authorize.searchParams.set("resource", provider.resource);
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("scope", suiteAccountsConsumerRequiresEmailOtp(consumer) ? "openid profile email offline_access" : "openid offline_access");
    authorize.searchParams.set("state", transaction.state);
    const sealed = await sealCookie(transaction, await key, "transaction", randomBytes);
    return new Response(null, {
      headers: {
        "cache-control": "no-store",
        location: authorize.href,
        "set-cookie": setCookie(names.transaction, sealed, names.secure, TRANSACTION_TTL_MS / 1000)
      },
      status: 302
    });
  }
  async function callback(request) {
    const clear = clearCookie(names.transaction, names.secure);
    if (!exactCallbackRequest(request, siteUrl)) {
      return failure("OIDC_CALLBACK_REJECTED", 403, [clear]);
    }
    const sealed = requestCookie(request, names.transaction);
    const transaction = sealed === null ? null : parseTransaction(await unsealCookie(sealed, await key, "transaction"), consumer, environment, now());
    if (transaction === null) {
      return failure("OIDC_TRANSACTION_INVALID", 400, [clear]);
    }
    const url = new URL(request.url);
    const states = url.searchParams.getAll("state");
    const codes = url.searchParams.getAll("code");
    const errors = url.searchParams.getAll("error");
    if (states.length !== 1 || states[0] !== transaction.state || errors.length > 0 || codes.length !== 1 || !boundedString(codes[0], 1, MAX_CODE_BYTES)) {
      return failure("OIDC_CALLBACK_INVALID", 400, [clear]);
    }
    try {
      await discovery();
      const tokens = await tokenRequest(new URLSearchParams({
        client_id: configuration.clientId,
        code: codes[0],
        code_verifier: transaction.verifier,
        grant_type: "authorization_code",
        redirect_uri: configuration.callbackUrl,
        resource: provider.resource
      }), true);
      if (tokens.idToken === null) {
        return failure("OIDC_TOKEN_INVALID", 502, [clear]);
      }
      const providerKeys = await jwks();
      const identity = await verifiedIdToken({
        configuration,
        expectedNonce: transaction.nonce,
        idToken: tokens.idToken,
        jwks: providerKeys,
        nowMs: now()
      });
      if (identity === null) {
        return failure("OIDC_TOKEN_INVALID", 502, [clear]);
      }
      const verifiedSession = await verifiedSessionFromAccessToken({
        accessToken: tokens.accessToken,
        configuration,
        environment,
        expectedAccountId: identity.suiteAccountId,
        expectedProfile: identity.profile,
        expectedSubject: identity.subject,
        jwks: providerKeys,
        nonce: transaction.nonce,
        nowMs: now(),
        profileTransition: "exact",
        refreshToken: tokens.refreshToken
      });
      if (verifiedSession === null) {
        return failure("OIDC_TOKEN_INVALID", 502, [clear]);
      }
      const session = {
        ...verifiedSession,
        pendingEntitlementReceipt: await entitlementReceipt(tokens.accessToken, verifiedSession.suiteAccountId)
      };
      const sessionCookie = await sealCookie(session, await key, "session", randomBytes);
      const headers = new Headers({
        "cache-control": "no-store",
        location: new URL(transaction.returnTo, siteUrl).href
      });
      headers.append("set-cookie", clear);
      headers.append("set-cookie", setCookie(names.session, sessionCookie, names.secure, SESSION_TTL_MS / 1000));
      return new Response(null, { headers, status: 302 });
    } catch {
      return failure("OIDC_UPSTREAM_FAILED", 502, [clear]);
    }
  }
  async function currentSession(request) {
    if (!exactRequest(request, siteUrl, "/api/suite-auth/session", "GET")) {
      return failure("OIDC_SESSION_REJECTED", 403);
    }
    const session = await loadSession(request);
    if (session === null) {
      return jsonResponse({ kind: "signed_out" }, 200, [
        clearCookie(names.session, names.secure)
      ]);
    }
    const nowMs = now();
    const view = currentView(session, nowMs);
    return view === null || session.accessTokenExpiresAtMs - nowMs < SUITE_OIDC_EARLY_REFRESH_WINDOW_MS ? jsonResponse({ kind: "refresh_required" }, 200) : jsonResponse({ kind: "signed_in", session: view }, 200);
  }
  async function serverSessionState(request) {
    let requestOrigin;
    try {
      requestOrigin = new URL(request.url).origin;
    } catch {
      return null;
    }
    const fetchSite = request.headers.get("sec-fetch-site");
    if (requestOrigin !== siteUrl || fetchSite !== null && fetchSite.toLowerCase() !== "same-origin") {
      return null;
    }
    const session = await loadSession(request);
    const view = session === null ? null : currentView(session, now());
    if (session === null || view === null)
      return null;
    let verifiedEmail = null;
    if (suiteAccountsConsumerRequiresEmailOtp(consumer)) {
      let userInfo;
      try {
        userInfo = await providerJson(provider.userInfoAudience, {
          headers: {
            accept: "application/json",
            authorization: `Bearer ${session.accessToken}`
          },
          method: "GET"
        }, fetchImplementation, timeoutMs);
      } catch {
        return null;
      }
      if (!liveUserInfoMatchesSession(userInfo, configuration, session, view))
        return null;
      verifiedEmail = verifiedEmailFromUserInfo(userInfo);
    }
    return { session, verifiedEmail, view };
  }
  async function serverAccountSession(request) {
    const state = await serverSessionState(request);
    return state === null ? null : {
      accessToken: state.session.accessToken,
      accessTokenExpiresAtMs: state.session.accessTokenExpiresAtMs,
      suiteAccountId: state.view.suiteAccountId
    };
  }
  async function serverSession(request) {
    const state = await serverSessionState(request);
    return state?.view.profileComplete === true ? {
      accessToken: state.session.accessToken,
      accessTokenExpiresAtMs: state.session.accessTokenExpiresAtMs,
      suiteAccountId: state.view.suiteAccountId,
      username: state.view.username
    } : null;
  }
  async function serverVerifiedEmail(request) {
    const state = await serverSessionState(request);
    return state === null || state.verifiedEmail === null || state.view.profileComplete !== true ? null : {
      accessTokenExpiresAtMs: state.session.accessTokenExpiresAtMs,
      email: state.verifiedEmail,
      suiteAccountId: state.view.suiteAccountId,
      username: state.view.username
    };
  }
  async function acknowledgeEntitlementReceipt(request) {
    const clear = clearCookie(names.session, names.secure);
    if (!exactRequest(request, siteUrl, "/api/suite-auth/entitlements/ack", "POST")) {
      return failure("OIDC_ENTITLEMENT_ACK_REJECTED", 403);
    }
    const session = await loadSession(request);
    if (session === null) {
      return failure("OIDC_SESSION_INVALID", 401, [clear]);
    }
    let body;
    try {
      body = await readBoundedRequestJson(request, 512);
    } catch {
      return failure("OIDC_ENTITLEMENT_ACK_INVALID", 400);
    }
    if (!isRecord3(body) || Object.keys(body).length !== 1 || !boundedString(body["signature"], 43, 43) || session.pendingEntitlementReceipt?.signature !== body["signature"]) {
      return failure("OIDC_ENTITLEMENT_ACK_INVALID", 400);
    }
    const updated = {
      ...session,
      pendingEntitlementReceipt: null
    };
    const sealed = await sealCookie(updated, await key, "session", randomBytes);
    return jsonResponse({ acknowledged: true }, 200, [
      setCookie(names.session, sealed, names.secure, SESSION_TTL_MS / 1000)
    ]);
  }
  async function linkReceipt(request) {
    if (!exactRequest(request, siteUrl, "/api/suite-auth/link-receipt", "POST")) {
      return failure("OIDC_LINK_RECEIPT_REJECTED", 403);
    }
    const session = await loadSession(request);
    if (session === null || session.accessTokenExpiresAtMs <= now()) {
      return failure("OIDC_REFRESH_REQUIRED", 401);
    }
    let value;
    try {
      value = await readBoundedRequestJson(request, 16384);
    } catch {
      return failure("OIDC_LINK_PROOF_INVALID", 400);
    }
    const proof = parseIdentityLinkReceiptRequest(value, consumer, environment, now());
    if (proof === null) {
      return failure("OIDC_LINK_PROOF_INVALID", 400);
    }
    try {
      const result = await requestIdentityLinkReceipt(session.accessToken, proof, session.suiteAccountId);
      return result.kind === "receipt" ? jsonResponse({ receipt: result.receipt }, 200) : failure("OIDC_LINK_RECEIPT_REJECTED", result.status);
    } catch {
      return failure("OIDC_LINK_RECEIPT_FAILED", 502);
    }
  }
  async function refreshSession(request) {
    const clear = clearCookie(names.session, names.secure);
    if (!exactRequest(request, siteUrl, "/api/suite-auth/refresh", "POST")) {
      return failure("OIDC_REFRESH_REJECTED", 403);
    }
    const session = await loadSession(request);
    if (session === null) {
      return failure("OIDC_SESSION_INVALID", 401, [clear]);
    }
    try {
      await discovery();
      const tokens = await tokenRequest(new URLSearchParams({
        client_id: configuration.clientId,
        grant_type: "refresh_token",
        refresh_token: session.refreshToken,
        resource: provider.resource
      }), false);
      if (tokens.refreshToken === session.refreshToken) {
        return failure("OIDC_REFRESH_ROTATION_INVALID", 502, [clear]);
      }
      const verifiedRefresh = await verifiedSessionFromAccessToken({
        accessToken: tokens.accessToken,
        configuration,
        environment,
        expectedAccountId: session.suiteAccountId,
        expectedProfile: session.profileComplete ? {
          profileComplete: true,
          profileRevision: "username-v1",
          username: session.username
        } : {
          profileComplete: false,
          profileRevision: session.profileRevision,
          username: null
        },
        expectedSubject: session.subject,
        jwks: await jwks(),
        nonce: session.nonce,
        nowMs: now(),
        profileTransition: "forward",
        refreshToken: tokens.refreshToken
      });
      if (verifiedRefresh === null) {
        return failure("OIDC_REFRESH_TOKEN_INVALID", 502, [clear]);
      }
      const refreshed = {
        ...verifiedRefresh,
        pendingEntitlementReceipt: await entitlementReceipt(tokens.accessToken, verifiedRefresh.suiteAccountId)
      };
      const view = currentView(refreshed, now());
      if (view === null) {
        return failure("OIDC_REFRESH_TOKEN_EXPIRED", 502, [clear]);
      }
      const sealed = await sealCookie(refreshed, await key, "session", randomBytes);
      return jsonResponse({ kind: "signed_in", session: view }, 200, [
        setCookie(names.session, sealed, names.secure, SESSION_TTL_MS / 1000)
      ]);
    } catch {
      return failure("OIDC_REFRESH_FAILED", 502, [clear]);
    }
  }
  async function signOut(request) {
    if (!exactRequest(request, siteUrl, "/api/suite-auth/sign-out", "POST")) {
      return failure("OIDC_SIGN_OUT_REJECTED", 403);
    }
    const session = await loadSession(request);
    if (session !== null) {
      try {
        await revokeRefreshToken(session.refreshToken);
      } catch {}
    }
    return jsonResponse({ kind: "signed_out" }, 200, [
      clearCookie(names.session, names.secure),
      clearCookie(names.transaction, names.secure)
    ]);
  }
  async function handle(request) {
    let path;
    try {
      path = new URL(request.url).pathname;
    } catch {
      return failure("OIDC_ROUTE_NOT_FOUND", 404);
    }
    if (request.method === "GET") {
      if (path === "/api/suite-auth/start")
        return await start(request);
      if (path === "/api/suite-auth/callback")
        return await callback(request);
      if (path === "/api/suite-auth/session") {
        return await currentSession(request);
      }
    }
    if (request.method === "POST") {
      if (path === "/api/suite-auth/refresh") {
        return await refreshSession(request);
      }
      if (path === "/api/suite-auth/sign-out")
        return await signOut(request);
      if (path === "/api/suite-auth/link-receipt") {
        return await linkReceipt(request);
      }
      if (path === "/api/suite-auth/entitlements/ack") {
        return await acknowledgeEntitlementReceipt(request);
      }
    }
    return failure("OIDC_ROUTE_NOT_FOUND", 404);
  }
  return Object.freeze({
    acknowledgeEntitlementReceipt,
    callback,
    configuration,
    currentSession,
    handle,
    linkReceipt,
    refreshSession,
    serverAccountSession,
    serverSession,
    serverVerifiedEmail,
    signOut,
    start
  });
}

// src/oidc-surface-server.ts
function suiteEnvironmentForConsumerOrigin(consumer, siteUrl) {
  if (siteUrl === undefined)
    return null;
  return getSuiteAccountsCurrentConsumerEnvironment(consumer, "production")?.siteUrl === siteUrl ? "production" : null;
}
function processEnvironment() {
  return {
    NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN: process.env.NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    SUITE_IDENTITY_RECEIPT_KEY_VERSION: process.env.SUITE_IDENTITY_RECEIPT_KEY_VERSION,
    SUITE_OIDC_COOKIE_SECRET: process.env.SUITE_OIDC_COOKIE_SECRET
  };
}
function createSurfaceSuiteRelyingParty(consumer, injectedEnvironment = processEnvironment()) {
  const environment = suiteEnvironmentForConsumerOrigin(consumer, injectedEnvironment.NEXT_PUBLIC_SITE_URL);
  const cookieSecret = injectedEnvironment.SUITE_OIDC_COOKIE_SECRET;
  const receiptKeyVersion = isSuiteAccountsLinkedOidcConsumerId(consumer) ? injectedEnvironment.SUITE_IDENTITY_RECEIPT_KEY_VERSION : "identity-v1";
  if (injectedEnvironment.NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN !== undefined || environment === null || cookieSecret === undefined || receiptKeyVersion === undefined) {
    return null;
  }
  try {
    return createSuiteOidcRelyingParty({
      consumer,
      cookieSecret,
      environment,
      receiptKeyVersion
    });
  } catch {
    return null;
  }
}
function unavailable() {
  return Response.json({
    error: {
      code: "SUITE_OIDC_UNAVAILABLE",
      message: "Suite sign-in is not configured for this surface.",
      retryable: false
    },
    schemaVersion: 1
  }, { headers: { "cache-control": "no-store" }, status: 503 });
}
function suiteOidcSurfaceHandler(consumer, options = {}) {
  return async (request) => {
    if (process.env.NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN !== undefined) {
      return unavailable();
    }
    const relyingParty = options.createRelyingParty?.(request) ?? createSurfaceSuiteRelyingParty(consumer);
    return relyingParty === null ? unavailable() : await relyingParty.handle(request);
  };
}
async function suiteOidcSurfaceServerSession(consumer, request, injectedEnvironment) {
  const relyingParty = createSurfaceSuiteRelyingParty(consumer, injectedEnvironment);
  return relyingParty === null ? null : await relyingParty.serverSession(request);
}
async function suiteOidcSurfaceServerAccountSession(consumer, request, injectedEnvironment) {
  const relyingParty = createSurfaceSuiteRelyingParty(consumer, injectedEnvironment);
  return relyingParty === null ? null : await relyingParty.serverAccountSession(request);
}
async function suiteOidcSurfaceServerVerifiedEmail(consumer, request, injectedEnvironment, options = {}) {
  const relyingParty = options.createRelyingParty?.(request) ?? createSurfaceSuiteRelyingParty(consumer, injectedEnvironment);
  return relyingParty === null ? null : await relyingParty.serverVerifiedEmail(request);
}
export {
  suiteOidcSurfaceServerVerifiedEmail,
  suiteOidcSurfaceServerSession,
  suiteOidcSurfaceServerAccountSession,
  suiteOidcSurfaceHandler,
  suiteEnvironmentForConsumerOrigin,
  createSurfaceSuiteRelyingParty
};
