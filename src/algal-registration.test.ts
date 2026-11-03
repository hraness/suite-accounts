import { describe, expect, expectTypeOf, test } from "bun:test";
import {
  decodeJwt,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWK,
} from "jose";

import { createSuiteBearerVerifier } from "./bearer-verifier";
import { createSuiteAccountsClientConfiguration } from "./client-configuration";
import {
  SUITE_CONVEX_BROWSER_CONSUMER_IDS,
  suiteConvexBrowserEnvironmentForOrigin,
} from "./convex-browser-auth";
import { SUITE_CATALOG_REVISION } from "./identity";
import { parseSuiteConsumerId } from "./identity/consumers";
import { parseSuiteProduct, SUITE_PRODUCTS } from "./identity/principals";
import {
  SUITE_ACCOUNTS_CONSUMERS,
  SUITE_ACCOUNTS_CURRENT_BROWSER_DEVICE_CODE_CONSUMER_IDS,
  SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS,
  SUITE_ACCOUNTS_CURRENT_CONSUMERS,
  SUITE_ACCOUNTS_CURRENT_DEVICE_CLIENT_IDS,
  SUITE_ACCOUNTS_CURRENT_DEVICE_CLIENTS,
  SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS,
  SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS,
  SUITE_ACCOUNTS_REGISTERED_CONSUMER_IDS,
  SUITE_CONSUMER_IDS,
  getSuiteAccountsCurrentConsumerEnvironment,
  isSuiteAccountsCurrentBrowserDeviceCodeConsumerId,
  isSuiteAccountsCurrentConsumerId,
  isSuiteAccountsCurrentDeviceClientId,
  isSuiteAccountsCurrentOidcConsumerId,
  isSuiteAccountsRegisteredConsumerId,
  type SuiteAccountsCurrentDeviceClientId,
  type SuiteAccountsCurrentOidcConsumerId,
} from "./registry";
import {
  suiteAccountsCurrentDeviceClientRegistration,
  suiteAccountsCurrentDeviceCodeClientAllowed,
  suiteAccountsCurrentOidcClientRegistration,
  suiteAccountsCurrentOidcClientRequiresEmailOtp,
  suiteAccountsOidcClientRegistration,
  suiteAccountsOidcProviderConfiguration,
} from "./urls";

const formerBinding = {
  authMode: "oidc-rp",
  callbackUrl: "https://algal.cloud/api/suite-auth/callback",
  clientId: "hraness:algal:production:v1",
  consumer: "algal",
  environment: "production",
  origin: "https://algal.cloud",
} as const;
const cliClientId = "hraness:algal-cli:production:v1";

const nowMs = 1_800_000_300_000;
const nowSeconds = Math.floor(nowMs / 1_000);
const provider = suiteAccountsOidcProviderConfiguration("production");

/**
 * Mint an access token in the shape the Accounts authority issues: the
 * provider sets standard `azp` to the requesting client, and Accounts adds
 * `suite_client_id` with the same value.
 */
async function accountsSigner() {
  const kid = "accounts-es256-retirement-1";
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  const jwk: JWK = {
    ...await exportJWK(publicKey),
    alg: "ES256",
    kid,
    use: "sig",
  };
  async function accessToken(clientId: string): Promise<string> {
    return await new SignJWT({
      azp: clientId,
      profile_complete: true,
      profile_revision: "username-v1",
      suite_account_id: "acct_018f1f7a7a367ccdbd5d706d4dc5c018",
      suite_client_id: clientId,
      suite_entitlements: {
        catalogRevision: SUITE_CATALOG_REVISION,
        expiresAtMs: nowMs + 8 * 60_000,
        features: [],
        observedAtMs: nowMs - 1_000,
        projectionRevision: 1,
        version: "suite-entitlements-v1",
      },
      username: "reader",
    })
      .setProtectedHeader({ alg: "ES256", kid })
      .setIssuer(provider.issuer)
      .setAudience([provider.resource, provider.userInfoAudience])
      .setSubject("better-auth-user-17")
      .setIssuedAt(nowSeconds)
      .setNotBefore(nowSeconds)
      .setExpirationTime(nowSeconds + 10 * 60)
      .sign(privateKey);
  }
  return { accessToken, jwks: { keys: [jwk] } };
}

function verifierFor(
  consumer: SuiteAccountsCurrentOidcConsumerId,
  jwks: unknown,
) {
  return createSuiteBearerVerifier({
    consumer,
    environment: "production",
    fetch: () => Promise.resolve(Response.json(jwks)),
    now: () => nowMs,
  });
}

describe("Algal authentication retirement", () => {
  test("removes browser trust without expanding historical identities", () => {
    expect("algal" in SUITE_ACCOUNTS_CURRENT_CONSUMERS).toBe(false);
    expect(isSuiteAccountsCurrentConsumerId("algal")).toBe(false);
    expect(SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS)
      .not.toContain("algal" as never);
    expect(SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS).not.toContain("algal");
    expect(SUITE_CONVEX_BROWSER_CONSUMER_IDS).not.toContain("algal" as never);
    expect(suiteConvexBrowserEnvironmentForOrigin(
      "algal" as never,
      formerBinding.origin,
    )).toBeNull();
    expectTypeOf<Extract<SuiteAccountsCurrentOidcConsumerId, "algal">>()
      .toEqualTypeOf<never>();

    expect(parseSuiteConsumerId("algal"))
      .toEqual({ ok: false, error: "invalid-consumer" });
    expect(SUITE_PRODUCTS).not.toContain("algal");
    expect(parseSuiteProduct("algal"))
      .toEqual({ ok: false, error: "invalid-product" });
    expect(SUITE_CONSUMER_IDS).not.toContain("algal");
    expect(SUITE_ACCOUNTS_REGISTERED_CONSUMER_IDS).not.toContain("algal");
    expect("algal" in SUITE_ACCOUNTS_CONSUMERS).toBe(false);
    expect(isSuiteAccountsRegisteredConsumerId("algal")).toBe(false);
    expect(suiteAccountsOidcClientRegistration("algal", "production")).toBeNull();
    expect(suiteAccountsCurrentOidcClientRegistration("algal", "production"))
      .toBeNull();
    expect(getSuiteAccountsCurrentConsumerEnvironment("algal", "production"))
      .toBeNull();
    expect(createSuiteAccountsClientConfiguration(formerBinding))
      .toEqual({ ok: false, error: "invalid-consumer" });
    expect(() => { verifierFor("algal" as never, { keys: [] }); }).toThrow();
  });

  test("leaves an immutable empty dedicated-device registry", () => {
    expect(SUITE_ACCOUNTS_CURRENT_DEVICE_CLIENT_IDS).toEqual([]);
    expect(SUITE_ACCOUNTS_CURRENT_DEVICE_CLIENTS).toEqual({});
    expectTypeOf<SuiteAccountsCurrentDeviceClientId>().toEqualTypeOf<never>();
    expect(Object.isFrozen(SUITE_ACCOUNTS_CURRENT_DEVICE_CLIENT_IDS)).toBe(true);
    expect(Object.isFrozen(SUITE_ACCOUNTS_CURRENT_DEVICE_CLIENTS)).toBe(true);
    expect(Reflect.set(SUITE_ACCOUNTS_CURRENT_DEVICE_CLIENTS, "algal-cli", {}))
      .toBe(false);
    for (const deviceClient of ["algal", "algal-cli", "ALGAL-CLI", "textmock-cli", "", null]) {
      expect(isSuiteAccountsCurrentDeviceClientId(deviceClient)).toBe(false);
      expect(suiteAccountsCurrentDeviceClientRegistration(deviceClient, "production"))
        .toBeNull();
    }
    for (const clientId of [
      formerBinding.clientId,
      cliClientId,
      "hraness:algal:preview:v1",
      "hraness:algal-cli:preview:v1",
      "hraness:algal-cli:production:v2",
      "hraness:Algal-cli:production:v1",
      "hraness:algal_cli:production:v1",
      ` ${cliClientId}`,
      `${cliClientId} `,
      "algal-cli",
      "",
      null,
      undefined,
      42,
      { clientId: cliClientId },
    ]) {
      expect(suiteAccountsCurrentDeviceCodeClientAllowed(clientId)).toBe(false);
      expect(suiteAccountsCurrentOidcClientRequiresEmailOtp(clientId)).toBe(false);
    }
  });

  test("preserves the closed browser device-code grant list and shared endpoints", () => {
    expect(isSuiteAccountsCurrentBrowserDeviceCodeConsumerId("algal")).toBe(false);
    expect(SUITE_ACCOUNTS_CURRENT_BROWSER_DEVICE_CODE_CONSUMER_IDS).toEqual([
      "act60", "soundfish", "oh-computer", "sponge", "peopleblade", "hraness",
      "platonik", "ghostget", "alt",
    ]);
    const allowed = SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS.flatMap(consumer => {
      const client = suiteAccountsCurrentOidcClientRegistration(consumer, "production");
      return client !== null && suiteAccountsCurrentDeviceCodeClientAllowed(client.clientId)
        ? [consumer]
        : [];
    });
    expect(allowed).toEqual([...SUITE_ACCOUNTS_CURRENT_BROWSER_DEVICE_CODE_CONSUMER_IDS]);
    expect(provider.deviceAuthorizationEndpoint)
      .toBe("https://account.hraness.com/api/auth/oauth2/device_authorization");
    expect(provider.deviceTokenEndpoint)
      .toBe("https://account.hraness.com/api/auth/oauth2/device/token");
  });

  test("current verifiers accept their own binding and reject both retired Algal clients", async () => {
    const signer = await accountsSigner();
    const retiredTokens = await Promise.all([
      signer.accessToken(formerBinding.clientId),
      signer.accessToken(cliClientId),
    ]);
    for (const consumer of SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS) {
      if (!isSuiteAccountsCurrentOidcConsumerId(consumer)) continue;
      const registration = suiteAccountsCurrentOidcClientRegistration(consumer, "production");
      if (registration === null) throw new Error(`Missing ${consumer} client.`);
      const token = await signer.accessToken(registration.clientId);
      const claims = decodeJwt(token);
      expect(claims["azp"]).toBe(registration.clientId);
      expect(claims["suite_client_id"]).toBe(registration.clientId);
      const verifier = verifierFor(consumer, signer.jwks);
      expect(await verifier.verify(token)).toMatchObject({ kind: "verified" });
      for (const retiredToken of retiredTokens) {
        expect(await verifier.verify(retiredToken))
          .toEqual({ kind: "invalid", reason: "client" });
      }
    }
  });

  test("current verifiers continue to require both client bindings", async () => {
    const signer = await accountsSigner();
    const claims = decodeJwt(await signer.accessToken("hraness:hraness:production:v1"));
    for (const drift of [
      { azp: undefined },
      { azp: formerBinding.clientId },
      { suite_client_id: undefined },
      { suite_client_id: cliClientId },
    ]) {
      const { privateKey, publicKey } = await generateKeyPair("ES256");
      const kid = "accounts-es256-retirement-drift";
      const token = await new SignJWT({ ...claims, ...drift })
        .setProtectedHeader({ alg: "ES256", kid })
        .sign(privateKey);
      const jwks = {
        keys: [{ ...await exportJWK(publicKey), alg: "ES256", kid, use: "sig" }],
      };
      expect(await verifierFor("hraness", jwks).verify(token))
        .toEqual({ kind: "invalid", reason: "client" });
    }
  });
});
