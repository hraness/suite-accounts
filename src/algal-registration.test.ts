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
import { SUITE_OIDC_DEVICE_CODE_GRANT_TYPE } from "./oidc-device-code";
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
  isSuiteAccountsCurrentLinkedOidcConsumerId,
  isSuiteAccountsCurrentOidcConsumerId,
  isSuiteAccountsRegisteredConsumerId,
  suiteAccountsCurrentConsumerRequiresEmailOtp,
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

const binding = {
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
  const kid = "accounts-es256-algal-1";
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

describe("Algal client registration", () => {
  test("registers one current-only production email-code OIDC browser client", () => {
    expect(SUITE_ACCOUNTS_CURRENT_CONSUMERS.algal).toEqual({
      auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
      displayName: "Algal",
      environments: {
        production: {
          billingReturn: { kind: "unsupported" },
          siteUrl: "https://algal.cloud",
        },
      },
      id: "algal",
    });
    expect(isSuiteAccountsCurrentConsumerId("algal")).toBe(true);
    expect(isSuiteAccountsCurrentOidcConsumerId("algal")).toBe(true);
    expect(suiteAccountsCurrentConsumerRequiresEmailOtp("algal")).toBe(true);
    expect(SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS)
      .toContain("algal");
    expect(suiteAccountsCurrentOidcClientRequiresEmailOtp(binding.clientId))
      .toBe(true);
    expect(isSuiteAccountsCurrentLinkedOidcConsumerId("algal")).toBe(false);
    expect(SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS).not.toContain("algal");
    expect(SUITE_CONVEX_BROWSER_CONSUMER_IDS).not.toContain("algal" as never);
    expect(suiteConvexBrowserEnvironmentForOrigin(
      "algal" as never,
      binding.origin,
    )).toBeNull();
    expectTypeOf<Extract<SuiteAccountsCurrentOidcConsumerId, "algal">>()
      .toEqualTypeOf<"algal">();
  });

  test("does not extend historical identities or deprecated trust", () => {
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
    for (const deviceClient of SUITE_ACCOUNTS_CURRENT_DEVICE_CLIENT_IDS) {
      expect(SUITE_CONSUMER_IDS).not.toContain(deviceClient as never);
      expect(isSuiteAccountsCurrentConsumerId(deviceClient)).toBe(false);
      expect(suiteAccountsCurrentOidcClientRegistration(deviceClient, "production"))
        .toBeNull();
    }
  });

  test("algal client redirect is exact-match", () => {
    expect(suiteAccountsCurrentOidcClientRegistration("algal", "production"))
      .toEqual({
        callbackUrl: "https://algal.cloud/api/suite-auth/callback",
        clientId: "hraness:algal:production:v1",
      });
    expect(getSuiteAccountsCurrentConsumerEnvironment("algal", "production"))
      .toEqual({ billingReturn: { kind: "unsupported" }, siteUrl: binding.origin });
    const accepted = createSuiteAccountsClientConfiguration(binding);
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    expect(accepted.value.binding).toEqual(binding);
    expect(Object.isFrozen(accepted.value.binding)).toBe(true);
    expect(Reflect.set(
      accepted.value.binding,
      "callbackUrl",
      "https://foreign.example/api/suite-auth/callback",
    )).toBe(false);

    for (const callbackUrl of [
      "http://algal.cloud/api/suite-auth/callback",
      "https://www.algal.cloud/api/suite-auth/callback",
      "https://ALGAL.cloud/api/suite-auth/callback",
      "https://algal.cloud:443/api/suite-auth/callback",
      "https://algal.cloud/api/suite-auth/callback/",
      "https://algal.cloud/api/suite-auth/Callback",
      "https://algal.cloud/api/auth/callback",
      "https://algal.cloud/api/suite-auth/callback?next=/",
      "https://algal.cloud/api/suite-auth/callback#fragment",
      "https://algal.cloud.evil.example/api/suite-auth/callback",
      "https://algal-git-main-hraness.vercel.app/api/suite-auth/callback",
      "http://localhost:3000/api/suite-auth/callback",
      "https://algal.cloud/",
      "",
      null,
    ]) {
      expect(createSuiteAccountsClientConfiguration({ ...binding, callbackUrl }))
        .toEqual({ ok: false, error: "invalid-callback-url" });
    }
    for (const origin of [
      "http://algal.cloud",
      "https://www.algal.cloud",
      "https://algal.cloud/",
      "https://algal.cloud:443",
      "https://algal.cloud.evil.example",
      "http://localhost:3000",
    ]) {
      expect(createSuiteAccountsClientConfiguration({ ...binding, origin }))
        .toEqual({ ok: false, error: "invalid-origin" });
    }
    for (const clientId of [
      "hraness:algal:preview:v1",
      "hraness:algal:production:v2",
      "hraness:Algal:production:v1",
      cliClientId,
      "hraness:alt:production:v1",
    ]) {
      expect(createSuiteAccountsClientConfiguration({ ...binding, clientId }))
        .toEqual({ ok: false, error: "invalid-client-id" });
    }
  });

  test("algal access token carries azp = hraness:algal:production:v1", async () => {
    const signer = await accountsSigner();
    const token = await signer.accessToken(binding.clientId);
    const claims = decodeJwt(token);
    expect(claims["azp"]).toBe("hraness:algal:production:v1");
    expect(claims["suite_client_id"]).toBe("hraness:algal:production:v1");
    expect(claims.aud).toEqual([provider.resource, provider.userInfoAudience]);
    expect(claims.iss).toBe("https://account.hraness.com");

    const verifier = verifierFor("algal", signer.jwks);
    expect(verifier.configuration).toEqual({
      audiences: [
        "https://hraness.com/suite",
        "https://account.hraness.com/api/auth/oauth2/userinfo",
      ],
      clientId: "hraness:algal:production:v1",
      issuer: "https://account.hraness.com",
      jwksEndpoint: "https://account.hraness.com/api/auth/jwks",
    });
    expect(await verifier.verify(token)).toMatchObject({ kind: "verified" });

    // The verifier requires both bindings; either one alone fails closed.
    for (const drift of [
      { azp: undefined },
      { azp: "hraness:alt:production:v1" },
      { suite_client_id: undefined },
      { suite_client_id: "hraness:alt:production:v1" },
    ]) {
      const { privateKey, publicKey } = await generateKeyPair("ES256");
      const kid = "accounts-es256-algal-drift";
      const drifted = await new SignJWT({ ...claims, ...drift })
        .setProtectedHeader({ alg: "ES256", kid })
        .sign(privateKey);
      const jwks = {
        keys: [{ ...await exportJWK(publicKey), alg: "ES256", kid, use: "sig" }],
      };
      expect(await verifierFor("algal", jwks).verify(drifted))
        .toEqual({ kind: "invalid", reason: "client" });
    }
  });

  test("token for another client carries its own azp", async () => {
    const signer = await accountsSigner();
    const algalVerifier = verifierFor("algal", signer.jwks);
    for (const consumer of SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS) {
      if (consumer === "algal" || !isSuiteAccountsCurrentOidcConsumerId(consumer)) {
        continue;
      }
      const registration =
        suiteAccountsCurrentOidcClientRegistration(consumer, "production");
      if (registration === null) throw new Error(`Missing ${consumer} client.`);
      const token = await signer.accessToken(registration.clientId);
      const claims = decodeJwt(token);
      expect(claims["azp"]).toBe(registration.clientId);
      expect(claims["suite_client_id"]).toBe(registration.clientId);
      expect(await verifierFor(consumer, signer.jwks).verify(token))
        .toMatchObject({ kind: "verified" });
      expect(await algalVerifier.verify(token))
        .toEqual({ kind: "invalid", reason: "client" });
    }

    const cliToken = await signer.accessToken(cliClientId);
    expect(decodeJwt(cliToken)["azp"]).toBe(cliClientId);
    expect(await algalVerifier.verify(cliToken))
      .toEqual({ kind: "invalid", reason: "client" });
  });

  test("device-code grant enabled only for algal-cli", () => {
    expect(SUITE_ACCOUNTS_CURRENT_DEVICE_CLIENT_IDS).toEqual(["algal-cli"]);
    expect(SUITE_ACCOUNTS_CURRENT_DEVICE_CLIENTS).toEqual({
      "algal-cli": {
        consumer: "algal",
        displayName: "Algal CLI",
        environments: ["production"],
        id: "algal-cli",
      },
    });
    expect(isSuiteAccountsCurrentDeviceClientId("algal-cli")).toBe(true);
    const cli = suiteAccountsCurrentDeviceClientRegistration(
      "algal-cli",
      "production",
    );
    expect(cli).toEqual({
      clientId: cliClientId,
      consumer: "algal",
      grantTypes: [SUITE_OIDC_DEVICE_CODE_GRANT_TYPE],
      redirectUris: [],
      scopes: ["openid", "email", "profile"],
      tokenEndpointAuthMethod: "none",
    });
    expect(cli?.grantTypes).not.toContain("authorization_code" as never);
    expect(Object.isFrozen(cli)).toBe(true);
    expect(Object.isFrozen(cli?.grantTypes)).toBe(true);
    expect(Object.isFrozen(cli?.redirectUris)).toBe(true);
    expect(Object.isFrozen(SUITE_ACCOUNTS_CURRENT_DEVICE_CLIENTS["algal-cli"]))
      .toBe(true);
    if (cli === null) throw new Error("Missing Algal CLI registration.");
    expect(Reflect.set(cli, "clientId", "foreign")).toBe(false);

    // Among Algal's clients, only the CLI may start a device-code grant.
    expect(suiteAccountsCurrentDeviceCodeClientAllowed(cliClientId)).toBe(true);
    expect(suiteAccountsCurrentDeviceCodeClientAllowed(binding.clientId))
      .toBe(false);
    expect(isSuiteAccountsCurrentBrowserDeviceCodeConsumerId("algal")).toBe(false);
    expect(SUITE_ACCOUNTS_CURRENT_BROWSER_DEVICE_CODE_CONSUMER_IDS)
      .not.toContain("algal" as never);
    // The CLI client never binds a browser redirect.
    expect(createSuiteAccountsClientConfiguration({
      ...binding,
      clientId: cliClientId,
    })).toEqual({ ok: false, error: "invalid-client-id" });
    expect(createSuiteAccountsClientConfiguration({
      ...binding,
      authMode: "device-code",
    })).toEqual({ ok: false, error: "invalid-auth-mode" });

    // Product clients registered before v0.9.20 keep their existing grant.
    expect(SUITE_ACCOUNTS_CURRENT_BROWSER_DEVICE_CODE_CONSUMER_IDS).toEqual([
      "act60",
      "soundfish",
      "oh-computer",
      "sponge",
      "peopleblade",
      "aicharts",
      "hraness",
      "soulscrape",
      "platonik",
      "ghostget",
      "alt",
    ]);
    const allowed = SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS.flatMap(consumer => {
      const client =
        suiteAccountsCurrentOidcClientRegistration(consumer, "production");
      return client !== null
        && suiteAccountsCurrentDeviceCodeClientAllowed(client.clientId)
        ? [consumer]
        : [];
    });
    expect(allowed).toEqual([
      ...SUITE_ACCOUNTS_CURRENT_BROWSER_DEVICE_CODE_CONSUMER_IDS,
    ]);

    for (const clientId of [
      "hraness:algal-cli:preview:v1",
      "hraness:algal-cli:production:v2",
      "hraness:Algal-cli:production:v1",
      "hraness:algal_cli:production:v1",
      ` ${cliClientId}`,
      `${cliClientId} `,
      "algal-cli",
      "hraness:accounts:production:v1",
      "hraness:draw-money:production:v1",
      "",
      null,
      undefined,
      42,
      { clientId: cliClientId },
    ]) {
      expect(suiteAccountsCurrentDeviceCodeClientAllowed(clientId)).toBe(false);
    }
    for (const deviceClient of ["algal", "ALGAL-CLI", "ghostget-cli", "", null]) {
      expect(isSuiteAccountsCurrentDeviceClientId(deviceClient)).toBe(false);
      expect(suiteAccountsCurrentDeviceClientRegistration(
        deviceClient,
        "production",
      )).toBeNull();
    }
  });
});
