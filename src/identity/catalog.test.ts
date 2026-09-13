import { describe, expect, test } from "bun:test";

import {
  featuresForSuitePlan,
  ARCHIVED_SUITE_CATALOG_REVISION,
  grantedSuiteFeatureSets,
  LEGACY_SUITE_CATALOG_REVISION,
  parseAnySuitePlanId,
  parseCurrentSuiteFeatureId,
  parseSuiteCatalogRevision,
  parseSuiteFeatureId,
  parseSuitePlanId,
  PREVIOUS_SUITE_CATALOG_REVISION,
  SUITE_CATALOG_REVISION,
  suitePlanIncludesFeature,
} from "./catalog";

describe("suite entitlement protocol catalog", () => {
  test("keeps current and historical signed revisions exact", () => {
    expect(parseSuiteCatalogRevision(SUITE_CATALOG_REVISION)).toEqual({
      ok: true,
      value: SUITE_CATALOG_REVISION,
    });
    expect(parseSuiteCatalogRevision(PREVIOUS_SUITE_CATALOG_REVISION).ok)
      .toBe(true);
    expect(parseSuiteCatalogRevision(LEGACY_SUITE_CATALOG_REVISION).ok)
      .toBe(true);
    expect(parseSuiteCatalogRevision(ARCHIVED_SUITE_CATALOG_REVISION).ok)
      .toBe(true);
    expect(parseSuiteCatalogRevision("v5").ok).toBe(false);
  });

  test("keeps price and provider metadata outside the protocol", () => {
    expect(featuresForSuitePlan("community")).toEqual([
      "suite.paid",
      "suite.community",
    ]);
    expect(featuresForSuitePlan("pro")).toEqual([
      "suite.paid",
      "suite.community",
      "suite.pro",
    ]);
    expect(featuresForSuitePlan("individual", PREVIOUS_SUITE_CATALOG_REVISION))
      .toEqual(["suite.paid"]);
    expect(featuresForSuitePlan("business", PREVIOUS_SUITE_CATALOG_REVISION))
      .toEqual(["suite.paid", "suite.believer"]);
    expect(featuresForSuitePlan("business", LEGACY_SUITE_CATALOG_REVISION))
      .toEqual(["suite.paid", "suite.believer"]);
    expect(featuresForSuitePlan("business", ARCHIVED_SUITE_CATALOG_REVISION))
      .toEqual(["suite.paid", "suite.business"]);
  });

  test("fails closed on cross-revision plans and features", () => {
    expect(featuresForSuitePlan("community" as never, PREVIOUS_SUITE_CATALOG_REVISION))
      .toEqual([]);
    expect(featuresForSuitePlan("individual" as never, SUITE_CATALOG_REVISION))
      .toEqual([]);
    expect(parseSuitePlanId("community").ok).toBe(true);
    expect(parseSuitePlanId("pro").ok).toBe(true);
    expect(parseSuitePlanId("individual").ok).toBe(false);
    expect(parseSuitePlanId("individual", PREVIOUS_SUITE_CATALOG_REVISION).ok)
      .toBe(true);
    expect(parseSuitePlanId("community", PREVIOUS_SUITE_CATALOG_REVISION).ok)
      .toBe(false);
    expect(parseAnySuitePlanId("individual").ok).toBe(true);
    expect(parseAnySuitePlanId("pro").ok).toBe(true);
    expect(parseSuitePlanId("enterprise").ok).toBe(false);
    expect(parseCurrentSuiteFeatureId("suite.business").ok).toBe(false);
    expect(parseCurrentSuiteFeatureId("suite.pro").ok).toBe(true);
    expect(parseSuiteFeatureId("suite.business").ok).toBe(true);
    expect(parseSuiteFeatureId("suite.believer").ok).toBe(true);
    expect(parseSuiteFeatureId("suite.admin").ok).toBe(false);
  });

  test("enumerates the finite grant sets per revision", () => {
    expect(grantedSuiteFeatureSets(SUITE_CATALOG_REVISION)).toEqual([
      [],
      ["suite.paid", "suite.community"],
      ["suite.paid", "suite.community", "suite.pro"],
    ]);
    expect(grantedSuiteFeatureSets(PREVIOUS_SUITE_CATALOG_REVISION)).toEqual([
      [],
      ["suite.paid"],
      ["suite.paid", "suite.believer"],
    ]);
    expect(grantedSuiteFeatureSets(LEGACY_SUITE_CATALOG_REVISION)).toEqual([
      [],
      ["suite.paid"],
      ["suite.paid", "suite.believer"],
    ]);
    expect(grantedSuiteFeatureSets(ARCHIVED_SUITE_CATALOG_REVISION)).toEqual([
      [],
      ["suite.paid"],
      ["suite.paid", "suite.business"],
    ]);
  });

  test("does not mistake catalog membership for authorization", () => {
    expect(suitePlanIncludesFeature("pro", "suite.pro")).toBe(true);
    expect(suitePlanIncludesFeature("pro", "suite.community")).toBe(true);
    expect(suitePlanIncludesFeature("community", "suite.pro")).toBe(false);
    expect(suitePlanIncludesFeature("community", "suite.community")).toBe(true);
    expect(suitePlanIncludesFeature(null, "suite.paid")).toBe(false);
  });
});
