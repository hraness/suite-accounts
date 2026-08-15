import { err, ok, type Result } from "@hraness/result";

declare const suiteAccountIdBrand: unique symbol;
declare const suiteInvoiceRefBrand: unique symbol;

/** An opaque, public account identifier owned by the suite accounts service. */
export type SuiteAccountId = string & {
  readonly [suiteAccountIdBrand]: "SuiteAccountId";
};

/** An opaque, unguessable invoice reference owned by the suite accounts service. */
export type SuiteInvoiceRef = string & {
  readonly [suiteInvoiceRefBrand]: "SuiteInvoiceRef";
};

export type SuiteAccountIdIssue = "invalid-suite-account-id";
export type SuiteInvoiceRefIssue = "invalid-suite-invoice-ref";

const suiteAccountIdPattern = /^acct_[0-9a-f]{32}$/u;
const suiteInvoiceRefPattern = /^invref_[0-9a-f]{32}$/u;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

/** Parse a foreign value into the only supported suite account ID format. */
export function parseSuiteAccountId(
  value: unknown,
): Result<SuiteAccountId, SuiteAccountIdIssue> {
  return typeof value === "string" && suiteAccountIdPattern.test(value)
    ? ok(value as SuiteAccountId)
    : err("invalid-suite-account-id");
}

/** Parse a foreign value without exposing a provider invoice identifier. */
export function parseSuiteInvoiceRef(
  value: unknown,
): Result<SuiteInvoiceRef, SuiteInvoiceRefIssue> {
  return typeof value === "string" && suiteInvoiceRefPattern.test(value)
    ? ok(value as SuiteInvoiceRef)
    : err("invalid-suite-invoice-ref");
}

/**
 * Generate a suite account ID from a cryptographically random UUID.
 *
 * The injected seam lets deterministic tests prove formatting. Production callers
 * should keep the default Web Crypto implementation.
 */
export function generateSuiteAccountId(
  randomUuid: () => string = () => crypto.randomUUID(),
): SuiteAccountId {
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

/**
 * Generate a provider-neutral invoice reference from cryptographic randomness.
 *
 * The reference is safe to project to a browser only after the accounts service
 * associates it with an invoice and resolves it under the authenticated account.
 */
export function generateSuiteInvoiceRef(
  randomUuid: () => string = () => crypto.randomUUID(),
): SuiteInvoiceRef {
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
