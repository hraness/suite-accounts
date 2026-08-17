import { describe, expect, test } from "bun:test";

import {
  createSuiteAccountsClientConfiguration,
  SUITE_ACCOUNTS_CLIENT_CONFIGURATION_VERSION,
  SUITE_ACCOUNTS_WIRE_VERSION,
} from "./client-configuration";

const hraBinding = {
  authMode: "oidc-rp",
  callbackUrl: "https://hra.sh/api/suite-auth/callback",
  clientId: "hraness:hra:production:v1",
  consumer: "hra",
  environment: "production",
  origin: "https://hra.sh",
} as const;

describe("suite Accounts client configuration", () => {
  test("derives every authority-controlled value from one exact binding", () => {
    const result = createSuiteAccountsClientConfiguration(hraBinding);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      authBasePath: "/api/suite-auth",
      binding: hraBinding,
      configurationVersion: SUITE_ACCOUNTS_CLIENT_CONFIGURATION_VERSION,
      provider: {
        authorizationEndpoint:
          "https://account.hraness.com/api/auth/oauth2/authorize",
        discoveryEndpoint:
          "https://account.hraness.com/.well-known/openid-configuration",
        entitlementReceiptEndpoint:
          "https://account.hraness.com/suite/entitlements/receipt",
        identityLinkReceiptEndpoint:
          "https://account.hraness.com/suite/identity-links/receipt",
        issuer: "https://account.hraness.com",
        jwksEndpoint: "https://account.hraness.com/api/auth/jwks",
        resource: "https://hraness.com/suite",
        revocationEndpoint:
          "https://account.hraness.com/api/auth/oauth2/revoke",
        tokenEndpoint: "https://account.hraness.com/api/auth/oauth2/token",
        userInfoAudience:
          "https://account.hraness.com/api/auth/oauth2/userinfo",
      },
      wireVersion: SUITE_ACCOUNTS_WIRE_VERSION,
    });
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.binding)).toBe(true);
    expect(Object.isFrozen(result.value.provider)).toBe(true);
    expect(Reflect.set(
      result.value.provider,
      "issuer",
      "https://attacker.example",
    )).toBe(false);
    expect(Reflect.set(
      result.value.binding,
      "origin",
      "https://attacker.example",
    )).toBe(false);
    expect(result.value.provider.issuer).toBe("https://account.hraness.com");
    expect(result.value.binding.origin).toBe("https://hra.sh");
  });

  test("rejects every caller-selected trust value", () => {
    for (const field of ["issuer", "jwksEndpoint", "resource", "wireVersion"]) {
      expect(createSuiteAccountsClientConfiguration({
        ...hraBinding,
        [field]: "https://attacker.example",
      })).toEqual({ error: "invalid-binding", ok: false });
    }
  });

  test("rejects hidden, symbolic, and accessor binding fields", () => {
    const hidden: Record<PropertyKey, unknown> = { ...hraBinding };
    Object.defineProperty(hidden, "issuer", {
      enumerable: false,
      value: "https://attacker.example",
    });
    expect(createSuiteAccountsClientConfiguration(hidden)).toEqual({
      error: "invalid-binding",
      ok: false,
    });

    const symbolic = {
      ...hraBinding,
      [Symbol("jwksEndpoint")]: "https://attacker.example/jwks",
    };
    expect(createSuiteAccountsClientConfiguration(symbolic)).toEqual({
      error: "invalid-binding",
      ok: false,
    });

    let consumerReads = 0;
    const accessor: Record<string, unknown> = { ...hraBinding };
    Object.defineProperty(accessor, "consumer", {
      enumerable: true,
      get() {
        consumerReads += 1;
        return "hra";
      },
    });
    expect(createSuiteAccountsClientConfiguration(accessor)).toEqual({
      error: "invalid-binding",
      ok: false,
    });
    expect(consumerReads).toBe(0);
  });

  test("turns reflective proxy failures into an invalid binding", () => {
    const hostile = new Proxy({ ...hraBinding }, {
      ownKeys() {
        throw new Error("hostile ownKeys trap");
      },
    });
    expect(createSuiteAccountsClientConfiguration(hostile)).toEqual({
      error: "invalid-binding",
      ok: false,
    });
  });

  test("snapshots each data descriptor once without reading through the object", () => {
    let descriptorReads = 0;
    let propertyReads = 0;
    let ownKeyReads = 0;
    const observed = new Proxy({ ...hraBinding }, {
      get() {
        propertyReads += 1;
        throw new Error("binding properties must not be read directly");
      },
      getOwnPropertyDescriptor(target, property) {
        descriptorReads += 1;
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
      ownKeys(target) {
        ownKeyReads += 1;
        return Reflect.ownKeys(target);
      },
    });

    expect(createSuiteAccountsClientConfiguration(observed).ok).toBe(true);
    expect(ownKeyReads).toBe(1);
    expect(descriptorReads).toBe(6);
    expect(propertyReads).toBe(0);
  });

  test("rejects a different origin, client, callback, or auth mode", () => {
    const mutations = [
      { ...hraBinding, origin: "https://example.com" },
      { ...hraBinding, clientId: "hraness:soundfish:production:v1" },
      { ...hraBinding, callbackUrl: "https://hra.sh/callback" },
      { ...hraBinding, authMode: "proxy" },
    ] as const;
    for (const mutation of mutations) {
      expect(createSuiteAccountsClientConfiguration(mutation).ok).toBe(false);
    }
  });

  test("keeps the OPRTE client available for the bounded rollback window", () => {
    const result = createSuiteAccountsClientConfiguration({
      authMode: "oidc-rp",
      callbackUrl: "https://oprte.com/api/suite-auth/callback",
      clientId: "hraness:oprte:production:v1",
      consumer: "oprte",
      environment: "production",
      origin: "https://oprte.com",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.binding.consumer).toBe("oprte");
    expect(result.value.binding.origin).toBe("https://oprte.com");
  });

  test("rejects the retired proxy client even with its frozen v1 binding", () => {
    expect(createSuiteAccountsClientConfiguration({
      authMode: "proxy",
      callbackUrl: null,
      clientId: null,
      consumer: "draw-money",
      environment: "production",
      origin: "https://draw.money",
    })).toEqual({ error: "invalid-consumer", ok: false });
  });

  test("does not admit retired registrations into the new boundary", () => {
    expect(createSuiteAccountsClientConfiguration({
      authMode: "oauth-cli",
      callbackUrl: "http://127.0.0.1:49671/oauth/callback",
      clientId: "hraness:graphics:production:v1",
      consumer: "graphics",
      environment: "production",
      origin: "https://hraness.graphics",
    })).toEqual({ error: "invalid-consumer", ok: false });
  });
});
