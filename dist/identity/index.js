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
var SUITE_ACCOUNTS_REGISTERED_CONSUMER_IDS = deepFreeze([
  "accounts",
  "act60",
  "elders",
  "soundfish",
  "oh-computer",
  "draw-money",
  "sponge"
]);
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
  "hra",
  "sponge",
  "subcounter",
  "slackorgs",
  "peopleblade",
  "aicharts"
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
  hra: currentOidcSite("hra", "Oompa", "https://oompa.app"),
  sponge: currentOidcSite("sponge", "Sponge", SUITE_ACCOUNTS_CURRENT_ORIGIN_OVERRIDES.sponge.production.siteUrl),
  subcounter: currentOidcSite("subcounter", "Subcounter", "https://subcounter.com"),
  slackorgs: currentOidcSite("slackorgs", "BigDataDepot", "https://bigdatadepot.com"),
  peopleblade: currentOidcSite("peopleblade", "PeopleBlade", "https://peopleblade.com"),
  aicharts: currentOidcSite("aicharts", "AI Charts", "https://aicharts.io")
});
var SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS = deepFreeze([
  "accounts",
  "act60",
  "elders",
  "soundfish",
  "oh-computer",
  "sponge"
]);
var SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS = deepFreeze(SUITE_ACCOUNTS_REGISTERED_CONSUMER_IDS.filter((consumer) => SUITE_ACCOUNTS_CONSUMERS[consumer].auth.kind === "oidc-rp"));
function suiteAccountsConsumerRequiresEmailOtp(consumer) {
  return SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS.includes(consumer);
}
var SUITE_ACCOUNTS_LINKED_OIDC_CONSUMER_IDS = deepFreeze([
  "soundfish"
]);
var SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS = deepFreeze(SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS.filter((consumer) => SUITE_ACCOUNTS_CURRENT_CONSUMERS[consumer].auth.kind === "oidc-rp"));
var SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS = deepFreeze([
  "soundfish",
  "hra",
  "peopleblade"
]);
function isSuiteAccountsConsumerId(value) {
  return typeof value === "string" && SUITE_CONSUMER_IDS.includes(value);
}
function isSuiteAccountsRegisteredConsumerId(value) {
  return typeof value === "string" && SUITE_ACCOUNTS_REGISTERED_CONSUMER_IDS.includes(value);
}
function isSuiteAccountsOidcConsumerId(value) {
  return isSuiteAccountsRegisteredConsumerId(value) && SUITE_ACCOUNTS_CONSUMERS[value].auth.kind === "oidc-rp";
}
function isSuiteAccountsLinkedOidcConsumerId(value) {
  return SUITE_ACCOUNTS_LINKED_OIDC_CONSUMER_IDS.includes(value);
}
function isSuiteAccountsOAuthConsumerId(value) {
  return isSuiteAccountsRegisteredConsumerId(value) && SUITE_ACCOUNTS_CONSUMERS[value].auth.kind === "oidc-rp";
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
  if (!isSuiteAccountsRegisteredConsumerId(consumer))
    return null;
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
// src/identity/links.ts
import { ok as ok6 } from "@hraness/result";

// src/identity/principals.ts
import { err as err5, isRecord, ok as ok5 } from "@hraness/result";

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
  "hra",
  "peopleblade",
  "crclte",
  "pub"
]);
var LEGACY_SUITE_PRODUCT_IDS = deepFreeze([
  "oprte",
  "kitchen"
]);
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
    case "hra":
    case "peopleblade":
    case "crclte":
    case "pub":
      return ok5(value);
    case "oprte":
    case "kitchen":
      return ok5("hra");
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

// src/identity/links.ts
var IDENTITY_LINK_PROOF_VERSION = "suite-product-link-proof-v1";
var IDENTITY_LINK_RECEIPT_VERSION = "suite-link-receipt-v1";
var SUITE_ENTITLEMENTS_CLAIM_VERSION = "suite-entitlements-v1";
var SUITE_ENTITLEMENT_RECEIPT_VERSION = "suite-entitlement-receipt-v1";
var IDENTITY_LINK_MAX_TTL_MS = 5 * 60000;
var SUITE_ENTITLEMENT_RECEIPT_MAX_TTL_MS = 5 * 60000;
var IDENTITY_LINK_CLOCK_SKEW_MS = 30000;
var SUITE_LINK_PRODUCTS = deepFreeze([
  "soundfish",
  "hra",
  "peopleblade",
  "crclte",
  "pub"
]);
var LEGACY_SUITE_LINK_PRODUCTS = deepFreeze([
  "oprte",
  "kitchen"
]);
function parseSuiteLinkProduct(value) {
  const parsed = parseSuiteProduct(value);
  if (!parsed.ok)
    return parsed;
  switch (parsed.value) {
    case "soundfish":
    case "hra":
    case "peopleblade":
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
  return input.version === SUITE_ENTITLEMENTS_CLAIM_VERSION && input.catalogRevision === SUITE_CATALOG_REVISION && safeInteger(input.observedAtMs) && safeInteger(input.expiresAtMs) && input.expiresAtMs > input.observedAtMs && safeInteger(input.projectionRevision) && Array.isArray(input.features) && exactCurrentFeatures(input.features);
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
// src/identity/profiles.ts
import { err as err6, isRecord as isRecord2, ok as ok7 } from "@hraness/result";
var SUITE_PROFILE_NAME_MAX_LENGTH = 120;
var SUITE_PROFILE_BIO_MAX_LENGTH = 1000;
var SUITE_PROFILE_URL_MAX_LENGTH = 2048;
var SUITE_COMMUNITY_APPLICATION_STATUSES = deepFreeze([
  "submitted",
  "accepted",
  "declined",
  "withdrawn"
]);
var PROFILE_LINK_KEYS = [
  "bluesky",
  "instagram",
  "linkedin",
  "telegram",
  "website",
  "x"
];
function exactKeys(value, expected) {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length && actual.every((key, index) => key === sortedExpected[index]);
}
function hasInvalidSingleLineControl(value) {
  for (let index = 0;index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code >= 127 && code <= 159)
      return true;
  }
  return false;
}
function hasInvalidBioControl(value) {
  for (let index = 0;index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 && code !== 10 || code >= 127 && code <= 159) {
      return true;
    }
  }
  return false;
}
function normalizedName(value) {
  if (typeof value !== "string") {
    return err6({ field: "name", reason: "required" });
  }
  if (hasInvalidSingleLineControl(value)) {
    return err6({ field: "name", reason: "invalid" });
  }
  const name = value.trim().replace(/\s+/gu, " ");
  if (name.length === 0) {
    return err6({ field: "name", reason: "required" });
  }
  return name.length <= SUITE_PROFILE_NAME_MAX_LENGTH ? ok7(name) : err6({ field: "name", reason: "too_long" });
}
function normalizedProfileViewName(value) {
  if (typeof value !== "string") {
    return err6({ field: "name", reason: "invalid" });
  }
  if (hasInvalidSingleLineControl(value)) {
    return err6({ field: "name", reason: "invalid" });
  }
  const name = value.trim().replace(/\s+/gu, " ");
  return name.length <= SUITE_PROFILE_NAME_MAX_LENGTH ? ok7(name) : err6({ field: "name", reason: "too_long" });
}
function normalizedBio(value) {
  if (typeof value !== "string") {
    return err6({ field: "bio", reason: "invalid" });
  }
  const normalizedNewlines = value.replaceAll(`\r
`, `
`).replaceAll("\r", `
`);
  if (hasInvalidBioControl(normalizedNewlines)) {
    return err6({ field: "bio", reason: "invalid" });
  }
  const bio = normalizedNewlines.trim();
  return bio.length <= SUITE_PROFILE_BIO_MAX_LENGTH ? ok7(bio) : err6({ field: "bio", reason: "too_long" });
}
function parsedHttpsUrl(value, options) {
  if (value.length === 0 || value.length > SUITE_PROFILE_URL_MAX_LENGTH || hasInvalidSingleLineControl(value) || value.trim() !== value) {
    return null;
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.hash !== "" || url.port !== "" || !options.allowQuery && url.search !== "" || options.hosts !== undefined && !options.hosts.has(url.hostname.toLowerCase())) {
    return null;
  }
  return url;
}
function simpleHandle(value, pattern) {
  const withoutAt = value.startsWith("@") ? value.slice(1) : value;
  return pattern.test(withoutAt) ? withoutAt.toLowerCase() : null;
}
function exactPathSegments(url) {
  const segments = url.pathname.split("/").filter(Boolean);
  return url.pathname === `/${segments.join("/")}` || url.pathname === `/${segments.join("/")}/` ? segments : null;
}
var X_HOSTS = new Set(["x.com", "www.x.com", "twitter.com", "www.twitter.com"]);
var INSTAGRAM_HOSTS = new Set(["instagram.com", "www.instagram.com"]);
var TELEGRAM_HOSTS = new Set([
  "t.me",
  "www.t.me",
  "telegram.me",
  "www.telegram.me"
]);
var BLUESKY_HOSTS = new Set(["bsky.app", "www.bsky.app"]);
var LINKEDIN_HOSTS = new Set(["linkedin.com", "www.linkedin.com"]);
function normalizedX(value) {
  const enteredHandle = simpleHandle(value, /^[A-Za-z0-9_]{1,15}$/u);
  if (enteredHandle !== null)
    return `https://x.com/${enteredHandle}`;
  const url = parsedHttpsUrl(value, { allowQuery: false, hosts: X_HOSTS });
  const segments = url === null ? null : exactPathSegments(url);
  const handle = segments?.length === 1 ? simpleHandle(segments[0], /^[A-Za-z0-9_]{1,15}$/u) : null;
  return handle === null ? null : `https://x.com/${handle}`;
}
function normalizedInstagram(value) {
  const pattern = /^(?!.*\.\.)[A-Za-z0-9](?:[A-Za-z0-9._]{0,28}[A-Za-z0-9_])?$/u;
  const enteredHandle = simpleHandle(value, pattern);
  if (enteredHandle !== null) {
    return `https://www.instagram.com/${enteredHandle}`;
  }
  const url = parsedHttpsUrl(value, {
    allowQuery: false,
    hosts: INSTAGRAM_HOSTS
  });
  const segments = url === null ? null : exactPathSegments(url);
  const handle = segments?.length === 1 ? simpleHandle(segments[0], pattern) : null;
  return handle === null ? null : `https://www.instagram.com/${handle}`;
}
function normalizedTelegram(value) {
  const enteredHandle = simpleHandle(value, /^[A-Za-z][A-Za-z0-9_]{4,31}$/u);
  if (enteredHandle !== null)
    return `https://t.me/${enteredHandle}`;
  const url = parsedHttpsUrl(value, {
    allowQuery: false,
    hosts: TELEGRAM_HOSTS
  });
  const segments = url === null ? null : exactPathSegments(url);
  const handle = segments?.length === 1 ? simpleHandle(segments[0], /^[A-Za-z][A-Za-z0-9_]{4,31}$/u) : null;
  return handle === null ? null : `https://t.me/${handle}`;
}
function validBlueskyHandle(value) {
  if (value.length < 3 || value.length > 253 || !value.includes(".") || value.startsWith(".") || value.endsWith(".")) {
    return false;
  }
  const labels = value.split(".");
  return labels.every((label) => label.length >= 1 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(label));
}
function normalizedBluesky(value) {
  const withoutAt = value.startsWith("@") ? value.slice(1) : value;
  const enteredHandle = withoutAt.toLowerCase();
  if (validBlueskyHandle(enteredHandle)) {
    return `https://bsky.app/profile/${enteredHandle}`;
  }
  const url = parsedHttpsUrl(value, {
    allowQuery: false,
    hosts: BLUESKY_HOSTS
  });
  const segments = url === null ? null : exactPathSegments(url);
  const handle = segments?.length === 2 && segments[0] === "profile" ? segments[1].toLowerCase() : null;
  return handle !== null && validBlueskyHandle(handle) ? `https://bsky.app/profile/${handle}` : null;
}
function normalizedLinkedIn(value) {
  const url = parsedHttpsUrl(value, {
    allowQuery: false,
    hosts: LINKEDIN_HOSTS
  });
  const segments = url === null ? null : exactPathSegments(url);
  if (segments?.length !== 2 || segments[0] !== "in" || !/^[A-Za-z0-9][A-Za-z0-9-]{1,99}$/u.test(segments[1])) {
    return null;
  }
  return `https://www.linkedin.com/in/${segments[1].toLowerCase()}`;
}
function normalizedWebsite(value) {
  const url = parsedHttpsUrl(value, { allowQuery: true });
  return url === null ? null : url.href;
}
function normalizeSuiteProfileLink(key, value) {
  if (value === null)
    return ok7(null);
  if (typeof value !== "string") {
    return err6({ field: key, reason: "invalid" });
  }
  const trimmed = value.trim();
  if (trimmed.length === 0)
    return ok7(null);
  const normalized = (() => {
    switch (key) {
      case "x":
        return normalizedX(trimmed);
      case "linkedin":
        return normalizedLinkedIn(trimmed);
      case "bluesky":
        return normalizedBluesky(trimmed);
      case "instagram":
        return normalizedInstagram(trimmed);
      case "telegram":
        return normalizedTelegram(trimmed);
      case "website":
        return normalizedWebsite(trimmed);
    }
  })();
  return normalized === null ? err6({ field: key, reason: "invalid" }) : ok7(normalized);
}
function parsedLinks(value, canonicalOnly) {
  if (!isRecord2(value) || !exactKeys(value, PROFILE_LINK_KEYS)) {
    return err6({ field: "profile", reason: "invalid" });
  }
  const links = {
    bluesky: null,
    instagram: null,
    linkedin: null,
    telegram: null,
    website: null,
    x: null
  };
  for (const key of PROFILE_LINK_KEYS) {
    const parsed = normalizeSuiteProfileLink(key, value[key]);
    if (!parsed.ok)
      return parsed;
    if (canonicalOnly && parsed.value !== value[key]) {
      return err6({ field: key, reason: "invalid" });
    }
    links[key] = parsed.value;
  }
  return ok7(links);
}
function nonnegativeInteger(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
function parsedEmail(value) {
  return typeof value === "string" && value.length <= 320 && value.trim() === value && !hasInvalidSingleLineControl(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value) ? value : null;
}
function parseSuiteProfileUpdateRequest(value) {
  if (!isRecord2(value) || !exactKeys(value, ["bio", "expectedRevision", "links", "name"])) {
    return err6({ field: "profile", reason: "invalid" });
  }
  const name = normalizedName(value["name"]);
  if (!name.ok)
    return name;
  const bio = normalizedBio(value["bio"]);
  if (!bio.ok)
    return bio;
  const links = parsedLinks(value["links"], false);
  if (!links.ok)
    return links;
  const expectedRevision = nonnegativeInteger(value["expectedRevision"]);
  if (expectedRevision === null) {
    return err6({ field: "expectedRevision", reason: "invalid" });
  }
  return ok7({
    bio: bio.value,
    expectedRevision,
    links: links.value,
    name: name.value
  });
}
function parseSuiteProfileView(value) {
  if (!isRecord2(value) || !exactKeys(value, ["bio", "email", "links", "name", "revision"])) {
    return err6({ field: "profile", reason: "invalid" });
  }
  const name = normalizedProfileViewName(value["name"]);
  const bio = normalizedBio(value["bio"]);
  const links = parsedLinks(value["links"], true);
  const email = parsedEmail(value["email"]);
  const revision = nonnegativeInteger(value["revision"]);
  if (!name.ok)
    return name;
  if (!bio.ok)
    return bio;
  if (!links.ok)
    return links;
  if (email === null)
    return err6({ field: "email", reason: "invalid" });
  if (revision === null) {
    return err6({ field: "expectedRevision", reason: "invalid" });
  }
  if (name.value !== value["name"] || bio.value !== value["bio"]) {
    return err6({ field: "profile", reason: "invalid" });
  }
  return ok7({
    bio: bio.value,
    email,
    links: links.value,
    name: name.value,
    revision
  });
}
function isApplicationStatus(value) {
  return typeof value === "string" && SUITE_COMMUNITY_APPLICATION_STATUSES.includes(value);
}
function parsedApplication(value) {
  if (value === null)
    return ok7(null);
  if (!isRecord2(value) || !exactKeys(value, [
    "community",
    "status",
    "submittedAtMs",
    "updatedAtMs"
  ]) || value["community"] !== "oh-computer" || !isApplicationStatus(value["status"])) {
    return err6({ field: "application", reason: "invalid" });
  }
  const submittedAtMs = nonnegativeInteger(value["submittedAtMs"]);
  const updatedAtMs = nonnegativeInteger(value["updatedAtMs"]);
  if (submittedAtMs === null || updatedAtMs === null || updatedAtMs < submittedAtMs) {
    return err6({ field: "application", reason: "invalid" });
  }
  return ok7({
    community: "oh-computer",
    status: value["status"],
    submittedAtMs,
    updatedAtMs
  });
}
function parseSuiteCommunityProfileView(value) {
  if (!isRecord2(value) || !exactKeys(value, ["application", "profile"])) {
    return err6({ field: "profile", reason: "invalid" });
  }
  const application = parsedApplication(value["application"]);
  if (!application.ok)
    return application;
  const profile = parseSuiteProfileView(value["profile"]);
  return profile.ok ? ok7({ application: application.value, profile: profile.value }) : profile;
}
// src/identity/profiles-v2.ts
import { err as err7, ok as ok8 } from "@hraness/result";
var LINK_KEYS = [
  "bluesky",
  "github",
  "instagram",
  "linkedin",
  "telegram",
  "website",
  "x"
];
var PUBLIC_KEYS = [
  "schemaVersion",
  "accountId",
  "username",
  "name",
  "bio",
  "links",
  "avatarRef",
  "revision"
];
var EDITOR_KEYS = [...PUBLIC_KEYS, "publication"];
var UPDATE_KEYS = [
  "schemaVersion",
  "expectedRevision",
  "name",
  "bio",
  "links",
  "avatarRef",
  "publication"
];
var MAX_INPUT_TEXT_LENGTH = 32768;
var AVATAR_PATTERN = /^avref_(?!0{64}$)[0-9a-f]{64}$/u;
function issue(field = "profile", reason = "invalid") {
  return deepFreeze(err7({ field, reason }));
}
function success(value) {
  return deepFreeze(ok8(value));
}
function snapshot(value, keys) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null)
    return null;
  const actual = Reflect.ownKeys(value);
  if (actual.length !== keys.length)
    return null;
  const copy = Object.create(null);
  for (const key of actual) {
    if (typeof key !== "string" || !keys.includes(key))
      return null;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      return null;
    }
    const field = descriptor.value;
    copy[key] = field;
  }
  return copy;
}
function nonnegativeInteger2(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function parseSuiteAvatarRef(value) {
  return typeof value === "string" && value.length === 70 && AVATAR_PATTERN.test(value) ? success(value) : issue("avatarRef");
}
function optionalAvatar(value) {
  return value === null ? success(null) : parseSuiteAvatarRef(value);
}
function legacyIssue(error) {
  const field = error.field === "application" || error.field === "email" ? "profile" : error.field;
  return issue(field, error.reason);
}
function normalizeSuiteProfileLinkV2(key, value) {
  if (typeof key !== "string" || !LINK_KEYS.some((candidate) => candidate === key)) {
    return issue();
  }
  const field = key;
  if (value !== null && typeof value !== "string")
    return issue(field);
  if (typeof value === "string" && value.length > SUITE_PROFILE_URL_MAX_LENGTH) {
    return issue(field, "too_long");
  }
  if (field === "github") {
    if (value === null || value === "")
      return success(null);
    if (/[^\x21-\x7e]/u.test(value))
      return issue("github");
    const match = /^https:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_-]{1,100})\/?$/iu.exec(value);
    return match === null || match[0] !== value ? issue("github") : success(`https://github.com/${match[1].toLowerCase()}`);
  }
  const parsed = normalizeSuiteProfileLink(field, value);
  if (!parsed.ok)
    return legacyIssue(parsed.error);
  if (parsed.value !== null && parsed.value.length > SUITE_PROFILE_URL_MAX_LENGTH) {
    return issue(field, "too_long");
  }
  return success(parsed.value);
}
function parsedContent(value, canonical) {
  for (const field of ["name", "bio"]) {
    if (typeof value[field] === "string" && value[field].length > MAX_INPUT_TEXT_LENGTH) {
      return issue(field, "too_long");
    }
  }
  const inputLinks = snapshot(value["links"], LINK_KEYS);
  if (inputLinks === null)
    return issue();
  const links = {
    bluesky: null,
    github: null,
    instagram: null,
    linkedin: null,
    telegram: null,
    website: null,
    x: null
  };
  for (const key of LINK_KEYS) {
    const result = normalizeSuiteProfileLinkV2(key, inputLinks[key]);
    if (!result.ok)
      return result;
    if (canonical && result.value !== inputLinks[key])
      return issue(key);
    links[key] = result.value;
  }
  const parsed = parseSuiteProfileUpdateRequest({
    expectedRevision: 0,
    name: value["name"],
    bio: value["bio"],
    links: {
      bluesky: links.bluesky,
      instagram: links.instagram,
      linkedin: links.linkedin,
      telegram: links.telegram,
      website: links.website,
      x: links.x
    }
  });
  if (!parsed.ok)
    return legacyIssue(parsed.error);
  if (canonical && (parsed.value.name !== value["name"] || parsed.value.bio !== value["bio"])) {
    return issue();
  }
  return success({ name: parsed.value.name, bio: parsed.value.bio, links });
}
function parseView(input, editor) {
  try {
    const value = snapshot(input, editor ? EDITOR_KEYS : PUBLIC_KEYS);
    if (value === null)
      return issue();
    if (value["schemaVersion"] !== 2)
      return issue("schemaVersion");
    const accountId = parseSuiteAccountId(value["accountId"]);
    if (!accountId.ok)
      return issue("accountId");
    const username = editor && value["username"] === null ? success(null) : parseSuiteUsername(value["username"]);
    if (!username.ok)
      return issue("username");
    const revision = value["revision"];
    if (!nonnegativeInteger2(revision) || !editor && revision === 0)
      return issue("revision");
    const avatarRef = optionalAvatar(value["avatarRef"]);
    if (!avatarRef.ok)
      return avatarRef;
    const publication = value["publication"];
    if (editor && publication !== "private" && publication !== "published") {
      return issue("publication");
    }
    if (editor && publication === "published" && username.value === null)
      return issue("username");
    let content;
    if (revision === 0) {
      const links = snapshot(value["links"], LINK_KEYS);
      if (value["name"] !== "" || value["bio"] !== "" || avatarRef.value !== null || publication !== "private" || links === null || LINK_KEYS.some((key) => links[key] !== null))
        return issue();
      content = {
        name: "",
        bio: "",
        links: {
          bluesky: null,
          github: null,
          instagram: null,
          linkedin: null,
          telegram: null,
          website: null,
          x: null
        }
      };
    } else {
      const parsed = parsedContent(value, true);
      if (!parsed.ok)
        return parsed;
      content = parsed.value;
    }
    const profile = {
      schemaVersion: 2,
      accountId: accountId.value,
      ...content,
      avatarRef: avatarRef.value,
      revision
    };
    if (editor && (publication === "private" || publication === "published")) {
      return success({ ...profile, username: username.value, publication });
    }
    if (username.value === null)
      return issue("username");
    return success({ ...profile, username: username.value });
  } catch {
    return issue();
  }
}
function parseSuitePublicProfileV2(value) {
  const parsed = parseView(value, false);
  if (!parsed.ok)
    return parsed;
  if (parsed.value.username === null || isEditor(parsed.value))
    return issue();
  return success({ ...parsed.value, username: parsed.value.username });
}
function parseSuiteProfileEditorV2(value) {
  const parsed = parseView(value, true);
  if (!parsed.ok)
    return parsed;
  return isEditor(parsed.value) ? success(parsed.value) : issue();
}
function isEditor(value) {
  return Object.hasOwn(value, "publication");
}
function parseSuiteProfileUpdateV2(input) {
  try {
    const value = snapshot(input, UPDATE_KEYS);
    if (value === null)
      return issue();
    if (value["schemaVersion"] !== 2)
      return issue("schemaVersion");
    const expectedRevision = value["expectedRevision"];
    if (!nonnegativeInteger2(expectedRevision))
      return issue("expectedRevision");
    const publication = value["publication"];
    if (publication !== "publish" && publication !== "private")
      return issue("publication");
    const avatarRef = optionalAvatar(value["avatarRef"]);
    if (!avatarRef.ok)
      return avatarRef;
    const content = parsedContent(value, false);
    if (!content.ok)
      return content;
    return success({
      schemaVersion: 2,
      expectedRevision,
      ...content.value,
      avatarRef: avatarRef.value,
      publication
    });
  } catch {
    return issue();
  }
}
function avatarUrl(ref, path) {
  const parsed = parseSuiteAvatarRef(ref);
  return parsed.ok ? success(`${getSuiteAccountsDeployment("production").accountsOrigin}${path}/${parsed.value}.webp`) : parsed;
}
function suiteProfileAvatarPublicUrl(ref) {
  return avatarUrl(ref, "/suite/profile/avatar/v1");
}
function suiteProfileAvatarEditorUrl(ref) {
  return avatarUrl(ref, "/api/profile/avatar/v1");
}
// src/identity/views.ts
import { err as err8, isRecord as isRecord3, ok as ok9 } from "@hraness/result";
var SUITE_SUBSCRIPTION_STATUSES = deepFreeze([
  "incomplete",
  "trialing",
  "active",
  "past_due",
  "paused",
  "canceled",
  "unpaid"
]);
var SUITE_INVOICE_STATUSES = deepFreeze([
  "draft",
  "open",
  "paid",
  "void",
  "uncollectible"
]);
function containsAsciiControl2(value) {
  for (let index = 0;index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127)
      return true;
  }
  return false;
}
function parseEmail(value) {
  return typeof value === "string" && value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value) ? value : null;
}
function parseOptionalName(value) {
  if (value === null)
    return null;
  return typeof value === "string" && value.length >= 1 && value.length <= 160 && value.trim() === value && !containsAsciiControl2(value) ? value : undefined;
}
function parseNonnegativeInteger(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
function parseOptionalTimestamp(value) {
  if (value === null)
    return null;
  return parseNonnegativeInteger(value) ?? undefined;
}
function isOneOf(values, value) {
  return typeof value === "string" && values.includes(value);
}
function parseSuiteSubscriptionView(value) {
  if (!isRecord3(value))
    return err8("invalid-subscription-view");
  const plan = parseSuitePlanId(value["plan"]);
  const catalogRevision = parseSuiteCatalogRevision(value["catalogRevision"]);
  const currentPeriodEndMs = parseOptionalTimestamp(value["currentPeriodEndMs"]);
  if (!plan.ok || !catalogRevision.ok || !isOneOf(SUITE_SUBSCRIPTION_STATUSES, value["status"]) || typeof value["cancelAtPeriodEnd"] !== "boolean" || currentPeriodEndMs === undefined) {
    return err8("invalid-subscription-view");
  }
  return ok9({
    cancelAtPeriodEnd: value["cancelAtPeriodEnd"],
    catalogRevision: catalogRevision.value,
    currentPeriodEndMs,
    plan: plan.value,
    status: value["status"]
  });
}
function parseSuiteInvoiceView(value) {
  if (!isRecord3(value) || !isOneOf(SUITE_INVOICE_STATUSES, value["status"]) || value["currency"] !== "usd") {
    return err8("invalid-invoice-view");
  }
  const amountDueCents = parseNonnegativeInteger(value["amountDueCents"]);
  const amountPaidCents = parseNonnegativeInteger(value["amountPaidCents"]);
  const createdAtMs = parseNonnegativeInteger(value["createdAtMs"]);
  const number = value["number"] === null ? null : typeof value["number"] === "string" && value["number"].length >= 1 && value["number"].length <= 80 && value["number"].trim() === value["number"] ? value["number"] : undefined;
  const invoiceRef = value["invoiceRef"] === null ? ok9(null) : parseSuiteInvoiceRef(value["invoiceRef"]);
  if (amountDueCents === null || amountPaidCents === null || createdAtMs === null || number === undefined || !invoiceRef.ok) {
    return err8("invalid-invoice-view");
  }
  return ok9({
    amountDueCents,
    amountPaidCents,
    createdAtMs,
    currency: "usd",
    invoiceRef: invoiceRef.value,
    number,
    status: value["status"]
  });
}
function parseFeatures(value) {
  if (!Array.isArray(value) || value.length > 2)
    return null;
  const parsed = [];
  for (const entry of value) {
    const feature = parseCurrentSuiteFeatureId(entry);
    if (!feature.ok || parsed.includes(feature.value))
      return null;
    parsed.push(feature.value);
  }
  return parsed;
}
function parseSuiteAccountView(value) {
  if (!isRecord3(value))
    return err8("invalid-account-view");
  const accountId = parseSuiteAccountId(value["accountId"]);
  const email = parseEmail(value["email"]);
  const name = parseOptionalName(value["name"]);
  const username = value["username"] === null || value["username"] === undefined ? ok9(null) : parseSuiteUsername(value["username"]);
  const subscription = value["subscription"] === null ? ok9(null) : parseSuiteSubscriptionView(value["subscription"]);
  const plan = value["plan"] === null ? ok9(null) : parseSuitePlanId(value["plan"]);
  const features = parseFeatures(value["features"]);
  if (!accountId.ok || value["catalogRevision"] !== SUITE_CATALOG_REVISION || email === null || name === undefined || !username.ok || !subscription.ok || !plan.ok || features === null || !Array.isArray(value["invoices"]) || value["invoices"].length > 100 || plan.value !== (subscription.value?.plan ?? null)) {
    return err8("invalid-account-view");
  }
  const statusCanGrant = subscription.value !== null && (subscription.value.status === "active" || subscription.value.status === "trialing");
  const planFeatures = subscription.value === null ? [] : featuresForSuitePlan(subscription.value.plan);
  const exactPositiveGrant = statusCanGrant && features.length === planFeatures.length && features.every((feature, index) => feature === planFeatures[index]);
  if (features.length > 0 && !exactPositiveGrant) {
    return err8("invalid-account-view");
  }
  const invoices = [];
  for (const entry of value["invoices"]) {
    const invoice = parseSuiteInvoiceView(entry);
    if (!invoice.ok)
      return err8("invalid-account-view");
    invoices.push(invoice.value);
  }
  return ok9({
    accountId: accountId.value,
    catalogRevision: SUITE_CATALOG_REVISION,
    email,
    features,
    invoices,
    name,
    plan: plan.value,
    subscription: subscription.value,
    username: username.value
  });
}
export {
  validateSuiteLinkReceipt,
  validateSuiteEntitlementsClaim,
  validateSuiteEntitlementReceipt,
  validateProductLinkProof,
  suiteProfileAvatarPublicUrl,
  suiteProfileAvatarEditorUrl,
  suitePlanIncludesFeature,
  suiteLinkReceiptMessage,
  suiteEntitlementReceiptMessage,
  productLinkProofMessage,
  parseSuiteUsername,
  parseSuiteSubscriptionView,
  parseSuitePublicProfileV2,
  parseSuiteProfileView,
  parseSuiteProfileUpdateV2,
  parseSuiteProfileUpdateRequest,
  parseSuiteProfileEditorV2,
  parseSuiteProduct,
  parseSuitePlanId,
  parseSuiteLinkProduct,
  parseSuiteJwtClaims,
  parseSuiteInvoiceView,
  parseSuiteInvoiceRef,
  parseSuiteFeatureId,
  parseSuiteEnvironment,
  parseSuiteConsumerId,
  parseSuiteCommunityProfileView,
  parseSuiteCatalogRevision,
  parseSuiteAvatarRef,
  parseSuiteAccountView,
  parseSuiteAccountId,
  parseLegacyPrincipalLink,
  parseIssuerSubject,
  parseIdentitySubject,
  parseIdentityIssuer,
  parseCurrentSuiteFeatureId,
  normalizeSuiteUsername,
  normalizeSuiteProfileLinkV2,
  normalizeSuiteProfileLink,
  isSuiteIssuableEnvironment,
  generateSuiteInvoiceRef,
  generateSuiteAccountId,
  featuresForSuitePlan,
  SUITE_USERNAME_MIN_LENGTH,
  SUITE_USERNAME_MAX_LENGTH,
  SUITE_SUBSCRIPTION_STATUSES,
  SUITE_PROFILE_URL_MAX_LENGTH,
  SUITE_PROFILE_NAME_MAX_LENGTH,
  SUITE_PROFILE_BIO_MAX_LENGTH,
  SUITE_PRODUCTS,
  SUITE_PLAN_IDS,
  SUITE_LINK_PRODUCTS,
  SUITE_LEGACY_FEATURE_IDS,
  SUITE_ISSUABLE_ENVIRONMENTS,
  SUITE_INVOICE_STATUSES,
  SUITE_FEATURE_IDS,
  SUITE_ENVIRONMENTS,
  SUITE_ENTITLEMENT_RECEIPT_VERSION,
  SUITE_ENTITLEMENT_RECEIPT_MAX_TTL_MS,
  SUITE_ENTITLEMENTS_CLAIM_VERSION,
  SUITE_CURRENT_FEATURE_IDS,
  SUITE_CONSUMER_IDS,
  SUITE_COMMUNITY_APPLICATION_STATUSES,
  SUITE_CATALOG_REVISIONS,
  SUITE_CATALOG_REVISION,
  PREVIOUS_SUITE_CATALOG_REVISION,
  LEGACY_SUITE_PRODUCT_IDS,
  LEGACY_SUITE_LINK_PRODUCTS,
  LEGACY_SUITE_CONSUMER_IDS,
  LEGACY_SUITE_CATALOG_REVISION,
  IDENTITY_LINK_RECEIPT_VERSION,
  IDENTITY_LINK_PROOF_VERSION,
  IDENTITY_LINK_MAX_TTL_MS,
  IDENTITY_LINK_CLOCK_SKEW_MS
};
