import { describe, expect, test } from "bun:test";
import { SUITE_CATALOG_REVISION } from "./identity";

import {
  decideSuiteEntitlementReceiptProjection,
  suiteTokenGrantsFeature,
  verifySuiteEntitlementToken,
} from "./entitlements";

const nowMs = 1_800_000_300_000;

function payload(overrides: Record<string, unknown> = {}) {
  return {
    aud: ["soundfish-production"],
    exp: 1_800_000_900,
    iat: 1_800_000_000,
    iss: "https://account.hraness.com",
    nbf: 1_800_000_000,
    profile_complete: true,
    profile_revision: "username-v1",
    sub: "better-auth-user-17",
    suite_account_id: "acct_018f1f7a7a367ccdbd5d706d4dc5c018",
    username: "reader",
    ...overrides,
  };
}

const options = {
  expectedAudience: "soundfish-production",
  expectedIssuer: "https://account.hraness.com",
  nowMs,
  verify: () => Promise.resolve(payload()),
} as const;

describe("suite entitlement JWT authorization", () => {
  test("grants only fresh current-catalog features after injected verification", async () => {
    const result = await verifySuiteEntitlementToken("signed.jwt.value", {
      ...options,
      verify: () => Promise.resolve(payload({
        suite_entitlements: {
          catalogRevision: SUITE_CATALOG_REVISION,
          expiresAtMs: 1_800_000_600_000,
          features: ["suite.paid", "suite.believer"],
          observedAtMs: 1_800_000_290_000,
          projectionRevision: 7,
          version: "suite-entitlements-v1",
        },
      })),
    });
    expect(result.kind).toBe("verified");
    expect(suiteTokenGrantsFeature(result, "suite.paid")).toBe(true);
    expect(suiteTokenGrantsFeature(result, "suite.believer")).toBe(true);
  });

  test("legacy identity tokens verify but grant no features", async () => {
    const result = await verifySuiteEntitlementToken(
      "legacy.jwt.value",
      options,
    );
    expect(result).toMatchObject({
      entitlements: { features: [], kind: "legacy" },
      kind: "verified",
    });
    expect(suiteTokenGrantsFeature(result, "suite.paid")).toBe(false);
  });

  test("stale claims preserve diagnostics but fail feature checks closed", async () => {
    const result = await verifySuiteEntitlementToken("signed.jwt.value", {
      ...options,
      maxProjectionAgeMs: 60_000,
      verify: () => Promise.resolve(payload({
        suite_entitlements: {
          catalogRevision: SUITE_CATALOG_REVISION,
          expiresAtMs: 1_800_000_600_000,
          features: ["suite.paid"],
          observedAtMs: 1_800_000_000_000,
          projectionRevision: 1,
          version: "suite-entitlements-v1",
        },
      })),
    });
    expect(result).toMatchObject({
      entitlements: { features: [], kind: "stale" },
      kind: "verified",
    });
    expect(suiteTokenGrantsFeature(result, "suite.paid")).toBe(false);
  });

  test("a fresh token cannot renew provider evidence older than 26 hours", async () => {
    const result = await verifySuiteEntitlementToken("new.jwt.value", {
      ...options,
      verify: () => Promise.resolve(payload({
        suite_entitlements: {
          catalogRevision: SUITE_CATALOG_REVISION,
          expiresAtMs: 1_800_000_600_000,
          features: ["suite.paid"],
          observedAtMs: nowMs - 27 * 60 * 60_000,
          projectionRevision: 4,
          version: "suite-entitlements-v1",
        },
      })),
    });
    expect(result).toMatchObject({
      entitlements: { features: [], kind: "stale" },
      kind: "verified",
    });
    expect(suiteTokenGrantsFeature(result, "suite.paid")).toBe(false);
  });

  test("rejects unverified, wrong-realm, malformed, and overlong claims", async () => {
    expect(await verifySuiteEntitlementToken("signed.jwt.value", {
      ...options,
      verify: () => Promise.reject(new Error("bad signature")),
    })).toEqual({ kind: "invalid", reason: "signature" });
    expect(await verifySuiteEntitlementToken("signed.jwt.value", {
      ...options,
      expectedAudience: "oprte-production",
    })).toEqual({ kind: "invalid", reason: "audience" });
    expect(await verifySuiteEntitlementToken("signed.jwt.value", {
      ...options,
      verify: () => Promise.resolve(payload({
        suite_entitlements: {
          catalogRevision: "cclrte-suite-v1",
          expiresAtMs: 1_800_001_000_000,
          features: ["suite.business"],
          observedAtMs: 1_800_000_290_000,
          projectionRevision: 1,
          version: "suite-entitlements-v1",
        },
      })),
    })).toEqual({ kind: "invalid", reason: "entitlements" });
    expect(await verifySuiteEntitlementToken("signed.jwt.value", {
      ...options,
      maxTokenLifetimeMs: 100_000,
    })).toEqual({ kind: "invalid", reason: "time" });
  });
});

describe("signed entitlement receipt projection ordering", () => {
  const projection = {
    expiresAtMs: nowMs + 600_000,
    features: ["suite.paid"] as const,
    observedAtMs: nowMs - 60_000,
    projectionRevision: 7,
    receiptIssuedAtMs: nowMs,
    suiteAccountId: "acct_018f1f7a7a367ccdbd5d706d4dc5c018",
  };

  test("inserts once and accepts only an exact same-receipt replay", () => {
    expect(decideSuiteEntitlementReceiptProjection(null, projection))
      .toBe("insert");
    expect(decideSuiteEntitlementReceiptProjection(projection, projection))
      .toBe("replay");
    expect(decideSuiteEntitlementReceiptProjection(projection, {
      ...projection,
      expiresAtMs: projection.expiresAtMs + 1,
    })).toBe("conflict");
  });

  test("uses newer signed receipt issuance within one provider revision", () => {
    expect(decideSuiteEntitlementReceiptProjection(projection, {
      ...projection,
      expiresAtMs: projection.expiresAtMs + 60_000,
      receiptIssuedAtMs: projection.receiptIssuedAtMs + 60_000,
    })).toBe("replace");
    expect(decideSuiteEntitlementReceiptProjection(projection, {
      ...projection,
      expiresAtMs: projection.expiresAtMs + 120_000,
      features: [],
      observedAtMs: projection.observedAtMs + 120_000,
      receiptIssuedAtMs: projection.receiptIssuedAtMs + 120_000,
    })).toBe("replace");
  });

  test("rejects every older source, observation, or receipt clock", () => {
    for (const candidate of [
      {
        ...projection,
        projectionRevision: projection.projectionRevision - 1,
        receiptIssuedAtMs: projection.receiptIssuedAtMs + 1,
      },
      {
        ...projection,
        observedAtMs: projection.observedAtMs - 1,
        projectionRevision: projection.projectionRevision + 1,
        receiptIssuedAtMs: projection.receiptIssuedAtMs + 1,
      },
      {
        ...projection,
        projectionRevision: projection.projectionRevision + 1,
        receiptIssuedAtMs: projection.receiptIssuedAtMs - 1,
      },
    ]) {
      expect(decideSuiteEntitlementReceiptProjection(projection, candidate))
        .toBe("conflict");
    }
  });

  test("makes an optional receipt digest part of exact replay only", () => {
    const digested = {
      ...projection,
      receiptDigest: "a".repeat(64),
    };
    expect(decideSuiteEntitlementReceiptProjection(digested, digested))
      .toBe("replay");
    expect(decideSuiteEntitlementReceiptProjection(digested, {
      ...digested,
      receiptDigest: "b".repeat(64),
    })).toBe("conflict");
    expect(decideSuiteEntitlementReceiptProjection(digested, {
      ...digested,
      receiptDigest: "b".repeat(64),
      receiptIssuedAtMs: projection.receiptIssuedAtMs + 1,
    })).toBe("replace");
  });

  test("lets the first post-upgrade receipt backfill a legacy row", () => {
    expect(decideSuiteEntitlementReceiptProjection(
      { ...projection, receiptIssuedAtMs: 0 },
      {
        ...projection,
        expiresAtMs: projection.expiresAtMs + 1,
        receiptIssuedAtMs: projection.receiptIssuedAtMs + 1,
      },
    )).toBe("replace");
  });
});
