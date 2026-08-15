import { describe, expect, test } from "bun:test";

import {
  generateSuiteAccountId,
  generateSuiteInvoiceRef,
  parseSuiteAccountId,
  parseSuiteInvoiceRef,
} from "./identifiers";

describe("suite account IDs", () => {
  test("generates a branded opaque ID without retaining UUID punctuation", () => {
    expect(
      String(
        generateSuiteAccountId(
          () => "018f1f7a-7a36-7ccd-bd5d-706d4dc5c018",
        ),
      ),
    ).toBe("acct_018f1f7a7a367ccdbd5d706d4dc5c018");
  });

  test("rejects malformed and non-canonical IDs", () => {
    const parsed = parseSuiteAccountId(
      "acct_018f1f7a7a367ccdbd5d706d4dc5c018",
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(String(parsed.value)).toBe(
        "acct_018f1f7a7a367ccdbd5d706d4dc5c018",
      );
    }
    expect(
      parseSuiteAccountId("ACCT_018F1F7A7A367CCDBD5D706D4DC5C018"),
    ).toEqual({ error: "invalid-suite-account-id", ok: false });
  });

  test("rejects a broken randomness seam", () => {
    expect(() => generateSuiteAccountId(() => "predictable")).toThrow(
      "did not return a UUID",
    );
  });
});

describe("suite invoice references", () => {
  test("generates a provider-neutral opaque reference", () => {
    expect(
      String(
        generateSuiteInvoiceRef(
          () => "018f1f7a-7a36-7ccd-bd5d-706d4dc5c018",
        ),
      ),
    ).toBe("invref_018f1f7a7a367ccdbd5d706d4dc5c018");
  });

  test("rejects provider identifiers, URLs, and malformed references", () => {
    const parsed = parseSuiteInvoiceRef(
      "invref_018f1f7a7a367ccdbd5d706d4dc5c018",
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(String(parsed.value)).toBe(
        "invref_018f1f7a7a367ccdbd5d706d4dc5c018",
      );
    }
    expect(parseSuiteInvoiceRef("in_provider_invoice")).toEqual({
      error: "invalid-suite-invoice-ref",
      ok: false,
    });
    expect(
      parseSuiteInvoiceRef("https://invoice.stripe.com/i/example"),
    ).toEqual({
      error: "invalid-suite-invoice-ref",
      ok: false,
    });
    expect(parseSuiteInvoiceRef("invref_predictable")).toEqual({
      error: "invalid-suite-invoice-ref",
      ok: false,
    });
  });

  test("rejects a broken randomness seam", () => {
    expect(() => generateSuiteInvoiceRef(() => "predictable")).toThrow(
      "did not return a UUID",
    );
  });
});
