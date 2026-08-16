import { ok, type Result } from "@hraness/result";
import { deepFreeze } from "../immutable.js";

import {
  parseCurrentSuiteFeatureId,
  SUITE_CATALOG_REVISION,
  type CurrentSuiteCatalogRevision,
  type CurrentSuiteFeatureId,
} from "./catalog.js";
import { parseSuiteAccountId, type SuiteAccountId } from "./identifiers.js";
import {
  parseIdentitySubject,
  parseSuiteEnvironment,
  parseSuiteProduct,
  type LegacySuiteProductId,
  type SuiteEnvironment,
  type SuiteProduct,
} from "./principals.js";

export const IDENTITY_LINK_PROOF_VERSION =
  "suite-product-link-proof-v1" as const;
export const IDENTITY_LINK_RECEIPT_VERSION =
  "suite-link-receipt-v1" as const;
export const SUITE_ENTITLEMENTS_CLAIM_VERSION =
  "suite-entitlements-v1" as const;
export const SUITE_ENTITLEMENT_RECEIPT_VERSION =
  "suite-entitlement-receipt-v1" as const;
export const IDENTITY_LINK_MAX_TTL_MS = 5 * 60_000;
export const SUITE_ENTITLEMENT_RECEIPT_MAX_TTL_MS = 5 * 60_000;
export const IDENTITY_LINK_CLOCK_SKEW_MS = 30_000;

export const SUITE_LINK_PRODUCTS = deepFreeze([
  "soundfish",
  "oprte",
  // Compatibility-only readers for already-issued publication receipts and links.
  "crclte",
  "pub",
] as const satisfies readonly SuiteProduct[]);
export const LEGACY_SUITE_LINK_PRODUCTS = deepFreeze([
  "kitchen",
] as const satisfies readonly LegacySuiteProductId[]);

export type SuiteLinkProduct = (typeof SUITE_LINK_PRODUCTS)[number];
export type LegacySuiteLinkProduct =
  (typeof LEGACY_SUITE_LINK_PRODUCTS)[number];
export type SignedSuiteLinkProduct =
  | LegacySuiteLinkProduct
  | SuiteLinkProduct;

export function parseSuiteLinkProduct(
  value: unknown,
): Result<SuiteLinkProduct, "invalid-product"> {
  const parsed = parseSuiteProduct(value);
  if (!parsed.ok) return parsed;
  switch (parsed.value) {
    case "soundfish":
    case "oprte":
    case "crclte":
    case "pub":
      return ok(parsed.value);
  }
}

export type ProductLinkProof = Readonly<{
  challengeId: string;
  environment: SuiteEnvironment;
  expiresAtMs: number;
  issuedAtMs: number;
  keyVersion: string;
  localSubject: string;
  product: SignedSuiteLinkProduct;
}>;

export type SuiteLinkReceiptPayload = ProductLinkProof & Readonly<{
  suiteAccountId: SuiteAccountId | string;
}>;

export type SuiteLinkReceipt = SuiteLinkReceiptPayload & Readonly<{
  signature: string;
  version: typeof IDENTITY_LINK_RECEIPT_VERSION;
}>;

export type SuiteEntitlementsClaim = Readonly<{
  catalogRevision: CurrentSuiteCatalogRevision;
  expiresAtMs: number;
  features: readonly CurrentSuiteFeatureId[];
  observedAtMs: number;
  projectionRevision: number;
  version: typeof SUITE_ENTITLEMENTS_CLAIM_VERSION;
}>;

export type SuiteEntitlementReceiptPayload = Readonly<{
  entitlements: SuiteEntitlementsClaim;
  environment: SuiteEnvironment;
  expiresAtMs: number;
  issuedAtMs: number;
  keyVersion: string;
  product: SignedSuiteLinkProduct;
  suiteAccountId: SuiteAccountId | string;
}>;

export type SuiteEntitlementReceipt =
  SuiteEntitlementReceiptPayload & Readonly<{
    signature: string;
    version: typeof SUITE_ENTITLEMENT_RECEIPT_VERSION;
  }>;

export type IdentityLinkInputIssue =
  | "expired"
  | "invalid"
  | "not-yet-valid";

function safeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function validateProductLinkProof(
  input: ProductLinkProof,
  now: number,
): IdentityLinkInputIssue | null {
  const product = parseSuiteLinkProduct(input.product);
  const environment = parseSuiteEnvironment(input.environment);
  const localSubject = parseIdentitySubject(input.localSubject);
  if (
    !safeInteger(now)
    || !product.ok
    || !environment.ok
    || !localSubject.ok
    || !/^[A-Za-z0-9_-]{22,128}$/u.test(input.challengeId)
    || !/^[a-z0-9][a-z0-9._-]{0,31}$/u.test(input.keyVersion)
    || !safeInteger(input.issuedAtMs)
    || !safeInteger(input.expiresAtMs)
    || input.expiresAtMs <= input.issuedAtMs
    || input.expiresAtMs - input.issuedAtMs > IDENTITY_LINK_MAX_TTL_MS
  ) {
    return "invalid";
  }
  if (input.issuedAtMs > now + IDENTITY_LINK_CLOCK_SKEW_MS) {
    return "not-yet-valid";
  }
  return input.expiresAtMs <= now ? "expired" : null;
}

export function productLinkProofMessage(input: ProductLinkProof): string {
  return JSON.stringify([
    IDENTITY_LINK_PROOF_VERSION,
    input.product,
    input.environment,
    input.localSubject,
    input.challengeId,
    input.issuedAtMs,
    input.expiresAtMs,
    input.keyVersion,
  ]);
}

export function suiteLinkReceiptMessage(
  input: SuiteLinkReceiptPayload,
): string {
  return JSON.stringify([
    IDENTITY_LINK_RECEIPT_VERSION,
    input.product,
    input.environment,
    input.localSubject,
    input.suiteAccountId,
    input.challengeId,
    input.issuedAtMs,
    input.expiresAtMs,
    input.keyVersion,
  ]);
}

export function validateSuiteLinkReceipt(
  input: SuiteLinkReceipt,
  now: number,
): IdentityLinkInputIssue | null {
  const proofIssue = validateProductLinkProof(input, now);
  if (
    proofIssue !== null
    || input.version !== IDENTITY_LINK_RECEIPT_VERSION
    || !parseSuiteAccountId(input.suiteAccountId).ok
    || !/^[A-Za-z0-9_-]{43}$/u.test(input.signature)
  ) {
    return proofIssue ?? "invalid";
  }
  return null;
}

function exactCurrentFeatures(
  values: readonly CurrentSuiteFeatureId[],
): boolean {
  if (values.length > 2) return false;
  const parsed: CurrentSuiteFeatureId[] = [];
  for (const value of values) {
    const feature = parseCurrentSuiteFeatureId(value);
    if (!feature.ok || parsed.includes(feature.value)) return false;
    parsed.push(feature.value);
  }
  return (
    parsed.length === 0
    || (
      parsed.length === 1
      && parsed[0] === "suite.paid"
    )
    || (
      parsed.length === 2
      && parsed[0] === "suite.paid"
      && parsed[1] === "suite.believer"
    )
  );
}

export function validateSuiteEntitlementsClaim(
  input: SuiteEntitlementsClaim,
): boolean {
  return (
    input.version === SUITE_ENTITLEMENTS_CLAIM_VERSION
    && input.catalogRevision === SUITE_CATALOG_REVISION
    && safeInteger(input.observedAtMs)
    && safeInteger(input.expiresAtMs)
    && input.expiresAtMs > input.observedAtMs
    && safeInteger(input.projectionRevision)
    && Array.isArray(input.features)
    && exactCurrentFeatures(input.features)
  );
}

export function suiteEntitlementReceiptMessage(
  input: SuiteEntitlementReceiptPayload,
): string {
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
    input.entitlements.features,
  ]);
}

export function validateSuiteEntitlementReceipt(
  input: SuiteEntitlementReceipt,
  now: number,
): IdentityLinkInputIssue | null {
  const product = parseSuiteLinkProduct(input.product);
  const environment = parseSuiteEnvironment(input.environment);
  if (
    !safeInteger(now)
    || input.version !== SUITE_ENTITLEMENT_RECEIPT_VERSION
    || !product.ok
    || !environment.ok
    || !parseSuiteAccountId(input.suiteAccountId).ok
    || !/^[a-z0-9][a-z0-9._-]{0,31}$/u.test(input.keyVersion)
    || !safeInteger(input.issuedAtMs)
    || !safeInteger(input.expiresAtMs)
    || input.expiresAtMs <= input.issuedAtMs
    || input.expiresAtMs - input.issuedAtMs
      > SUITE_ENTITLEMENT_RECEIPT_MAX_TTL_MS
    || !validateSuiteEntitlementsClaim(input.entitlements)
    || input.expiresAtMs > input.entitlements.expiresAtMs
    || !/^[A-Za-z0-9_-]{43}$/u.test(input.signature)
  ) {
    return "invalid";
  }
  if (
    input.issuedAtMs > now + IDENTITY_LINK_CLOCK_SKEW_MS
    || input.entitlements.observedAtMs > now + IDENTITY_LINK_CLOCK_SKEW_MS
  ) {
    return "not-yet-valid";
  }
  return input.expiresAtMs <= now ? "expired" : null;
}
