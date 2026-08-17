import { err, isRecord, ok, type Result } from "@hraness/result";
import { deepFreeze } from "../immutable.js";

import {
  parseSuiteAccountId,
  type SuiteAccountId,
} from "./identifiers.js";
import {
  parseSuiteUsername,
  type SuiteUsername,
} from "./usernames.js";

export const SUITE_PRODUCTS = deepFreeze([
  "soundfish",
  "hra",
  // Compatibility-only readers for retired publication principal evidence.
  "crclte",
  "pub",
] as const);
export const LEGACY_SUITE_PRODUCT_IDS = deepFreeze([
  "oprte",
  "kitchen",
] as const);
export const SUITE_ENVIRONMENTS = deepFreeze([
  "development",
  "staging",
  "production",
] as const);
export const SUITE_ISSUABLE_ENVIRONMENTS = deepFreeze([
  "development",
  "production",
] as const);

export type SuiteProduct = (typeof SUITE_PRODUCTS)[number];
export type LegacySuiteProductId =
  (typeof LEGACY_SUITE_PRODUCT_IDS)[number];
export type SuiteEnvironment = (typeof SUITE_ENVIRONMENTS)[number];
export type SuiteIssuableEnvironment =
  (typeof SUITE_ISSUABLE_ENVIRONMENTS)[number];

declare const identityIssuerBrand: unique symbol;
declare const identitySubjectBrand: unique symbol;

export type IdentityIssuer = string & {
  readonly [identityIssuerBrand]: "IdentityIssuer";
};
export type IdentitySubject = string & {
  readonly [identitySubjectBrand]: "IdentitySubject";
};

export type IssuerSubject = {
  readonly issuer: IdentityIssuer;
  readonly subject: IdentitySubject;
};

export type LegacyPrincipalLink = {
  readonly environment: SuiteEnvironment;
  readonly legacySubject: IdentitySubject;
  readonly product: SuiteProduct;
};

export type IdentityIssue =
  | "invalid-audience"
  | "invalid-environment"
  | "invalid-issuer"
  | "invalid-jwt-claims"
  | "invalid-legacy-link"
  | "invalid-product"
  | "invalid-subject"
  | "invalid-suite-account-id";

const localIssuerHosts = new Set(["127.0.0.1", "[::1]", "localhost"]);

function containsAsciiControl(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

export function parseIdentityIssuer(
  value: unknown,
): Result<IdentityIssuer, "invalid-issuer"> {
  if (typeof value !== "string" || value.length > 2_048 || value.trim() !== value) {
    return err("invalid-issuer");
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return err("invalid-issuer");
  }
  const local = localIssuerHosts.has(parsed.hostname);
  if (
    (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    return err("invalid-issuer");
  }
  return ok(parsed.origin as IdentityIssuer);
}

export function parseIdentitySubject(
  value: unknown,
): Result<IdentitySubject, "invalid-subject"> {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 255 ||
    value.trim() !== value ||
    containsAsciiControl(value)
  ) {
    return err("invalid-subject");
  }
  return ok(value as IdentitySubject);
}

export function parseIssuerSubject(
  value: unknown,
): Result<IssuerSubject, "invalid-issuer" | "invalid-subject"> {
  if (!isRecord(value)) return err("invalid-subject");
  const issuer = parseIdentityIssuer(value["issuer"]);
  if (!issuer.ok) return issuer;
  const subject = parseIdentitySubject(value["subject"]);
  return subject.ok
    ? ok({ issuer: issuer.value, subject: subject.value })
    : subject;
}

export function parseSuiteProduct(
  value: unknown,
): Result<SuiteProduct, "invalid-product"> {
  switch (value) {
    case "soundfish":
    case "hra":
    case "crclte":
    case "pub":
      return ok(value);
    // OPRTE and Kitchen are predecessor product IDs. Parse them only at
    // foreign or stored boundaries and immediately return HRA so new state
    // cannot perpetuate either predecessor identity.
    case "oprte":
    case "kitchen":
      return ok("hra");
    default:
      return err("invalid-product");
  }
}

export function parseSuiteEnvironment(
  value: unknown,
): Result<SuiteEnvironment, "invalid-environment"> {
  return typeof value === "string" &&
      (SUITE_ENVIRONMENTS as readonly string[]).includes(value)
    ? ok(value as SuiteEnvironment)
    : err("invalid-environment");
}

/**
 * Staging remains parseable only for legacy stored and signed evidence.
 * New link, receipt, and identity authority is limited to local development
 * and the single production deployment.
 */
export function isSuiteIssuableEnvironment(
  value: SuiteEnvironment,
): value is SuiteIssuableEnvironment {
  return value === "development" || value === "production";
}

export function parseLegacyPrincipalLink(
  value: unknown,
): Result<LegacyPrincipalLink, IdentityIssue> {
  if (!isRecord(value)) return err("invalid-legacy-link");
  const product = parseSuiteProduct(value["product"]);
  if (!product.ok) return product;
  const environment = parseSuiteEnvironment(value["environment"]);
  if (!environment.ok) return environment;
  const legacySubject = parseIdentitySubject(value["legacySubject"]);
  if (!legacySubject.ok) return legacySubject;
  return ok({
    environment: environment.value,
    legacySubject: legacySubject.value,
    product: product.value,
  });
}

export type SuiteJwtClaims = {
  readonly audience: readonly string[];
  readonly expiresAtSeconds: number;
  readonly issuedAtSeconds: number;
  readonly notBeforeSeconds?: number;
  readonly principal: IssuerSubject;
  readonly profileComplete: boolean;
  readonly profileRevision: "username-v1" | null;
  readonly suiteAccountId: SuiteAccountId;
  readonly username: SuiteUsername | null;
};

function parseAudience(value: unknown): Result<readonly string[], "invalid-audience"> {
  const values = typeof value === "string" ? [value] : value;
  if (
    !Array.isArray(values) ||
    values.length < 1 ||
    values.length > 8 ||
    values.some(
      (entry) =>
        typeof entry !== "string" ||
        entry.length < 1 ||
        entry.length > 255 ||
        entry.trim() !== entry ||
        containsAsciiControl(entry),
    ) ||
    new Set(values).size !== values.length
  ) {
    return err("invalid-audience");
  }
  return ok(values as readonly string[]);
}

function parseTimestamp(value: unknown): number | null {
  return typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value >= 0
    ? value
    : null;
}

/**
 * Parse a decoded JWT payload from `unknown`.
 *
 * This function does not verify a signature, issuer trust, audience ownership, or
 * current time. Authorization must perform those checks before using the result.
 */
export function parseSuiteJwtClaims(
  value: unknown,
): Result<SuiteJwtClaims, IdentityIssue> {
  if (!isRecord(value)) return err("invalid-jwt-claims");
  const principal = parseIssuerSubject({
    issuer: value["iss"],
    subject: value["sub"],
  });
  if (!principal.ok) return principal;
  const suiteAccountId = parseSuiteAccountId(value["suite_account_id"]);
  if (!suiteAccountId.ok) return suiteAccountId;
  const audience = parseAudience(value["aud"]);
  if (!audience.ok) return audience;
  const issuedAtSeconds = parseTimestamp(value["iat"]);
  const expiresAtSeconds = parseTimestamp(value["exp"]);
  const notBeforeSeconds =
    value["nbf"] === undefined ? undefined : parseTimestamp(value["nbf"]);
  const legacyProfile = value["profile_revision"] === undefined
    && value["profile_complete"] === undefined
    && value["username"] === undefined;
  const profileRevision = legacyProfile
    ? null
    : value["profile_revision"] === "username-v1"
      ? "username-v1" as const
      : undefined;
  const profileComplete = legacyProfile
    ? false
    : typeof value["profile_complete"] === "boolean"
      ? value["profile_complete"]
      : undefined;
  const username = legacyProfile || value["username"] === null
    ? null
    : parseSuiteUsername(value["username"]);
  if (
    issuedAtSeconds === null ||
    expiresAtSeconds === null ||
    expiresAtSeconds <= issuedAtSeconds ||
    notBeforeSeconds === null ||
    (notBeforeSeconds !== undefined && notBeforeSeconds > expiresAtSeconds) ||
    profileRevision === undefined ||
    profileComplete === undefined ||
    (username !== null && !username.ok) ||
    profileComplete !== (username !== null)
  ) {
    return err("invalid-jwt-claims");
  }
  return ok({
    audience: audience.value,
    expiresAtSeconds,
    issuedAtSeconds,
    ...(notBeforeSeconds === undefined ? {} : { notBeforeSeconds }),
    principal: principal.value,
    profileComplete,
    profileRevision,
    suiteAccountId: suiteAccountId.value,
    username: username?.value ?? null,
  });
}
