import { describe, expect, test } from "bun:test";

import {
  IDENTITY_LINK_MAX_TTL_MS,
  IDENTITY_LINK_RECEIPT_VERSION,
  productLinkProofMessage,
  SUITE_ENTITLEMENT_RECEIPT_MAX_TTL_MS,
  SUITE_ENTITLEMENT_RECEIPT_VERSION,
  SUITE_ENTITLEMENTS_CLAIM_VERSION,
  suiteEntitlementReceiptMessage,
  suiteLinkReceiptMessage,
  validateProductLinkProof,
  validateSuiteEntitlementReceipt,
  validateSuiteEntitlementsClaim,
  validateSuiteLinkReceipt,
  type ProductLinkProof,
  type SuiteEntitlementReceipt,
  type SuiteLinkReceipt,
} from "./links";

const issuedAtMs = 1_800_000_000_000;
const proof = {
  challengeId: "0123456789abcdefghijkl",
  environment: "production",
  expiresAtMs: issuedAtMs + IDENTITY_LINK_MAX_TTL_MS,
  issuedAtMs,
  keyVersion: "v1",
  localSubject: "local-user-1",
  product: "gnrte",
} as const satisfies ProductLinkProof;

describe("suite identity-link contract", () => {
  test("canonicalizes product proof and receipt messages exactly", () => {
    expect(productLinkProofMessage(proof)).toBe(
      '["suite-product-link-proof-v1","gnrte","production",'
        + '"local-user-1","0123456789abcdefghijkl",1800000000000,'
        + '1800000300000,"v1"]',
    );
    expect(suiteLinkReceiptMessage({
      ...proof,
      suiteAccountId: "acct_0123456789abcdef0123456789abcdef",
    })).toBe(
      '["suite-link-receipt-v1","gnrte","production","local-user-1",'
        + '"acct_0123456789abcdef0123456789abcdef",'
        + '"0123456789abcdefghijkl",'
        + '1800000000000,1800000300000,"v1"]',
    );
  });

  test("accepts a current bounded proof and exact receipt shape", () => {
    expect(validateProductLinkProof(proof, issuedAtMs)).toBeNull();
    expect(validateProductLinkProof({
      ...proof,
      product: "soundfish",
    }, issuedAtMs)).toBeNull();
    const receipt = {
      ...proof,
      signature: "A".repeat(43),
      suiteAccountId: "acct_0123456789abcdef0123456789abcdef",
      version: IDENTITY_LINK_RECEIPT_VERSION,
    } as const satisfies SuiteLinkReceipt;
    expect(validateSuiteLinkReceipt(receipt, issuedAtMs)).toBeNull();
  });

  test("rejects the retired Loops wire identity", () => {
    const legacyProof = {
      ...proof,
      product: "loops",
    } as unknown as ProductLinkProof;
    expect(validateProductLinkProof(legacyProof, issuedAtMs)).toBe("invalid");
  });

  test("accepts legacy OPRTE wire identity without changing signed bytes", () => {
    const legacyProof = {
      ...proof,
      product: "kitchen",
    } as const satisfies ProductLinkProof;
    expect(validateProductLinkProof(legacyProof, issuedAtMs)).toBeNull();
    expect(productLinkProofMessage(legacyProof)).toContain(
      '"kitchen","production"',
    );
    expect(productLinkProofMessage({
      ...legacyProof,
      product: "oprte",
    })).toContain('"oprte","production"');
  });

  test("rejects expiry, excessive lifetime, and malformed receipt identity", () => {
    expect(validateProductLinkProof(proof, proof.expiresAtMs)).toBe("expired");
    expect(validateProductLinkProof({
      ...proof,
      expiresAtMs: proof.expiresAtMs + 1,
    }, issuedAtMs)).toBe("invalid");
    expect(validateSuiteLinkReceipt({
      ...proof,
      signature: "short",
      suiteAccountId: "not-a-suite-account",
      version: IDENTITY_LINK_RECEIPT_VERSION,
    }, issuedAtMs)).toBe("invalid");
  });
});

describe("suite entitlement projection receipt contract", () => {
  const entitlements = {
    catalogRevision: "cclrte-suite-v3",
    expiresAtMs: issuedAtMs + 15 * 60_000,
    features: ["suite.paid", "suite.believer"],
    observedAtMs: issuedAtMs - 60_000,
    projectionRevision: 7,
    version: SUITE_ENTITLEMENTS_CLAIM_VERSION,
  } as const;
  const receipt = {
    entitlements,
    environment: "production",
    expiresAtMs: issuedAtMs + SUITE_ENTITLEMENT_RECEIPT_MAX_TTL_MS,
    issuedAtMs,
    keyVersion: "v1",
    product: "gnrte",
    signature: "B".repeat(43),
    suiteAccountId: "acct_0123456789abcdef0123456789abcdef",
    version: SUITE_ENTITLEMENT_RECEIPT_VERSION,
  } as const satisfies SuiteEntitlementReceipt;

  test("canonicalizes the complete signed projection without object-key ambiguity", () => {
    expect(suiteEntitlementReceiptMessage(receipt)).toBe(
      '["suite-entitlement-receipt-v1","gnrte","production",'
        + '"acct_0123456789abcdef0123456789abcdef","v1",'
        + '1800000000000,1800000300000,"suite-entitlements-v1",'
        + '"cclrte-suite-v3",1799999940000,1800000900000,7,'
        + '["suite.paid","suite.believer"]]',
    );
  });

  test("accepts only the current feature inheritance shape", () => {
    expect(validateSuiteEntitlementsClaim(entitlements)).toBe(true);
    expect(validateSuiteEntitlementsClaim({
      ...entitlements,
      features: ["suite.believer"],
    })).toBe(false);
    expect(validateSuiteEntitlementsClaim({
      ...entitlements,
      features: ["suite.believer", "suite.paid"],
    })).toBe(false);
  });

  test("rejects retired product entitlement bytes", () => {
    for (const product of ["loops", "transmute", "studio", "graphics"]) {
      const legacy = {
        ...receipt,
        product,
      } as unknown as SuiteEntitlementReceipt;
      expect(validateSuiteEntitlementReceipt(legacy, issuedAtMs)).toBe("invalid");
    }
  });

  test("accepts a bounded current receipt and rejects expiry or privilege drift", () => {
    expect(validateSuiteEntitlementReceipt(receipt, issuedAtMs)).toBeNull();
    expect(validateSuiteEntitlementReceipt(receipt, receipt.expiresAtMs))
      .toBe("expired");
    expect(validateSuiteEntitlementReceipt({
      ...receipt,
      entitlements: {
        ...entitlements,
        expiresAtMs: receipt.expiresAtMs - 1,
      },
    }, issuedAtMs)).toBe("invalid");
    expect(validateSuiteEntitlementReceipt({
      ...receipt,
      issuedAtMs: issuedAtMs + 31_000,
    }, issuedAtMs)).toBe("not-yet-valid");
  });
});
