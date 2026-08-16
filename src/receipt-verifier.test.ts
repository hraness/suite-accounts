import { describe, expect, test } from "bun:test";
import {
  SUITE_CATALOG_REVISION,
  suiteEntitlementReceiptMessage,
  suiteLinkReceiptMessage,
  type ProductLinkProof,
  type SuiteEntitlementReceipt,
  type SuiteLinkReceipt,
} from "./identity";

import {
  parseSuiteReceiptKeyring,
  selectSuiteReceiptConfiguration,
  signSuiteProductLinkProof,
  verifySuiteEntitlementReceiptSignature,
  verifySuiteLinkReceiptSignature,
} from "./receipt-verifier";

const nowMs = 1_800_000_300_000;
const secret = "a-product-owned-secret-with-at-least-32-bytes";
const keyring = parseSuiteReceiptKeyring(JSON.stringify({
  keys: [{
    environment: "production",
    keyVersion: "v1",
    product: "soundfish",
    secret,
  }],
  version: 1,
}))!;

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

async function signature(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  return encodeBase64Url(new Uint8Array(await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  )));
}

describe("suite receipt server helpers", () => {
  test("parses a bounded exact keyring and rejects duplicate authority", () => {
    expect(keyring.keys).toHaveLength(1);
    expect(Reflect.set(keyring.keys[0]!, "secret", "attacker-secret"))
      .toBe(false);
    expect(Reflect.set(keyring.keys, "0", null)).toBe(false);
    expect(keyring.keys[0]?.secret).toBe(secret);
    expect(parseSuiteReceiptKeyring({
      keys: [{
        environment: "production",
        keyVersion: "v1",
        product: "soundfish",
        secret,
      }],
      version: 1,
    })?.keys[0]?.product).toBe("soundfish");
    expect(parseSuiteReceiptKeyring({
      keys: [{
        environment: "production",
        keyVersion: "v1",
        product: "loops",
        secret,
      }],
      version: 1,
    })).toBeNull();
    expect(parseSuiteReceiptKeyring({
      keys: [
        keyring.keys[0],
        keyring.keys[0],
      ],
      version: 1,
    })).toBeNull();
    expect(parseSuiteReceiptKeyring({
      keys: [{
        environment: "production",
        keyVersion: "v1",
        product: "kitchen",
        secret,
      }],
      version: 1,
    })?.keys[0]?.product).toBe("oprte");
    expect(parseSuiteReceiptKeyring({
      keys: [
        {
          environment: "production",
          keyVersion: "v1",
          product: "kitchen",
          secret,
        },
        {
          environment: "production",
          keyVersion: "v1",
          product: "oprte",
          secret,
        },
      ],
      version: 1,
    })).toBeNull();
    expect(parseSuiteReceiptKeyring({
      keys: [{
        environment: "production",
        keyVersion: "v1",
        product: "soundfish",
        secret: "short",
      }],
      version: 1,
    })).toBeNull();
  });

  test("selects one active key while retaining retired same-environment keys", () => {
    const selected = selectSuiteReceiptConfiguration({
      keys: [
        {
          environment: "production",
          keyVersion: "v1",
          product: "soundfish",
          secret,
        },
        {
          environment: "production",
          keyVersion: "v2",
          product: "soundfish",
          secret: `${secret}-rotated`,
        },
        {
          environment: "staging",
          keyVersion: "v1",
          product: "soundfish",
          secret: `${secret}-staging`,
        },
        {
          environment: "production",
          keyVersion: "v1",
          product: "oprte",
          secret: `${secret}-oprte`,
        },
      ],
      version: 1,
    }, "soundfish", "v2");

    expect(selected?.key).toMatchObject({
      environment: "production",
      keyVersion: "v2",
      product: "soundfish",
    });
    expect(selected?.keyring.keys.map(key => key.keyVersion)).toEqual([
      "v1",
      "v2",
    ]);
    if (selected === null) throw new Error("Missing selected keyring.");
    expect(Reflect.set(selected.key, "keyVersion", "attacker"))
      .toBe(false);
    expect(Reflect.set(selected.keyring.keys, "0", null)).toBe(false);
    expect(selectSuiteReceiptConfiguration(
      selected?.keyring,
      "soundfish",
      "missing",
    )).toBeNull();
    expect(selectSuiteReceiptConfiguration({
      keys: [
        keyring.keys[0],
        {
          ...keyring.keys[0],
          environment: "staging",
        },
      ],
      version: 1,
    }, "soundfish", "v1")?.key).toMatchObject({
      environment: "production",
      keyVersion: "v1",
      product: "soundfish",
    });
  });

  test("signs a valid product proof with only its exact product key", async () => {
    const proof: ProductLinkProof = {
      challengeId: "A".repeat(32),
      environment: "production",
      expiresAtMs: nowMs + 4 * 60_000,
      issuedAtMs: nowMs,
      keyVersion: "v1",
      localSubject: "local-user-17",
      product: "soundfish",
    };
    expect(await signSuiteProductLinkProof(proof, keyring, nowMs))
      .toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(await signSuiteProductLinkProof(
      { ...proof, product: "oprte" },
      keyring,
      nowMs,
    )).toBeNull();
  });

  test("verifies canonical link and entitlement receipts fail closed", async () => {
    const unsignedLink = {
      challengeId: "A".repeat(32),
      environment: "production",
      expiresAtMs: nowMs + 4 * 60_000,
      issuedAtMs: nowMs,
      keyVersion: "v1",
      localSubject: "local-user-17",
      product: "soundfish",
      suiteAccountId: "acct_018f1f7a7a367ccdbd5d706d4dc5c018",
    } as const;
    const link: SuiteLinkReceipt = {
      ...unsignedLink,
      signature: await signature(suiteLinkReceiptMessage(unsignedLink)),
      version: "suite-link-receipt-v1",
    };
    expect(await verifySuiteLinkReceiptSignature(link, keyring, nowMs))
      .toBe(true);
    expect(await verifySuiteLinkReceiptSignature(
      { ...link, localSubject: "other-local-user" },
      keyring,
      nowMs,
    )).toBe(false);

    const unsignedEntitlement = {
      entitlements: {
        catalogRevision: SUITE_CATALOG_REVISION,
        expiresAtMs: nowMs + 8 * 60_000,
        features: ["suite.paid"] as const,
        observedAtMs: nowMs - 1_000,
        projectionRevision: 9,
        version: "suite-entitlements-v1",
      },
      environment: "production",
      expiresAtMs: nowMs + 4 * 60_000,
      issuedAtMs: nowMs,
      keyVersion: "v1",
      product: "soundfish",
      suiteAccountId: "acct_018f1f7a7a367ccdbd5d706d4dc5c018",
    } as const;
    const entitlement: SuiteEntitlementReceipt = {
      ...unsignedEntitlement,
      signature: await signature(
        suiteEntitlementReceiptMessage(unsignedEntitlement),
      ),
      version: "suite-entitlement-receipt-v1",
    };
    expect(await verifySuiteEntitlementReceiptSignature(
      entitlement,
      keyring,
      nowMs,
    )).toBe(true);
    expect(await verifySuiteEntitlementReceiptSignature(
      entitlement,
      keyring,
      nowMs + 5 * 60_000,
    )).toBe(false);
  });

  test("verifies legacy OPRTE receipts with a canonicalized key authority", async () => {
    const legacyKeyring = parseSuiteReceiptKeyring({
      keys: [{
        environment: "production",
        keyVersion: "v1",
        product: "kitchen",
        secret,
      }],
      version: 1,
    });
    if (legacyKeyring === null) throw new Error("Missing legacy test keyring.");
    const unsigned = {
      challengeId: "K".repeat(32),
      environment: "production",
      expiresAtMs: nowMs + 4 * 60_000,
      issuedAtMs: nowMs,
      keyVersion: "v1",
      localSubject: "legacy-oprte-user",
      product: "kitchen",
      suiteAccountId: "acct_018f1f7a7a367ccdbd5d706d4dc5c018",
    } as const;
    const receipt: SuiteLinkReceipt = {
      ...unsigned,
      signature: await signature(suiteLinkReceiptMessage(unsigned)),
      version: "suite-link-receipt-v1",
    };
    expect(await verifySuiteLinkReceiptSignature(
      receipt,
      legacyKeyring,
      nowMs,
    )).toBe(true);
    const unsignedEntitlement = {
      entitlements: {
        catalogRevision: SUITE_CATALOG_REVISION,
        expiresAtMs: nowMs + 8 * 60_000,
        features: ["suite.paid"] as const,
        observedAtMs: nowMs - 1_000,
        projectionRevision: 9,
        version: "suite-entitlements-v1",
      },
      environment: "production",
      expiresAtMs: nowMs + 4 * 60_000,
      issuedAtMs: nowMs,
      keyVersion: "v1",
      product: "kitchen",
      suiteAccountId: "acct_018f1f7a7a367ccdbd5d706d4dc5c018",
    } as const;
    const entitlement: SuiteEntitlementReceipt = {
      ...unsignedEntitlement,
      signature: await signature(
        suiteEntitlementReceiptMessage(unsignedEntitlement),
      ),
      version: "suite-entitlement-receipt-v1",
    };
    expect(await verifySuiteEntitlementReceiptSignature(
      entitlement,
      legacyKeyring,
      nowMs,
    )).toBe(true);
    expect(selectSuiteReceiptConfiguration(
      legacyKeyring,
      "oprte",
      "v1",
    )?.key.product).toBe("oprte");
  });

});
