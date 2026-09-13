import { err, ok, type Result } from "@hraness/result";
import { deepFreeze } from "../immutable.js";

/**
 * Protocol revisions accepted by identity and entitlement readers.
 *
 * Pricing, provider lookup keys, and customer-facing plan copy belong to the
 * Accounts service. This module keeps only the finite values needed to parse
 * signed protocol evidence and to fail closed on feature grants.
 */
export const SUITE_CATALOG_REVISION = "hraness-suite-v4" as const;
export const PREVIOUS_SUITE_CATALOG_REVISION = "cclrte-suite-v3" as const;
export const LEGACY_SUITE_CATALOG_REVISION = "cclrte-suite-v2" as const;
export const ARCHIVED_SUITE_CATALOG_REVISION = "cclrte-suite-v1" as const;
export const SUITE_CATALOG_REVISIONS = deepFreeze([
  ARCHIVED_SUITE_CATALOG_REVISION,
  LEGACY_SUITE_CATALOG_REVISION,
  PREVIOUS_SUITE_CATALOG_REVISION,
  SUITE_CATALOG_REVISION,
] as const);

export const SUITE_PLAN_IDS = deepFreeze(["community", "pro"] as const);
export const SUITE_HISTORICAL_PLAN_IDS = deepFreeze([
  "individual",
  "business",
] as const);
export const SUITE_CURRENT_FEATURE_IDS = deepFreeze([
  "suite.paid",
  "suite.community",
  "suite.pro",
] as const);
export const SUITE_PREVIOUS_FEATURE_IDS = deepFreeze([
  "suite.paid",
  "suite.believer",
] as const);
export const SUITE_LEGACY_FEATURE_IDS = deepFreeze([
  "suite.paid",
  "suite.business",
] as const);
export const SUITE_FEATURE_IDS = deepFreeze([
  "suite.paid",
  "suite.community",
  "suite.pro",
  "suite.believer",
  "suite.business",
] as const);

export type CurrentSuiteCatalogRevision = typeof SUITE_CATALOG_REVISION;
export type PreviousSuiteCatalogRevision =
  typeof PREVIOUS_SUITE_CATALOG_REVISION;
export type LegacySuiteCatalogRevision =
  typeof LEGACY_SUITE_CATALOG_REVISION;
export type ArchivedSuiteCatalogRevision =
  typeof ARCHIVED_SUITE_CATALOG_REVISION;
export type HistoricalSuiteCatalogRevision =
  | ArchivedSuiteCatalogRevision
  | LegacySuiteCatalogRevision
  | PreviousSuiteCatalogRevision;
export type SuiteCatalogRevision = (typeof SUITE_CATALOG_REVISIONS)[number];

export type SuitePlanId = (typeof SUITE_PLAN_IDS)[number];
export type HistoricalSuitePlanId = (typeof SUITE_HISTORICAL_PLAN_IDS)[number];
export type AnySuitePlanId = HistoricalSuitePlanId | SuitePlanId;

export type CurrentSuiteFeatureId =
  (typeof SUITE_CURRENT_FEATURE_IDS)[number];
export type PreviousSuiteFeatureId =
  (typeof SUITE_PREVIOUS_FEATURE_IDS)[number];
export type LegacySuiteFeatureId =
  (typeof SUITE_LEGACY_FEATURE_IDS)[number];
export type SuiteFeatureId = (typeof SUITE_FEATURE_IDS)[number];

export type SuiteCatalogIssue =
  | "invalid-catalog-revision"
  | "invalid-feature"
  | "invalid-plan";

const CURRENT_PLAN_FEATURES = deepFreeze({
  community: ["suite.paid", "suite.community"],
  pro: ["suite.paid", "suite.community", "suite.pro"],
} as const satisfies Readonly<
  Record<SuitePlanId, readonly CurrentSuiteFeatureId[]>
>);

const PREVIOUS_PLAN_FEATURES = deepFreeze({
  business: ["suite.paid", "suite.believer"],
  individual: ["suite.paid"],
} as const satisfies Readonly<
  Record<HistoricalSuitePlanId, readonly PreviousSuiteFeatureId[]>
>);

const LEGACY_PLAN_FEATURES = deepFreeze({
  business: ["suite.paid", "suite.business"],
  individual: ["suite.paid"],
} as const satisfies Readonly<
  Record<HistoricalSuitePlanId, readonly LegacySuiteFeatureId[]>
>);

export function parseSuitePlanId(
  value: unknown,
): Result<SuitePlanId, "invalid-plan">;
export function parseSuitePlanId(
  value: unknown,
  revision: CurrentSuiteCatalogRevision,
): Result<SuitePlanId, "invalid-plan">;
export function parseSuitePlanId(
  value: unknown,
  revision: HistoricalSuiteCatalogRevision,
): Result<HistoricalSuitePlanId, "invalid-plan">;
export function parseSuitePlanId(
  value: unknown,
  revision: SuiteCatalogRevision,
): Result<AnySuitePlanId, "invalid-plan">;
export function parseSuitePlanId(
  value: unknown,
  revision: SuiteCatalogRevision = SUITE_CATALOG_REVISION,
): Result<AnySuitePlanId, "invalid-plan"> {
  const ids: readonly string[] = revision === SUITE_CATALOG_REVISION
    ? SUITE_PLAN_IDS
    : SUITE_HISTORICAL_PLAN_IDS;
  return typeof value === "string" && ids.includes(value)
    ? ok(value as AnySuitePlanId)
    : err("invalid-plan");
}

export function parseAnySuitePlanId(
  value: unknown,
): Result<AnySuitePlanId, "invalid-plan"> {
  return typeof value === "string" &&
      ([...SUITE_PLAN_IDS, ...SUITE_HISTORICAL_PLAN_IDS] as readonly string[])
        .includes(value)
    ? ok(value as AnySuitePlanId)
    : err("invalid-plan");
}

export function parseCurrentSuiteFeatureId(
  value: unknown,
): Result<CurrentSuiteFeatureId, "invalid-feature"> {
  return value === "suite.paid" || value === "suite.community"
      || value === "suite.pro"
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
  return typeof value === "string"
      && (SUITE_CATALOG_REVISIONS as readonly string[]).includes(value)
    ? ok(value as SuiteCatalogRevision)
    : err("invalid-catalog-revision");
}

/** Return the exact feature order required by a signed protocol revision. */
export function featuresForSuitePlan(
  plan: SuitePlanId,
): CurrentSuiteFeatureId[];
export function featuresForSuitePlan(
  plan: SuitePlanId,
  revision: CurrentSuiteCatalogRevision,
): CurrentSuiteFeatureId[];
export function featuresForSuitePlan(
  plan: HistoricalSuitePlanId,
  revision: LegacySuiteCatalogRevision | PreviousSuiteCatalogRevision,
): PreviousSuiteFeatureId[];
export function featuresForSuitePlan(
  plan: HistoricalSuitePlanId,
  revision: ArchivedSuiteCatalogRevision,
): LegacySuiteFeatureId[];
export function featuresForSuitePlan(
  plan: AnySuitePlanId,
  revision: SuiteCatalogRevision,
): SuiteFeatureId[];
export function featuresForSuitePlan(
  plan: AnySuitePlanId,
  revision: SuiteCatalogRevision = SUITE_CATALOG_REVISION,
): SuiteFeatureId[] {
  const table: Readonly<Record<string, readonly SuiteFeatureId[]>> =
    revision === SUITE_CATALOG_REVISION
      ? CURRENT_PLAN_FEATURES
      : revision === ARCHIVED_SUITE_CATALOG_REVISION
        ? LEGACY_PLAN_FEATURES
        : PREVIOUS_PLAN_FEATURES;
  const features = table[plan];
  return features === undefined ? [] : [...features];
}

/** Return every finite feature set a revision can grant, including the empty set. */
export function grantedSuiteFeatureSets(
  revision: SuiteCatalogRevision,
): readonly (readonly SuiteFeatureId[])[] {
  if (revision === SUITE_CATALOG_REVISION) {
    return deepFreeze([
      [],
      CURRENT_PLAN_FEATURES.community,
      CURRENT_PLAN_FEATURES.pro,
    ] as const);
  }
  const table = revision === ARCHIVED_SUITE_CATALOG_REVISION
    ? LEGACY_PLAN_FEATURES
    : PREVIOUS_PLAN_FEATURES;
  return deepFreeze([
    [],
    table.individual,
    table.business,
  ] as const);
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
