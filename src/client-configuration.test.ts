import { describe, expect, test } from "bun:test";

import {
  createSuiteAccountsClientConfiguration,
  SUITE_ACCOUNTS_CLIENT_CONFIGURATION_VERSION,
  SUITE_ACCOUNTS_WIRE_VERSION,
} from "./client-configuration";

const oprteBinding = {
  authMode: "oidc-rp",
  callbackUrl: "https://oprte.com/api/suite-auth/callback",
  clientId: "hraness:oprte:production:v1",
  consumer: "oprte",
  environment: "production",
  origin: "https://oprte.com",
} as const;

describe("suite Accounts client configuration", () => {
  test("derives every authority-controlled value from one exact binding", () => {
    const result = createSuiteAccountsClientConfiguration(oprteBinding);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      authBasePath: "/api/suite-auth",
      binding: oprteBinding,
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
    expect(result.value.binding.origin).toBe("https://oprte.com");
  });

  test("rejects every caller-selected trust value", () => {
    for (const field of ["issuer", "jwksEndpoint", "resource", "wireVersion"]) {
      expect(createSuiteAccountsClientConfiguration({
        ...oprteBinding,
        [field]: "https://attacker.example",
      })).toEqual({ error: "invalid-binding", ok: false });
    }
  });

  test("rejects hidden, symbolic, and accessor binding fields", () => {
    const hidden: Record<PropertyKey, unknown> = { ...oprteBinding };
    Object.defineProperty(hidden, "issuer", {
      enumerable: false,
      value: "https://attacker.example",
    });
    expect(createSuiteAccountsClientConfiguration(hidden)).toEqual({
      error: "invalid-binding",
      ok: false,
    });

    const symbolic = {
      ...oprteBinding,
      [Symbol("jwksEndpoint")]: "https://attacker.example/jwks",
    };
    expect(createSuiteAccountsClientConfiguration(symbolic)).toEqual({
      error: "invalid-binding",
      ok: false,
    });

    let consumerReads = 0;
    const accessor: Record<string, unknown> = { ...oprteBinding };
    Object.defineProperty(accessor, "consumer", {
      enumerable: true,
      get() {
        consumerReads += 1;
        return "oprte";
      },
    });
    expect(createSuiteAccountsClientConfiguration(accessor)).toEqual({
      error: "invalid-binding",
      ok: false,
    });
    expect(consumerReads).toBe(0);
  });

  test("turns reflective proxy failures into an invalid binding", () => {
    const hostile = new Proxy({ ...oprteBinding }, {
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
    const observed = new Proxy({ ...oprteBinding }, {
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
      { ...oprteBinding, origin: "https://example.com" },
      { ...oprteBinding, clientId: "hraness:soundfish:production:v1" },
      { ...oprteBinding, callbackUrl: "https://oprte.com/callback" },
      { ...oprteBinding, authMode: "proxy" },
    ] as const;
    for (const mutation of mutations) {
      expect(createSuiteAccountsClientConfiguration(mutation).ok).toBe(false);
    }
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
