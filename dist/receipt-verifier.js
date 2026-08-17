// src/identity/links.ts
import { ok as ok5 } from "@hraness/result";

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
import { err, ok } from "@hraness/result";
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

// src/identity/principals.ts
import { err as err4, isRecord, ok as ok4 } from "@hraness/result";

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
    case "crclte":
    case "pub":
      return ok5(parsed.value);
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

// src/receipt-verifier.ts
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parseSuiteReceiptKeyring(value) {
  let decoded = value;
  if (typeof value === "string") {
    if (value.length > 32768)
      return null;
    try {
      decoded = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!isRecord2(decoded) || decoded["version"] !== 1 || !Array.isArray(decoded["keys"]) || decoded["keys"].length < 1 || decoded["keys"].length > 20) {
    return null;
  }
  const keys = [];
  const identities = new Set;
  for (const rawKey of decoded["keys"]) {
    if (!isRecord2(rawKey))
      return null;
    const { environment, keyVersion, product, secret } = rawKey;
    const parsedEnvironment = parseSuiteEnvironment(environment);
    const parsedProduct = parseSuiteLinkProduct(product);
    if (!parsedEnvironment.ok || !parsedProduct.ok || !/^[a-z0-9][a-z0-9._-]{0,31}$/u.test(String(keyVersion)) || typeof secret !== "string" || new TextEncoder().encode(secret).byteLength < 32 || secret.length > 1024) {
      return null;
    }
    const identity = `${parsedProduct.value}:${parsedEnvironment.value}:${String(keyVersion)}`;
    if (identities.has(identity))
      return null;
    identities.add(identity);
    keys.push({
      environment: parsedEnvironment.value,
      keyVersion: String(keyVersion),
      product: parsedProduct.value,
      secret
    });
  }
  return deepFreeze({ keys, version: 1 });
}
function selectSuiteReceiptConfiguration(value, product, activeKeyVersion) {
  const canonicalProduct = parseSuiteLinkProduct(product);
  if (!canonicalProduct.ok || typeof activeKeyVersion !== "string" || !/^[a-z0-9][a-z0-9._-]{0,31}$/u.test(activeKeyVersion)) {
    return null;
  }
  const keyring = parseSuiteReceiptKeyring(value);
  if (keyring === null)
    return null;
  const active = keyring.keys.filter((key2) => key2.product === canonicalProduct.value && key2.keyVersion === activeKeyVersion && isSuiteIssuableEnvironment(key2.environment));
  if (active.length !== 1)
    return null;
  const key = active[0];
  const verificationKeys = keyring.keys.filter((candidate) => candidate.product === canonicalProduct.value && candidate.environment === key.environment);
  return deepFreeze({
    key,
    keyring: { keys: verificationKeys, version: 1 }
  });
}
function keyFor(keyring, product, environment, keyVersion) {
  const canonicalProduct = parseSuiteLinkProduct(product);
  if (!canonicalProduct.ok)
    return null;
  return keyring.keys.find((key) => key.product === canonicalProduct.value && key.environment === environment && key.keyVersion === keyVersion) ?? null;
}
function decodeSignature(value) {
  if (!/^[A-Za-z0-9_-]{43}$/u.test(value))
    return null;
  try {
    const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/") + "=");
    const result = new Uint8Array(new ArrayBuffer(binary.length));
    for (let index = 0;index < binary.length; index += 1) {
      result[index] = binary.charCodeAt(index);
    }
    return result.byteLength === 32 ? result : null;
  } catch {
    return null;
  }
}
async function hmac(secret, message) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { hash: "SHA-256", name: "HMAC" }, false, ["sign"]);
  return await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
}
async function verifySignature(secret, message, signature) {
  const received = decodeSignature(signature);
  if (received === null)
    return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { hash: "SHA-256", name: "HMAC" }, false, ["verify"]);
  return await crypto.subtle.verify("HMAC", key, received, new TextEncoder().encode(message));
}
function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes)
    binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}
async function signSuiteProductLinkProof(proof, keyring, nowMs) {
  if (validateProductLinkProof(proof, nowMs) !== null || !isSuiteIssuableEnvironment(proof.environment))
    return null;
  const key = keyFor(keyring, proof.product, proof.environment, proof.keyVersion);
  return key === null ? null : encodeBase64Url(new Uint8Array(await hmac(key.secret, productLinkProofMessage(proof))));
}
async function verifySuiteLinkReceiptSignature(receipt, keyring, nowMs) {
  if (validateSuiteLinkReceipt(receipt, nowMs) !== null)
    return false;
  const key = keyFor(keyring, receipt.product, receipt.environment, receipt.keyVersion);
  return key !== null && await verifySignature(key.secret, suiteLinkReceiptMessage(receipt), receipt.signature);
}
async function verifySuiteEntitlementReceiptSignature(receipt, keyring, nowMs) {
  if (validateSuiteEntitlementReceipt(receipt, nowMs) !== null)
    return false;
  const key = keyFor(keyring, receipt.product, receipt.environment, receipt.keyVersion);
  return key !== null && await verifySignature(key.secret, suiteEntitlementReceiptMessage(receipt), receipt.signature);
}
export {
  verifySuiteLinkReceiptSignature,
  verifySuiteEntitlementReceiptSignature,
  signSuiteProductLinkProof,
  selectSuiteReceiptConfiguration,
  parseSuiteReceiptKeyring
};
