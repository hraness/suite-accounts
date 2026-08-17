import { describe, expect, expectTypeOf, test } from "bun:test";

import {
  isSuiteIssuableEnvironment,
  parseIssuerSubject,
  parseLegacyPrincipalLink,
  parseSuiteProduct,
  parseSuiteJwtClaims,
  SUITE_PRODUCTS,
  type LegacySuiteProductId,
} from "./principals";

const accountId = "acct_018f1f7a7a367ccdbd5d706d4dc5c018";

describe("suite principals", () => {
  test("keeps issuer and subject exact", () => {
    const parsed = parseIssuerSubject({
      issuer: "https://account.hraness.com",
      subject: "user_01JVQ6F09JTX2TQ5NQWB7XHPE2",
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(String(parsed.value.issuer)).toBe("https://account.hraness.com");
      expect(String(parsed.value.subject)).toBe(
        "user_01JVQ6F09JTX2TQ5NQWB7XHPE2",
      );
    }
    expect(
      parseIssuerSubject({
        issuer: "https://account.hraness.com/path",
        subject: "user_1",
      }),
    ).toEqual({ error: "invalid-issuer", ok: false });
  });

  test("parses current and pre-rename product links", () => {
    const parsed = parseLegacyPrincipalLink({
      environment: "staging",
      legacySubject: "local-user-17",
      product: "crclte",
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.environment).toBe("staging");
      expect(isSuiteIssuableEnvironment(parsed.value.environment)).toBe(false);
      expect(String(parsed.value.legacySubject)).toBe("local-user-17");
      expect(parsed.value.product).toBe("crclte");
    }
    expect(parseLegacyPrincipalLink({
      environment: "production",
      legacySubject: "local-user-17",
      product: "pub",
    }).ok).toBe(true);
    expect(isSuiteIssuableEnvironment("development")).toBe(true);
    expect(isSuiteIssuableEnvironment("production")).toBe(true);
    expect(
      parseLegacyPrincipalLink({
        environment: "production",
        legacySubject: "local-user-17",
        product: "unknown",
      }),
    ).toEqual({ error: "invalid-product", ok: false });
  });

  test("includes current product principals without treating Accounts as one", () => {
    expectTypeOf<LegacySuiteProductId>().toEqualTypeOf<
      "oprte" | "kitchen"
    >();
    expect(SUITE_PRODUCTS).toEqual([
      "soundfish",
      "hra",
      "crclte",
      "pub",
    ]);
    for (const retired of ["itrte", "transmute", "studio", "graphics"]) {
      expect(parseSuiteProduct(retired)).toEqual({
        error: "invalid-product",
        ok: false,
      });
    }
    expect(parseSuiteProduct("soundfish")).toEqual({
      ok: true,
      value: "soundfish",
    });
    expect(parseSuiteProduct("loops")).toEqual({
      error: "invalid-product",
      ok: false,
    });
    expect(parseSuiteProduct("oprte")).toEqual({
      ok: true,
      value: "hra",
    });
    expect(parseSuiteProduct("kitchen")).toEqual({
      ok: true,
      value: "hra",
    });
    expect(parseSuiteProduct("accounts")).toEqual({
      error: "invalid-product",
      ok: false,
    });
  });

  test("canonicalizes legacy OPRTE principal links before they become owned state", () => {
    const parsed = parseLegacyPrincipalLink({
      environment: "production",
      legacySubject: "legacy-oprte-user",
      product: "kitchen",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.environment).toBe("production");
    expect(String(parsed.value.legacySubject)).toBe("legacy-oprte-user");
    expect(parsed.value.product).toBe("hra");
  });

  test("rejects the retired Loops principal identity", () => {
    const parsed = parseLegacyPrincipalLink({
      environment: "production",
      legacySubject: "legacy-loops-user",
      product: "loops",
    });
    expect(parsed).toEqual({ error: "invalid-product", ok: false });
  });

  test("parses structural JWT claims without implying verification", () => {
    const parsed = parseSuiteJwtClaims({
      aud: ["crclte-production"],
      exp: 1_800_000_900,
      iat: 1_800_000_000,
      iss: "https://account.hraness.com",
      nbf: 1_800_000_000,
      profile_complete: true,
      profile_revision: "username-v1",
      sub: "better-auth-user-17",
      suite_account_id: accountId,
      username: "reader",
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.audience).toEqual(["crclte-production"]);
      expect(parsed.value.expiresAtSeconds).toBe(1_800_000_900);
      expect(parsed.value.issuedAtSeconds).toBe(1_800_000_000);
      expect(parsed.value.notBeforeSeconds).toBe(1_800_000_000);
      expect(String(parsed.value.principal.issuer)).toBe(
        "https://account.hraness.com",
      );
      expect(String(parsed.value.principal.subject)).toBe(
        "better-auth-user-17",
      );
      expect(String(parsed.value.suiteAccountId)).toBe(accountId);
      expect(parsed.value.profileComplete).toBe(true);
      expect(parsed.value.profileRevision).toBe("username-v1");
      expect(String(parsed.value.username)).toBe("reader");
    }
  });

  test("treats legacy tokens without profile claims as incomplete", () => {
    const parsed = parseSuiteJwtClaims({
      aud: ["crclte-production"],
      exp: 1_800_000_900,
      iat: 1_800_000_000,
      iss: "https://account.hraness.com",
      sub: "better-auth-user-17",
      suite_account_id: accountId,
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.profileComplete).toBe(false);
      expect(parsed.value.profileRevision).toBeNull();
      expect(parsed.value.username).toBeNull();
    }
  });

  test("rejects contradictory versioned profile claims", () => {
    expect(parseSuiteJwtClaims({
      aud: ["crclte-production"],
      exp: 1_800_000_900,
      iat: 1_800_000_000,
      iss: "https://account.hraness.com",
      profile_complete: true,
      profile_revision: "username-v1",
      sub: "better-auth-user-17",
      suite_account_id: accountId,
      username: null,
    })).toEqual({ error: "invalid-jwt-claims", ok: false });
  });

  test("rejects expired-at-issuance or duplicate-audience claims", () => {
    expect(
      parseSuiteJwtClaims({
        aud: ["crclte", "crclte"],
        exp: 100,
        iat: 100,
        iss: "https://account.hraness.com",
        sub: "user-1",
        suite_account_id: accountId,
      }),
    ).toEqual({ error: "invalid-audience", ok: false });
  });
});
