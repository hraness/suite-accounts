// src/identity/catalog.ts
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

// src/identity/catalog.ts
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
  return value === "individual" || value === "business" ? ok(value) : err("invalid-plan");
}
function parseCurrentSuiteFeatureId(value) {
  return value === "suite.paid" || value === "suite.believer" ? ok(value) : err("invalid-feature");
}
function parseSuiteFeatureId(value) {
  return typeof value === "string" && SUITE_FEATURE_IDS.includes(value) ? ok(value) : err("invalid-feature");
}
function parseSuiteCatalogRevision(value) {
  return value === LEGACY_SUITE_CATALOG_REVISION || value === PREVIOUS_SUITE_CATALOG_REVISION || value === SUITE_CATALOG_REVISION ? ok(value) : err("invalid-catalog-revision");
}
function featuresForSuitePlan(plan, revision = SUITE_CATALOG_REVISION) {
  return revision === LEGACY_SUITE_CATALOG_REVISION ? [...LEGACY_PLAN_FEATURES[plan]] : [...CURRENT_PLAN_FEATURES[plan]];
}
function suitePlanIncludesFeature(plan, feature) {
  return plan !== null && featuresForSuitePlan(plan).includes(feature);
}

// src/identity/principals.ts
import { err as err4, isRecord, ok as ok4 } from "@hraness/result";

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

// src/identity/principals.ts
var SUITE_PRODUCTS = deepFreeze([
  "soundfish",
  "hra",
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
    return err4("invalid-issuer");
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return err4("invalid-issuer");
  }
  const local = localIssuerHosts.has(parsed.hostname);
  if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:") || parsed.username !== "" || parsed.password !== "" || parsed.pathname !== "/" || parsed.search !== "" || parsed.hash !== "") {
    return err4("invalid-issuer");
  }
  return ok4(parsed.origin);
}
function parseIdentitySubject(value) {
  if (typeof value !== "string" || value.length < 1 || value.length > 255 || value.trim() !== value || containsAsciiControl(value)) {
    return err4("invalid-subject");
  }
  return ok4(value);
}
function parseIssuerSubject(value) {
  if (!isRecord(value))
    return err4("invalid-subject");
  const issuer = parseIdentityIssuer(value["issuer"]);
  if (!issuer.ok)
    return issuer;
  const subject = parseIdentitySubject(value["subject"]);
  return subject.ok ? ok4({ issuer: issuer.value, subject: subject.value }) : subject;
}
function parseSuiteProduct(value) {
  switch (value) {
    case "soundfish":
    case "hra":
    case "crclte":
    case "pub":
      return ok4(value);
    case "oprte":
    case "kitchen":
      return ok4("hra");
    default:
      return err4("invalid-product");
  }
}
function parseSuiteEnvironment(value) {
  return typeof value === "string" && SUITE_ENVIRONMENTS.includes(value) ? ok4(value) : err4("invalid-environment");
}
function isSuiteIssuableEnvironment(value) {
  return value === "development" || value === "production";
}
function parseLegacyPrincipalLink(value) {
  if (!isRecord(value))
    return err4("invalid-legacy-link");
  const product = parseSuiteProduct(value["product"]);
  if (!product.ok)
    return product;
  const environment = parseSuiteEnvironment(value["environment"]);
  if (!environment.ok)
    return environment;
  const legacySubject = parseIdentitySubject(value["legacySubject"]);
  if (!legacySubject.ok)
    return legacySubject;
  return ok4({
    environment: environment.value,
    legacySubject: legacySubject.value,
    product: product.value
  });
}
function parseAudience(value) {
  const values = typeof value === "string" ? [value] : value;
  if (!Array.isArray(values) || values.length < 1 || values.length > 8 || values.some((entry) => typeof entry !== "string" || entry.length < 1 || entry.length > 255 || entry.trim() !== entry || containsAsciiControl(entry)) || new Set(values).size !== values.length) {
    return err4("invalid-audience");
  }
  return ok4(values);
}
function parseTimestamp(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
function parseSuiteJwtClaims(value) {
  if (!isRecord(value))
    return err4("invalid-jwt-claims");
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
    return err4("invalid-jwt-claims");
  }
  return ok4({
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
export {
  verifySuiteEntitlementToken,
  suiteTokenGrantsFeature,
  decideSuiteEntitlementReceiptProjection,
  SUITE_ENTITLEMENT_MAX_PROVIDER_AGE_MS,
  SUITE_ENTITLEMENTS_CLAIM_VERSION
};
