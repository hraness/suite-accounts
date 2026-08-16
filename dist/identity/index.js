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
// src/identity/consumers.ts
import { err as err2, ok as ok2 } from "@hraness/result";
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
      return ok2(value);
    case "kitchen":
      return ok2("oprte");
    default:
      return err2("invalid-consumer");
  }
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
import { err as err6, ok as ok6 } from "@hraness/result";

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
  "mgrte",
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
    case "mgrte":
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
    case "mgrte":
      return err6("invalid-product");
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
import { err as err7, isRecord as isRecord2, ok as ok7 } from "@hraness/result";
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
    return err7({ field: "name", reason: "required" });
  }
  if (hasInvalidSingleLineControl(value)) {
    return err7({ field: "name", reason: "invalid" });
  }
  const name = value.trim().replace(/\s+/gu, " ");
  if (name.length === 0) {
    return err7({ field: "name", reason: "required" });
  }
  return name.length <= SUITE_PROFILE_NAME_MAX_LENGTH ? ok7(name) : err7({ field: "name", reason: "too_long" });
}
function normalizedProfileViewName(value) {
  if (typeof value !== "string") {
    return err7({ field: "name", reason: "invalid" });
  }
  if (hasInvalidSingleLineControl(value)) {
    return err7({ field: "name", reason: "invalid" });
  }
  const name = value.trim().replace(/\s+/gu, " ");
  return name.length <= SUITE_PROFILE_NAME_MAX_LENGTH ? ok7(name) : err7({ field: "name", reason: "too_long" });
}
function normalizedBio(value) {
  if (typeof value !== "string") {
    return err7({ field: "bio", reason: "invalid" });
  }
  const normalizedNewlines = value.replaceAll(`\r
`, `
`).replaceAll("\r", `
`);
  if (hasInvalidBioControl(normalizedNewlines)) {
    return err7({ field: "bio", reason: "invalid" });
  }
  const bio = normalizedNewlines.trim();
  return bio.length <= SUITE_PROFILE_BIO_MAX_LENGTH ? ok7(bio) : err7({ field: "bio", reason: "too_long" });
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
    return err7({ field: key, reason: "invalid" });
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
  return normalized === null ? err7({ field: key, reason: "invalid" }) : ok7(normalized);
}
function parsedLinks(value, canonicalOnly) {
  if (!isRecord2(value) || !exactKeys(value, PROFILE_LINK_KEYS)) {
    return err7({ field: "profile", reason: "invalid" });
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
      return err7({ field: key, reason: "invalid" });
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
    return err7({ field: "profile", reason: "invalid" });
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
    return err7({ field: "expectedRevision", reason: "invalid" });
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
    return err7({ field: "profile", reason: "invalid" });
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
    return err7({ field: "email", reason: "invalid" });
  if (revision === null) {
    return err7({ field: "expectedRevision", reason: "invalid" });
  }
  if (name.value !== value["name"] || bio.value !== value["bio"]) {
    return err7({ field: "profile", reason: "invalid" });
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
    return err7({ field: "application", reason: "invalid" });
  }
  const submittedAtMs = nonnegativeInteger(value["submittedAtMs"]);
  const updatedAtMs = nonnegativeInteger(value["updatedAtMs"]);
  if (submittedAtMs === null || updatedAtMs === null || updatedAtMs < submittedAtMs) {
    return err7({ field: "application", reason: "invalid" });
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
    return err7({ field: "profile", reason: "invalid" });
  }
  const application = parsedApplication(value["application"]);
  if (!application.ok)
    return application;
  const profile = parseSuiteProfileView(value["profile"]);
  return profile.ok ? ok7({ application: application.value, profile: profile.value }) : profile;
}
// src/identity/views.ts
import { err as err8, isRecord as isRecord3, ok as ok8 } from "@hraness/result";
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
  return ok8({
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
  const invoiceRef = value["invoiceRef"] === null ? ok8(null) : parseSuiteInvoiceRef(value["invoiceRef"]);
  if (amountDueCents === null || amountPaidCents === null || createdAtMs === null || number === undefined || !invoiceRef.ok) {
    return err8("invalid-invoice-view");
  }
  return ok8({
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
  const username = value["username"] === null || value["username"] === undefined ? ok8(null) : parseSuiteUsername(value["username"]);
  const subscription = value["subscription"] === null ? ok8(null) : parseSuiteSubscriptionView(value["subscription"]);
  const plan = value["plan"] === null ? ok8(null) : parseSuitePlanId(value["plan"]);
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
  return ok8({
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
  suitePlanIncludesFeature,
  suiteLinkReceiptMessage,
  suiteEntitlementReceiptMessage,
  productLinkProofMessage,
  parseSuiteUsername,
  parseSuiteSubscriptionView,
  parseSuiteProfileView,
  parseSuiteProfileUpdateRequest,
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
  parseSuiteAccountView,
  parseSuiteAccountId,
  parseLegacyPrincipalLink,
  parseIssuerSubject,
  parseIdentitySubject,
  parseIdentityIssuer,
  parseCurrentSuiteFeatureId,
  normalizeSuiteUsername,
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
