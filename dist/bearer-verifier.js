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

// src/bearer-verifier.ts
import {
  base64url,
  createLocalJWKSet,
  decodeProtectedHeader,
  importJWK,
  jwtVerify
} from "jose";
var MAX_TOKEN_BYTES = 16384;
var MAX_JWKS_BYTES = 64 * 1024;
var DEFAULT_FETCH_TIMEOUT_MS = 5000;
var DEFAULT_JWKS_CACHE_TTL_MS = 5 * 60000;
var DEFAULT_JWKS_REFRESH_COOLDOWN_MS = 60000;
var ALGORITHMS = ["ES256"];
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function safeInteger(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function containsAsciiControl2(value) {
  for (let index = 0;index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127)
      return true;
  }
  return false;
}
function boundedString(value, minimum, maximum) {
  return typeof value === "string" && value.length >= minimum && value.length <= maximum && value.trim() === value && !containsAsciiControl2(value);
}
function compactJwt(value) {
  return value.length >= 32 && value.length <= MAX_TOKEN_BYTES && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u.test(value);
}
function parseSuiteBearerAuthorization(value) {
  if (typeof value !== "string" || value.length > "Bearer ".length + MAX_TOKEN_BYTES || !value.startsWith("Bearer ") || value.includes(",")) {
    return { error: "invalid-authorization", ok: false };
  }
  const token = value.slice("Bearer ".length);
  return compactJwt(token) ? { ok: true, value: token } : { error: "invalid-authorization", ok: false };
}
function canonicalP256Coordinate(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43}$/u.test(value)) {
    return false;
  }
  try {
    const decoded = base64url.decode(value);
    return decoded.byteLength === 32 && base64url.encode(decoded) === value;
  } catch {
    return false;
  }
}
async function validJwks(value) {
  if (!isRecord3(value) || !Array.isArray(value["keys"]) || value["keys"].length < 1 || value["keys"].length > 8) {
    return null;
  }
  const kids = new Set;
  for (const key of value["keys"]) {
    if (!isRecord3(key) || !boundedString(key["kid"], 1, 128) || kids.has(key["kid"]) || key["kty"] !== "EC" || key["crv"] !== "P-256" || key["alg"] !== undefined && key["alg"] !== "ES256" || key["use"] !== undefined && key["use"] !== "sig" || !canonicalP256Coordinate(key["x"]) || !canonicalP256Coordinate(key["y"]) || key["d"] !== undefined) {
      return null;
    }
    try {
      const imported = await importJWK(key, "ES256");
      if (imported instanceof Uint8Array || imported.type !== "public" || !imported.usages.includes("verify")) {
        return null;
      }
    } catch {
      return null;
    }
    kids.add(key["kid"]);
  }
  return value;
}
async function readBoundedJson(response, maximumBytes) {
  const declared = response.headers.get("content-length");
  if (declared !== null && (!/^(?:0|[1-9]\d*)$/u.test(declared) || Number(declared) > maximumBytes)) {
    throw new Error("The JWKS response was too large.");
  }
  if (response.body === null)
    throw new Error("The JWKS response was empty.");
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const result = await reader.read();
    if (result.done)
      break;
    if (result.value.byteLength > maximumBytes - length) {
      await reader.cancel();
      throw new Error("The JWKS response was too large.");
    }
    chunks.push(result.value);
    length += result.value.byteLength;
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
function exactAudience(value, audiences) {
  if (!Array.isArray(value) || value.length !== 2)
    return false;
  const actual = new Set(value);
  return actual.size === 2 && actual.has(audiences[0]) && actual.has(audiences[1]);
}
function jwtFailureReason(error) {
  if (!isRecord3(error))
    return "signature";
  const code = error["code"];
  if (code === "ERR_JWT_EXPIRED")
    return "time";
  if (code === "ERR_JWT_CLAIM_VALIDATION_FAILED" && (error["claim"] === "exp" || error["claim"] === "iat" || error["claim"] === "nbf")) {
    return "time";
  }
  return "signature";
}
function missingJwksKey(error) {
  return isRecord3(error) && error["code"] === "ERR_JWKS_NO_MATCHING_KEY";
}
function createSuiteBearerVerifier(options) {
  const client = suiteAccountsOidcClientRegistration(options.consumer, options.environment);
  if (client === null) {
    throw new Error("The suite bearer consumer has no OAuth client.");
  }
  const provider = suiteAccountsOidcProviderConfiguration(options.environment);
  const configuration = deepFreeze({
    audiences: [provider.resource, provider.userInfoAudience],
    clientId: client.clientId,
    issuer: provider.issuer,
    jwksEndpoint: provider.jwksEndpoint
  });
  const fetchImplementation = options.fetch ?? fetch;
  const fetchTimeoutMs = options.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const jwksCacheTtlMs = options.jwksCacheTtlMs ?? DEFAULT_JWKS_CACHE_TTL_MS;
  const jwksRefreshCooldownMs = options.jwksRefreshCooldownMs ?? DEFAULT_JWKS_REFRESH_COOLDOWN_MS;
  if (!safeInteger(fetchTimeoutMs) || fetchTimeoutMs < 100 || fetchTimeoutMs > 30000) {
    throw new Error("The suite JWKS fetch timeout must be 100–30000ms.");
  }
  if (!safeInteger(jwksCacheTtlMs) || jwksCacheTtlMs < 1000 || jwksCacheTtlMs > 24 * 60 * 60000) {
    throw new Error("The suite JWKS cache TTL must be 1000–86400000ms.");
  }
  if (!safeInteger(jwksRefreshCooldownMs) || jwksRefreshCooldownMs < 1000 || jwksRefreshCooldownMs > 5 * 60000) {
    throw new Error("The suite JWKS refresh cooldown must be 1000–300000ms.");
  }
  const now = options.now ?? Date.now;
  let cache = null;
  let lastForcedRefreshAtMs = null;
  let pending = null;
  async function fetchJwks() {
    const controller = new AbortController;
    const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);
    try {
      const response = await fetchImplementation(configuration.jwksEndpoint, {
        cache: "no-store",
        headers: { accept: "application/json" },
        method: "GET",
        redirect: "manual",
        signal: controller.signal
      });
      if (response.status !== 200 || response.headers.has("location") || response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") {
        throw new Error("The suite JWKS endpoint was unavailable.");
      }
      const value = await validJwks(await readBoundedJson(response, MAX_JWKS_BYTES));
      if (value === null)
        throw new Error("The suite JWKS was invalid.");
      cache = {
        expiresAtMs: now() + jwksCacheTtlMs,
        value
      };
      return value;
    } finally {
      clearTimeout(timeout);
    }
  }
  async function jwks(forceRefresh = false) {
    const nowMs = now();
    if (!forceRefresh && cache !== null && cache.expiresAtMs > nowMs) {
      return cache.value;
    }
    if (pending !== null)
      return await pending;
    pending = fetchJwks();
    try {
      return await pending;
    } finally {
      pending = null;
    }
  }
  async function verifySignature(token, nowMs, forceRefresh = false) {
    let keySet;
    try {
      keySet = await jwks(forceRefresh);
    } catch {
      return { kind: "unavailable", reason: "jwks" };
    }
    try {
      const result = await jwtVerify(token, createLocalJWKSet(keySet), {
        algorithms: [...ALGORITHMS],
        clockTolerance: 30,
        currentDate: new Date(nowMs),
        maxTokenAge: "20m"
      });
      return { kind: "verified", payload: result.payload };
    } catch (error) {
      if (!forceRefresh && missingJwksKey(error)) {
        if (lastForcedRefreshAtMs !== null && nowMs - lastForcedRefreshAtMs < jwksRefreshCooldownMs) {
          return { kind: "invalid", reason: "signature" };
        }
        lastForcedRefreshAtMs = nowMs;
        return await verifySignature(token, nowMs, true);
      }
      return { kind: "invalid", reason: jwtFailureReason(error) };
    }
  }
  async function verify(bearerToken) {
    if (!compactJwt(bearerToken)) {
      return { kind: "invalid", reason: "authorization" };
    }
    let header;
    try {
      header = decodeProtectedHeader(bearerToken);
    } catch {
      return { kind: "invalid", reason: "authorization" };
    }
    if (header.alg !== "ES256" || !boundedString(header.kid, 1, 128)) {
      return { kind: "invalid", reason: "signature" };
    }
    const nowMs = now();
    if (!safeInteger(nowMs))
      return { kind: "invalid", reason: "time" };
    const signed = await verifySignature(bearerToken, nowMs);
    if (signed.kind !== "verified")
      return signed;
    const parsed = await verifySuiteEntitlementToken(bearerToken, {
      expectedAudience: provider.resource,
      expectedIssuer: provider.issuer,
      nowMs,
      verify: () => Promise.resolve(signed.payload)
    });
    if (parsed.kind !== "verified") {
      return {
        kind: "invalid",
        reason: parsed.reason === "issuer" || parsed.reason === "signature" ? "claims" : parsed.reason
      };
    }
    if (!exactAudience(signed.payload.aud, configuration.audiences)) {
      return { kind: "invalid", reason: "audience" };
    }
    if (signed.payload["azp"] !== configuration.clientId || signed.payload["suite_client_id"] !== configuration.clientId) {
      return { kind: "invalid", reason: "client" };
    }
    return {
      claims: parsed.claims,
      entitlements: parsed.entitlements,
      kind: "verified"
    };
  }
  return Object.freeze({ configuration, verify });
}
export {
  parseSuiteBearerAuthorization,
  createSuiteBearerVerifier
};
