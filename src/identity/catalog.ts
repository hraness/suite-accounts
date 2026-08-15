import { err, ok, type Result } from "@hraness/result";
import { deepFreeze } from "../immutable.js";

/**
 * Protocol revisions accepted by identity and entitlement readers.
 *
 * Pricing, provider lookup keys, and customer-facing plan copy belong to the
 * Accounts service. This module keeps only the finite values needed to parse
 * signed protocol evidence and to fail closed on feature grants.
 */
export const SUITE_CATALOG_REVISION = "cclrte-suite-v3" as const;
export const PREVIOUS_SUITE_CATALOG_REVISION = "cclrte-suite-v2" as const;
export const LEGACY_SUITE_CATALOG_REVISION = "cclrte-suite-v1" as const;
export const SUITE_CATALOG_REVISIONS = deepFreeze([
  LEGACY_SUITE_CATALOG_REVISION,
  PREVIOUS_SUITE_CATALOG_REVISION,
  SUITE_CATALOG_REVISION,
] as const);

export const SUITE_PLAN_IDS = deepFreeze(["individual", "business"] as const);
export const SUITE_CURRENT_FEATURE_IDS = deepFreeze([
  "suite.paid",
  "suite.believer",
] as const);
export const SUITE_LEGACY_FEATURE_IDS = deepFreeze([
  "suite.paid",
  "suite.business",
] as const);
export const SUITE_FEATURE_IDS = deepFreeze([
  "suite.paid",
  "suite.believer",
  "suite.business",
] as const);

export type CurrentSuiteCatalogRevision = typeof SUITE_CATALOG_REVISION;
export type PreviousSuiteCatalogRevision =
  typeof PREVIOUS_SUITE_CATALOG_REVISION;
export type LegacySuiteCatalogRevision =
  typeof LEGACY_SUITE_CATALOG_REVISION;
export type SuiteCatalogRevision = (typeof SUITE_CATALOG_REVISIONS)[number];
export type SuitePlanId = (typeof SUITE_PLAN_IDS)[number];
export type CurrentSuiteFeatureId =
  (typeof SUITE_CURRENT_FEATURE_IDS)[number];
export type LegacySuiteFeatureId =
  (typeof SUITE_LEGACY_FEATURE_IDS)[number];
export type SuiteFeatureId = (typeof SUITE_FEATURE_IDS)[number];

export type SuiteCatalogIssue =
  | "invalid-catalog-revision"
  | "invalid-feature"
  | "invalid-plan";

const CURRENT_PLAN_FEATURES = deepFreeze({
  business: ["suite.paid", "suite.believer"],
  individual: ["suite.paid"],
} as const satisfies Readonly<
  Record<SuitePlanId, readonly CurrentSuiteFeatureId[]>
>);

const LEGACY_PLAN_FEATURES = deepFreeze({
  business: ["suite.paid", "suite.business"],
  individual: ["suite.paid"],
} as const satisfies Readonly<
  Record<SuitePlanId, readonly LegacySuiteFeatureId[]>
>);

export function parseSuitePlanId(
  value: unknown,
): Result<SuitePlanId, "invalid-plan"> {
  return value === "individual" || value === "business"
    ? ok(value)
    : err("invalid-plan");
}

export function parseCurrentSuiteFeatureId(
  value: unknown,
): Result<CurrentSuiteFeatureId, "invalid-feature"> {
  return value === "suite.paid" || value === "suite.believer"
    ? ok(value)
    : err("invalid-feature");
}

export function parseSuiteFeatureId(
  value: unknown,
): Result<SuiteFeatureId, "invalid-feature"> {
  return typeof value === "string"
      && (SUITE_FEATURE_IDS as readonly string[]).includes(value)
    ? ok(value as SuiteFeatureId)
    : err("invalid-feature");
}

export function parseSuiteCatalogRevision(
  value: unknown,
): Result<SuiteCatalogRevision, "invalid-catalog-revision"> {
  return value === LEGACY_SUITE_CATALOG_REVISION
      || value === PREVIOUS_SUITE_CATALOG_REVISION
      || value === SUITE_CATALOG_REVISION
    ? ok(value)
    : err("invalid-catalog-revision");
}

/** Return the exact feature order required by a signed protocol revision. */
export function featuresForSuitePlan(
  plan: SuitePlanId,
): CurrentSuiteFeatureId[];
export function featuresForSuitePlan(
  plan: SuitePlanId,
  revision: CurrentSuiteCatalogRevision | PreviousSuiteCatalogRevision,
): CurrentSuiteFeatureId[];
export function featuresForSuitePlan(
  plan: SuitePlanId,
  revision: LegacySuiteCatalogRevision,
): LegacySuiteFeatureId[];
export function featuresForSuitePlan(
  plan: SuitePlanId,
  revision: SuiteCatalogRevision,
): SuiteFeatureId[];
export function featuresForSuitePlan(
  plan: SuitePlanId,
  revision: SuiteCatalogRevision = SUITE_CATALOG_REVISION,
): SuiteFeatureId[] {
  return revision === LEGACY_SUITE_CATALOG_REVISION
    ? [...LEGACY_PLAN_FEATURES[plan]]
    : [...CURRENT_PLAN_FEATURES[plan]];
}

/**
 * Check the current entitlement protocol, not a user's authorization state.
 * Authorization must consume a verified account or entitlement projection.
 */
export function suitePlanIncludesFeature(
  plan: SuitePlanId | null,
  feature: CurrentSuiteFeatureId,
): boolean {
  return plan !== null && featuresForSuitePlan(plan).includes(feature);
}
