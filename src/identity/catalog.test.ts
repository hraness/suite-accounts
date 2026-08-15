import { describe, expect, test } from "bun:test";

import {
  featuresForSuitePlan,
  LEGACY_SUITE_CATALOG_REVISION,
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
    expect(parseSuiteCatalogRevision("v4").ok).toBe(false);
  });

  test("keeps price and provider metadata outside the protocol", () => {
    expect(featuresForSuitePlan("individual")).toEqual(["suite.paid"]);
    expect(featuresForSuitePlan("business")).toEqual([
      "suite.paid",
      "suite.believer",
    ]);
    expect(featuresForSuitePlan("business", LEGACY_SUITE_CATALOG_REVISION))
      .toEqual(["suite.paid", "suite.business"]);
  });

  test("parses only finite plan and feature values", () => {
    expect(parseSuitePlanId("individual").ok).toBe(true);
    expect(parseSuitePlanId("enterprise").ok).toBe(false);
    expect(parseCurrentSuiteFeatureId("suite.business").ok).toBe(false);
    expect(parseSuiteFeatureId("suite.business").ok).toBe(true);
    expect(parseSuiteFeatureId("suite.admin").ok).toBe(false);
  });

  test("does not mistake catalog membership for authorization", () => {
    expect(suitePlanIncludesFeature("business", "suite.believer")).toBe(true);
    expect(suitePlanIncludesFeature("individual", "suite.believer")).toBe(false);
    expect(suitePlanIncludesFeature(null, "suite.paid")).toBe(false);
  });
});
