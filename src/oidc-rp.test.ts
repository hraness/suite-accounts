import { describe, expect, test } from "bun:test";
import {
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWK,
} from "jose";

import { SUITE_CATALOG_REVISION } from "./identity";

import {
  createSuiteOidcRelyingParty,
  validateSuiteOidcDiscovery,
} from "./oidc-rp";
import { suiteAccountsOidcProviderConfiguration } from "./urls";

const nowMs = 1_800_000_300_000;
const nowSeconds = Math.floor(nowMs / 1_000);
const accountId = "acct_018f1f7a7a367ccdbd5d706d4dc5c018";
const clientId = "hraness:soundfish:production:v1";
const siteUrl = "https://sound.fish";
const provider = suiteAccountsOidcProviderConfiguration("production");

function discovery(overrides: Record<string, unknown> = {}) {
  return {
    authorization_endpoint: provider.authorizationEndpoint,
    code_challenge_methods_supported: ["S256"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    id_token_signing_alg_values_supported: ["ES256"],
    issuer: provider.issuer,
    jwks_uri: provider.jwksEndpoint,
    response_types_supported: ["code"],
    revocation_endpoint: provider.revocationEndpoint,
    token_endpoint: provider.tokenEndpoint,
    token_endpoint_auth_methods_supported: ["none"],
    ...overrides,
  };
}

function entitlementReceipt(
  signature = "R".repeat(43),
  product = "soundfish",
) {
  return {
    entitlements: {
      catalogRevision: SUITE_CATALOG_REVISION,
      expiresAtMs: nowMs + 8 * 60_000,
      features: ["suite.paid", "suite.believer"],
      observedAtMs: nowMs - 1_000,
      projectionRevision: 7,
      version: "suite-entitlements-v1",
    },
    environment: "production",
    expiresAtMs: nowMs + 4 * 60_000,
    issuedAtMs: nowMs,
    keyVersion: "v1",
    product,
    signature,
    suiteAccountId: accountId,
    version: "suite-entitlement-receipt-v1",
  };
}

function getSetCookies(response: Response): readonly string[] {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  return headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""];
}

function cookiePair(cookie: string): string {
  return cookie.split(";", 1)[0]!;
}

function request(
  path: string,
  init: RequestInit = {},
): Request {
  return new Request(new URL(path, siteUrl), init);
}

function fetchUrl(input: RequestInfo | URL): string {
  return input instanceof URL
    ? input.href
    : typeof input === "string"
      ? input
      : input.url;
}

function randomSource() {
  let counter = 0;
  return (length: number): Uint8Array => {
    counter += 1;
    return Uint8Array.from(
      { length },
      (_, index) => (counter * 31 + index * 17) % 256,
    );
  };
}

async function signingFixture(targetClientId = clientId) {
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  const publicJwk = await exportJWK(publicKey);
  const kid = "accounts-es256-1";
  const jwk: JWK = { ...publicJwk, alg: "ES256", kid };
  async function idToken(
    nonce: string,
    subject = "better-auth-user-17",
    overrides: Record<string, unknown> = {},
  ) {
    return await new SignJWT({
      nonce,
      profile_complete: true,
      profile_revision: "username-v1",
      suite_account_id: accountId,
      username: "reader",
      ...overrides,
    })
      .setProtectedHeader({ alg: "ES256", kid })
      .setIssuer(provider.issuer)
      .setAudience(targetClientId)
      .setSubject(subject)
      .setIssuedAt(nowSeconds)
      .setExpirationTime(nowSeconds + 10 * 60)
      .sign(privateKey);
  }
  async function accessToken(
    overrides: Record<string, unknown> = {},
  ) {
    return await new SignJWT({
      azp: targetClientId,
      profile_complete: true,
      profile_revision: "username-v1",
      suite_account_id: accountId,
      suite_client_id: targetClientId,
      suite_entitlements: {
        catalogRevision: SUITE_CATALOG_REVISION,
        expiresAtMs: nowMs + 8 * 60_000,
        features: ["suite.paid", "suite.believer"],
        observedAtMs: nowMs - 1_000,
        projectionRevision: 7,
        version: "suite-entitlements-v1",
      },
      username: "reader",
      ...overrides,
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
  function userInfo(overrides: Record<string, unknown> = {}) {
    return {
      email: "reader@example.com",
      email_verified: true,
      profile_complete: true,
      profile_revision: "username-v1",
      sub: "better-auth-user-17",
      suite_account_id: accountId,
      suite_client_id: targetClientId,
      username: "reader",
      ...overrides,
    };
  }
  return { accessToken, idToken, jwks: { keys: [jwk] }, userInfo };
}

describe("suite OAuth relying party", () => {
  test("pins OAuth 2.1 discovery and rejects algorithm or endpoint drift", () => {
    expect(validateSuiteOidcDiscovery(discovery(), provider)).toBe(true);
    expect(validateSuiteOidcDiscovery(discovery({
      id_token_signing_alg_values_supported: ["ES256", "HS256"],
    }), provider)).toBe(false);
    expect(validateSuiteOidcDiscovery(discovery({
      token_endpoint: "https://attacker.example/token",
    }), provider)).toBe(false);
  });

  test("keeps the relying-party endpoint configuration deeply immutable", () => {
    const relyingParty = createSuiteOidcRelyingParty({
      consumer: "soundfish",
      cookieSecret: "test-secret-that-is-at-least-thirty-two-bytes",
      environment: "production",
      receiptKeyVersion: "v1",
    });
    expect(Reflect.set(
      relyingParty.configuration,
      "callbackUrl",
      "https://attacker.example/callback",
    )).toBe(false);
    expect(Reflect.set(
      relyingParty.configuration.provider,
      "tokenEndpoint",
      "https://attacker.example/token",
    )).toBe(false);
    expect(relyingParty.configuration.callbackUrl).toBe(
      "https://sound.fish/api/suite-auth/callback",
    );
    expect(relyingParty.configuration.provider.tokenEndpoint).toBe(
      "https://account.hraness.com/api/auth/oauth2/token",
    );
    const hra = createSuiteOidcRelyingParty({
      consumer: "hra",
      cookieSecret: "test-secret-that-is-at-least-thirty-two-bytes",
      environment: "production",
      receiptKeyVersion: "v1",
    });
    expect(hra.configuration).toMatchObject({
      callbackUrl: "https://hra.sh/api/suite-auth/callback",
      clientId: "hraness:hra:production:v1",
      siteUrl: "https://hra.sh",
    });
  });

  test("forces a fresh provider login for every shared browser product", async () => {
    const elders = createSuiteOidcRelyingParty({
      consumer: "elders",
      cookieSecret: "test-secret-that-is-at-least-thirty-two-bytes",
      environment: "production",
      fetch: () => Promise.reject(
        new Error("The authorization start must not fetch."),
      ),
      now: () => nowMs,
      randomBytes: randomSource(),
      receiptKeyVersion: "v1",
    });
    const eldersStart = await elders.start(new Request(
      "https://elders.hraness.com/api/suite-auth/start",
      { headers: { "sec-fetch-site": "same-origin" } },
    ));
    expect(new URL(eldersStart.headers.get("location")!).searchParams.get("prompt"))
      .toBe("login");
    expect(new URL(eldersStart.headers.get("location")!).searchParams.get("scope"))
      .toBe("openid profile email offline_access");

    const soundfish = createSuiteOidcRelyingParty({
      consumer: "soundfish",
      cookieSecret: "test-secret-that-is-at-least-thirty-two-bytes",
      environment: "production",
      fetch: () => Promise.reject(
        new Error("The authorization start must not fetch."),
      ),
      now: () => nowMs,
      randomBytes: randomSource(),
      receiptKeyVersion: "v1",
    });
    const soundfishStart = await soundfish.start(request(
      "/api/suite-auth/start",
      { headers: { "sec-fetch-site": "same-origin" } },
    ));
    expect(
      new URL(soundfishStart.headers.get("location")!).searchParams.get("prompt"),
    ).toBe("login");
    expect(
      new URL(soundfishStart.headers.get("location")!).searchParams.get("scope"),
    ).toBe("openid profile email offline_access");
  });

  test("rechecks Elders's canonical provider session before server authority", async () => {
    const eldersClientId = "hraness:elders:production:v1";
    const signing = await signingFixture(eldersClientId);
    let nonce = "";
    let issuedAccessToken = "";
    let sessionActive = true;
    let emailVerified = true;
    let userInfoRequests = 0;
    const relyingParty = createSuiteOidcRelyingParty({
      consumer: "elders",
      cookieSecret: "test-secret-that-is-at-least-thirty-two-bytes",
      environment: "production",
      fetch: async (input, init) => {
        const url = fetchUrl(input);
        if (url === provider.discoveryEndpoint) {
          return Response.json(discovery());
        }
        if (url === provider.jwksEndpoint) return Response.json(signing.jwks);
        if (url === provider.tokenEndpoint) {
          issuedAccessToken = await signing.accessToken();
          return Response.json({
            access_token: issuedAccessToken,
            id_token: await signing.idToken(nonce),
            refresh_token: "elders-refresh-token-value-0001",
            token_type: "Bearer",
          });
        }
        if (url === provider.userInfoAudience) {
          userInfoRequests += 1;
          expect(init).toMatchObject({
            headers: {
              accept: "application/json",
              authorization: `Bearer ${issuedAccessToken}`,
            },
            method: "GET",
          });
          return sessionActive
            ? Response.json({
                email: "Reader@Example.com",
                email_verified: emailVerified,
                profile_complete: true,
                profile_revision: "username-v1",
                sub: "better-auth-user-17",
                suite_account_id: accountId,
                suite_client_id: eldersClientId,
                username: "reader",
              })
            : Response.json({ error: "session_revoked" }, { status: 401 });
        }
        throw new Error(`Unexpected provider URL: ${url}`);
      },
      now: () => nowMs,
      randomBytes: randomSource(),
      receiptKeyVersion: "v1",
    });
    const started = await relyingParty.start(new Request(
      "https://elders.hraness.com/api/suite-auth/start",
      { headers: { "sec-fetch-site": "same-origin" } },
    ));
    const authorization = new URL(started.headers.get("location")!);
    nonce = authorization.searchParams.get("nonce")!;
    const callback = await relyingParty.callback(new Request(
      `https://elders.hraness.com/api/suite-auth/callback?code=code&state=${
        authorization.searchParams.get("state")!
      }`,
      {
        headers: {
          cookie: cookiePair(getSetCookies(started)[0]!),
          "sec-fetch-site": "cross-site",
        },
      },
    ));
    const sessionCookie = cookiePair(getSetCookies(callback).find(cookie =>
      cookie.startsWith("__Host-hraness-suite-oidc-session=")
    )!);
    const serverRequest = new Request("https://elders.hraness.com/provider", {
      headers: {
        cookie: sessionCookie,
        "sec-fetch-site": "same-origin",
      },
      method: "POST",
    });

    const browserSession = await relyingParty.currentSession(new Request(
      "https://elders.hraness.com/api/suite-auth/session",
      { headers: { cookie: sessionCookie, "sec-fetch-site": "same-origin" } },
    ));
    const browserSessionBody = await browserSession.text();
    expect(browserSessionBody).not.toContain("Reader@Example.com");
    expect(browserSessionBody).not.toContain("reader@example.com");

    expect(await relyingParty.serverSession(serverRequest)).toMatchObject({
      accessToken: issuedAccessToken,
      suiteAccountId: accountId,
      username: "reader",
    });
    expect(await relyingParty.serverVerifiedEmail(serverRequest)).toMatchObject({
      email: "reader@example.com",
      suiteAccountId: accountId,
    });
    emailVerified = false;
    expect(await relyingParty.serverVerifiedEmail(serverRequest)).toBeNull();
    sessionActive = false;
    expect(await relyingParty.serverSession(serverRequest)).toBeNull();
    expect(userInfoRequests).toBe(4);
  });

  test("keeps the validated access token in the server-only client-bound session", async () => {
    const signing = await signingFixture();
    let clockMs = nowMs;
    let nonce = "";
    let issuedAccessToken = "";
    const cookieSecret = "test-secret-that-is-at-least-thirty-two-bytes";
    const relyingParty = createSuiteOidcRelyingParty({
      consumer: "soundfish",
      cookieSecret,
      environment: "production",
      fetch: async (input) => {
        const url = fetchUrl(input);
        if (url === provider.discoveryEndpoint) {
          return Response.json(discovery());
        }
        if (url === provider.jwksEndpoint) return Response.json(signing.jwks);
        if (url === provider.tokenEndpoint) {
          issuedAccessToken = await signing.accessToken();
          return Response.json({
            access_token: issuedAccessToken,
            id_token: await signing.idToken(nonce),
            refresh_token: "initial-refresh-token-value-0001",
            token_type: "Bearer",
          });
        }
        if (url === provider.entitlementReceiptEndpoint) {
          return Response.json(entitlementReceipt());
        }
        if (url === provider.userInfoAudience) {
          return Response.json(signing.userInfo());
        }
        throw new Error(`Unexpected provider URL: ${url}`);
      },
      now: () => clockMs,
      randomBytes: randomSource(),
      receiptKeyVersion: "v1",
    });
    const started = await relyingParty.start(request(
      "/api/suite-auth/start",
      { headers: { "sec-fetch-site": "same-origin" } },
    ));
    const authorization = new URL(started.headers.get("location")!);
    nonce = authorization.searchParams.get("nonce")!;
    const callback = await relyingParty.callback(request(
      `/api/suite-auth/callback?code=code&state=${
        authorization.searchParams.get("state")!
      }`,
      {
        headers: {
          cookie: cookiePair(getSetCookies(started)[0]!),
          "sec-fetch-site": "cross-site",
        },
      },
    ));
    expect(callback.status).toBe(302);
    const sessionCookie = cookiePair(getSetCookies(callback).find(cookie =>
      cookie.startsWith("__Host-hraness-suite-oidc-session=")
    )!);
    const syncRequest = request("/api/soundfish/sync", {
      headers: {
        cookie: sessionCookie,
        "sec-fetch-site": "same-origin",
      },
      method: "POST",
    });

    expect(await relyingParty.serverSession(syncRequest)).toMatchObject({
      accessToken: issuedAccessToken,
      accessTokenExpiresAtMs: nowMs + 10 * 60_000,
      suiteAccountId: accountId,
      username: "reader",
    });

    const browserSession = await relyingParty.currentSession(request(
      "/api/suite-auth/session",
      {
        headers: {
          cookie: sessionCookie,
          "sec-fetch-site": "same-origin",
        },
      },
    ));
    const browserBody = await browserSession.text();
    expect(browserBody).not.toContain(issuedAccessToken);
    expect(browserBody).not.toContain("better-auth-user-17");
    expect(await relyingParty.handle(request(
      "/api/suite-auth/server-session",
      {
        headers: {
          cookie: sessionCookie,
          "sec-fetch-site": "same-origin",
        },
      },
    ))).toMatchObject({ status: 404 });

    clockMs = nowMs + 10 * 60_000 - 29_999;
    expect(await (await relyingParty.currentSession(request(
      "/api/suite-auth/session",
      {
        headers: {
          cookie: sessionCookie,
          "sec-fetch-site": "same-origin",
        },
      },
    ))).json()).toEqual({ kind: "refresh_required" });
    expect(await relyingParty.serverSession(syncRequest)).not.toBeNull();

    const tamperedCookie = `${sessionCookie.slice(0, -1)}!`;
    expect(await relyingParty.serverSession(request("/api/soundfish/sync", {
      headers: { cookie: tamperedCookie },
    }))).toBeNull();
    expect(await relyingParty.serverSession(new Request(
      "https://attacker.example/api/soundfish/sync",
      { headers: { cookie: sessionCookie } },
    ))).toBeNull();

    const otherClient = createSuiteOidcRelyingParty({
      consumer: "soundfish",
      cookieSecret,
      environment: "production",
      fetch: () => Promise.reject(new Error("must not fetch")),
      now: () => clockMs,
      receiptKeyVersion: "v1",
    });
    expect(await otherClient.serverSession(new Request(
      "https://sound.fish/api/soundfish/sync",
      { headers: { cookie: sessionCookie } },
    ))).toBeNull();

    clockMs += 11 * 60_000;
    expect(await relyingParty.serverSession(syncRequest)).toBeNull();
  });

  test("exposes a server-only account bearer before username onboarding", async () => {
    const signing = await signingFixture();
    const incompleteProfile = {
      profile_complete: false,
      profile_revision: "username-v1",
      username: null,
    };
    let nonce = "";
    let issuedAccessToken = "";
    const relyingParty = createSuiteOidcRelyingParty({
      consumer: "soundfish",
      cookieSecret: "test-secret-that-is-at-least-thirty-two-bytes",
      environment: "production",
      fetch: async (input) => {
        const url = fetchUrl(input);
        if (url === provider.discoveryEndpoint) {
          return Response.json(discovery());
        }
        if (url === provider.jwksEndpoint) return Response.json(signing.jwks);
        if (url === provider.tokenEndpoint) {
          issuedAccessToken = await signing.accessToken(incompleteProfile);
          return Response.json({
            access_token: issuedAccessToken,
            id_token: await signing.idToken(
              nonce,
              "better-auth-user-17",
              incompleteProfile,
            ),
            refresh_token: "incomplete-profile-refresh-token-0001",
            token_type: "Bearer",
          });
        }
        if (url === provider.entitlementReceiptEndpoint) {
          return Response.json(entitlementReceipt());
        }
        if (url === provider.userInfoAudience) {
          return Response.json(signing.userInfo(incompleteProfile));
        }
        throw new Error(`Unexpected provider URL: ${url}`);
      },
      now: () => nowMs,
      randomBytes: randomSource(),
      receiptKeyVersion: "v1",
    });
    const started = await relyingParty.start(request(
      "/api/suite-auth/start",
      { headers: { "sec-fetch-site": "same-origin" } },
    ));
    const authorization = new URL(started.headers.get("location")!);
    nonce = authorization.searchParams.get("nonce")!;
    const callback = await relyingParty.callback(request(
      `/api/suite-auth/callback?code=code&state=${
        authorization.searchParams.get("state")!
      }`,
      {
        headers: {
          cookie: cookiePair(getSetCookies(started)[0]!),
          "sec-fetch-site": "cross-site",
        },
      },
    ));
    const sessionCookie = cookiePair(getSetCookies(callback).find(cookie =>
      cookie.startsWith("__Host-hraness-suite-oidc-session=")
    )!);
    const accountRequest = request("/join", {
      headers: {
        cookie: sessionCookie,
        "sec-fetch-site": "same-origin",
      },
    });

    expect(await relyingParty.serverAccountSession(accountRequest)).toMatchObject({
      accessToken: issuedAccessToken,
      accessTokenExpiresAtMs: nowMs + 10 * 60_000,
      suiteAccountId: accountId,
    });
    expect(await relyingParty.serverSession(accountRequest)).toBeNull();
  });

  test("runs authorization, cross-site callback, receipt delivery, refresh rotation, ack, and revocation", async () => {
    const signing = await signingFixture();
    let nonce = "";
    const tokenBodies: URLSearchParams[] = [];
    const receiptAuthorizations: string[] = [];
    let receiptCount = 0;
    let revokedBody = "";
    const relyingParty = createSuiteOidcRelyingParty({
      consumer: "soundfish",
      cookieSecret: "test-secret-that-is-at-least-thirty-two-bytes",
      environment: "production",
      fetch: async (input, init) => {
        const url = fetchUrl(input);
        if (url === provider.discoveryEndpoint) {
          return Response.json(discovery());
        }
        if (url === provider.jwksEndpoint) {
          return Response.json(signing.jwks);
        }
        if (url === provider.tokenEndpoint) {
          const body = init?.body as URLSearchParams;
          tokenBodies.push(body);
          if (body.get("grant_type") === "authorization_code") {
            return Response.json({
              access_token: await signing.accessToken(),
              id_token: await signing.idToken(nonce),
              refresh_token: "initial-refresh-token-value-0001",
              token_type: "Bearer",
            });
          }
          return Response.json({
            access_token: await signing.accessToken(),
            refresh_token: "rotated-refresh-token-value-0002",
            token_type: "Bearer",
          });
        }
        if (url === provider.entitlementReceiptEndpoint) {
          receiptAuthorizations.push(
            new Headers(init?.headers).get("authorization") ?? "",
          );
          receiptCount += 1;
          return Response.json(
            entitlementReceipt(
              (receiptCount === 1 ? "R" : "S").repeat(43),
            ),
          );
        }
        if (url === provider.identityLinkReceiptEndpoint) {
          expect(new Headers(init?.headers).get("authorization"))
            .toStartWith("Bearer ey");
          const proof = JSON.parse(
            typeof init?.body === "string" ? init.body : "{}",
          ) as Record<
            string,
            unknown
          >;
          return Response.json({
            challengeId: proof["challengeId"],
            environment: proof["environment"],
            expiresAtMs: proof["expiresAtMs"],
            issuedAtMs: proof["issuedAtMs"],
            keyVersion: proof["keyVersion"],
            localSubject: proof["localSubject"],
            product: proof["product"],
            signature: "L".repeat(43),
            suiteAccountId: accountId,
            version: "suite-link-receipt-v1",
          });
        }
        if (url === provider.userInfoAudience) {
          return Response.json(signing.userInfo());
        }
        if (url === provider.revocationEndpoint) {
          revokedBody = init?.body instanceof URLSearchParams
            ? init.body.toString()
            : "";
          return new Response(null, { status: 200 });
        }
        throw new Error(`Unexpected provider URL: ${url}`);
      },
      now: () => nowMs,
      randomBytes: randomSource(),
      receiptKeyVersion: "v1",
    });

    const started = await relyingParty.start(
      request("/api/suite-auth/start?return_to=%2Fsettings%3Ftab%3Dbilling", {
        headers: { "sec-fetch-site": "same-origin" },
      }),
    );
    expect(started.status).toBe(302);
    const authorization = new URL(started.headers.get("location")!);
    nonce = authorization.searchParams.get("nonce")!;
    expect(authorization.origin + authorization.pathname).toBe(
      provider.authorizationEndpoint,
    );
    expect(authorization.searchParams.get("resource")).toBe(provider.resource);
    expect(authorization.searchParams.get("code_challenge_method")).toBe(
      "S256",
    );
    expect(authorization.searchParams.get("scope")).toBe(
      "openid profile email offline_access",
    );
    expect(authorization.searchParams.get("prompt")).toBe("login");
    const transactionCookie = cookiePair(getSetCookies(started)[0]!);
    expect(getSetCookies(started)[0]).toContain("HttpOnly");
    expect(getSetCookies(started)[0]).toContain("Secure");
    expect(getSetCookies(started)[0]).toContain("SameSite=Lax");

    const callback = await relyingParty.callback(request(
      `/api/suite-auth/callback?code=one-time-code&state=${
        authorization.searchParams.get("state")!
      }`,
      {
        headers: {
          cookie: transactionCookie,
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "cross-site",
        },
      },
    ));
    expect(callback.status).toBe(302);
    expect(callback.headers.get("location")).toBe(
      "https://sound.fish/settings?tab=billing",
    );
    const callbackCookies = getSetCookies(callback);
    const sessionCookie = cookiePair(
      callbackCookies.find(cookie =>
        cookie.startsWith("__Host-hraness-suite-oidc-session=")
      )!,
    );
    expect(callbackCookies.some(cookie =>
      cookie.startsWith("__Host-hraness-suite-oidc-transaction=")
      && cookie.includes("Max-Age=0")
    )).toBe(true);
    expect(tokenBodies[0]?.get("resource")).toBe(provider.resource);
    expect(tokenBodies[0]?.get("client_secret")).toBeNull();
    expect(receiptAuthorizations[0]).toStartWith("Bearer ey");

    const current = await relyingParty.currentSession(request(
      "/api/suite-auth/session",
      {
        headers: { cookie: sessionCookie, "sec-fetch-site": "same-origin" },
      },
    ));
    const publicSessionJson = await current.clone().text();
    expect(await current.json()).toMatchObject({
      kind: "signed_in",
      session: {
        entitlementReceipt: { signature: "R".repeat(43) },
        entitlements: {
          features: ["suite.paid", "suite.believer"],
          kind: "fresh",
        },
        profileComplete: true,
        profileRevision: "username-v1",
        suiteAccountId: accountId,
        username: "reader",
      },
    });
    expect(publicSessionJson).not.toContain("accessToken");
    expect(publicSessionJson).not.toContain("access_token");
    expect(publicSessionJson).not.toContain("Bearer ");
    const serverSession = await relyingParty.serverSession(request(
      "/internal/product-request",
      { headers: { cookie: sessionCookie } },
    ));
    expect(serverSession).toMatchObject({
      suiteAccountId: accountId,
      username: "reader",
    });
    expect(serverSession?.accessToken).toStartWith("ey");

    let oversizedBodyCanceled = false;
    let oversizedBodyPulls = 0;
    const oversizedBody = new ReadableStream<Uint8Array>({
      cancel: () => {
        oversizedBodyCanceled = true;
      },
      pull: (controller) => {
        oversizedBodyPulls += 1;
        controller.enqueue(new Uint8Array(9_000));
        if (oversizedBodyPulls === 3) controller.close();
      },
    });
    const oversizedLinkReceipt = await relyingParty.linkReceipt(request(
      "/api/suite-auth/link-receipt",
      {
        body: oversizedBody,
        headers: {
          "content-type": "application/json",
          cookie: sessionCookie,
          origin: siteUrl,
          "sec-fetch-site": "same-origin",
        },
        method: "POST",
      },
    ));
    expect(oversizedLinkReceipt.status).toBe(400);
    expect(oversizedBodyCanceled).toBe(true);

    const linkReceipt = await relyingParty.linkReceipt(request(
      "/api/suite-auth/link-receipt",
      {
        body: JSON.stringify({
          challengeId: "A".repeat(32),
          environment: "production",
          expiresAtMs: nowMs + 4 * 60_000,
          issuedAtMs: nowMs,
          keyVersion: "v1",
          localSubject: "local-user-17",
          product: "soundfish",
          proofSignature: "P".repeat(43),
        }),
        headers: {
          "content-type": "application/json",
          cookie: sessionCookie,
          origin: siteUrl,
          "sec-fetch-site": "same-origin",
        },
        method: "POST",
      },
    ));
    expect(linkReceipt.status).toBe(200);
    expect(await linkReceipt.json()).toMatchObject({
      receipt: {
        signature: "L".repeat(43),
        suiteAccountId: accountId,
      },
    });

    const acknowledged = await relyingParty.acknowledgeEntitlementReceipt(
      request("/api/suite-auth/entitlements/ack", {
        body: JSON.stringify({ signature: "R".repeat(43) }),
        headers: {
          "content-type": "application/json",
          cookie: sessionCookie,
          origin: siteUrl,
          "sec-fetch-site": "same-origin",
        },
        method: "POST",
      }),
    );
    expect(acknowledged.status).toBe(200);
    const acknowledgedCookie = cookiePair(getSetCookies(acknowledged)[0]!);

    const refreshed = await relyingParty.refreshSession(request(
      "/api/suite-auth/refresh",
      {
        headers: {
          cookie: acknowledgedCookie,
          origin: siteUrl,
          "sec-fetch-site": "same-origin",
        },
        method: "POST",
      },
    ));
    expect(refreshed.status).toBe(200);
    expect(await refreshed.clone().json()).toMatchObject({
      kind: "signed_in",
      session: {
        entitlementReceipt: { signature: "S".repeat(43) },
      },
    });
    expect(tokenBodies[1]?.get("resource")).toBe(provider.resource);
    expect(tokenBodies[1]?.get("refresh_token")).toBe(
      "initial-refresh-token-value-0001",
    );
    const refreshedCookie = cookiePair(getSetCookies(refreshed)[0]!);

    const signedOut = await relyingParty.signOut(request(
      "/api/suite-auth/sign-out",
      {
        headers: {
          cookie: refreshedCookie,
          origin: siteUrl,
          "sec-fetch-site": "same-origin",
        },
        method: "POST",
      },
    ));
    expect(signedOut.status).toBe(200);
    const revokedParameters = new URLSearchParams(revokedBody);
    expect(revokedParameters.get("client_id")).toBe(clientId);
    expect(revokedParameters.get("token")).toBe(
      "rotated-refresh-token-value-0002",
    );
    expect(revokedParameters.get("token_type_hint")).toBe("refresh_token");
    expect(getSetCookies(signedOut).every(cookie =>
      cookie.includes("Max-Age=0")
    )).toBe(true);
  });

  test("rejects wrong state and tampered transaction cookies before token exchange", async () => {
    let calls = 0;
    const relyingParty = createSuiteOidcRelyingParty({
      consumer: "soundfish",
      cookieSecret: "test-secret-that-is-at-least-thirty-two-bytes",
      environment: "production",
      fetch: () => {
        calls += 1;
        return Promise.resolve(Response.json({}));
      },
      now: () => nowMs,
      randomBytes: randomSource(),
      receiptKeyVersion: "v1",
    });
    const started = await relyingParty.start(request(
      "/api/suite-auth/start",
      { headers: { "sec-fetch-site": "same-origin" } },
    ));
    const cookie = cookiePair(getSetCookies(started)[0]!);
    const wrongState = await relyingParty.callback(request(
      "/api/suite-auth/callback?code=code&state=wrong",
      { headers: { cookie } },
    ));
    expect(wrongState.status).toBe(400);
    const tampered = `${cookie.slice(0, -1)}A`;
    const badCookie = await relyingParty.callback(request(
      "/api/suite-auth/callback?code=code&state=anything",
      { headers: { cookie: tampered } },
    ));
    expect(badCookie.status).toBe(400);
    expect(calls).toBe(0);
  });

  test("rejects a signed access token with either client binding wrong", async () => {
    const signing = await signingFixture();
    for (const override of [
      { azp: "hraness:oprte:production:v1" },
      { suite_client_id: "hraness:oprte:production:v1" },
    ]) {
      let nonce = "";
      const relyingParty = createSuiteOidcRelyingParty({
        consumer: "soundfish",
        cookieSecret: "test-secret-that-is-at-least-thirty-two-bytes",
        environment: "production",
        fetch: async (input) => {
          const url = fetchUrl(input);
          if (url === provider.discoveryEndpoint) {
            return Response.json(discovery());
          }
          if (url === provider.jwksEndpoint) return Response.json(signing.jwks);
          if (url === provider.tokenEndpoint) {
            return Response.json({
              access_token: await signing.accessToken(override),
              id_token: await signing.idToken(nonce),
              refresh_token: "initial-refresh-token-value-0001",
              token_type: "Bearer",
            });
          }
          throw new Error("receipt must not be requested");
        },
        now: () => nowMs,
        randomBytes: randomSource(),
        receiptKeyVersion: "v1",
      });
      const started = await relyingParty.start(request(
        "/api/suite-auth/start",
        { headers: { "sec-fetch-site": "same-origin" } },
      ));
      const location = new URL(started.headers.get("location")!);
      nonce = location.searchParams.get("nonce")!;
      const response = await relyingParty.callback(request(
        `/api/suite-auth/callback?code=code&state=${
          location.searchParams.get("state")!
        }`,
        { headers: { cookie: cookiePair(getSetCookies(started)[0]!) } },
      ));
      expect(response.status).toBe(502);
      expect(await response.json()).toMatchObject({
        error: { code: "OIDC_TOKEN_INVALID" },
      });
    }
  });

  test("rejects disagreement between signed ID and access-token profile identity", async () => {
    const signing = await signingFixture();
    let nonce = "";
    const relyingParty = createSuiteOidcRelyingParty({
      consumer: "soundfish",
      cookieSecret: "test-secret-that-is-at-least-thirty-two-bytes",
      environment: "production",
      fetch: async (input) => {
        const url = fetchUrl(input);
        if (url === provider.discoveryEndpoint) {
          return Response.json(discovery());
        }
        if (url === provider.jwksEndpoint) return Response.json(signing.jwks);
        if (url === provider.tokenEndpoint) {
          return Response.json({
            access_token: await signing.accessToken(),
            id_token: await signing.idToken(
              nonce,
              "better-auth-user-17",
              { username: "different-reader" },
            ),
            refresh_token: "initial-refresh-token-value-0001",
            token_type: "Bearer",
          });
        }
        throw new Error("receipt must not be requested");
      },
      now: () => nowMs,
      randomBytes: randomSource(),
      receiptKeyVersion: "v1",
    });
    const started = await relyingParty.start(request(
      "/api/suite-auth/start",
      { headers: { "sec-fetch-site": "same-origin" } },
    ));
    const location = new URL(started.headers.get("location")!);
    nonce = location.searchParams.get("nonce")!;
    const response = await relyingParty.callback(request(
      `/api/suite-auth/callback?code=code&state=${
        location.searchParams.get("state")!
      }`,
      { headers: { cookie: cookiePair(getSetCookies(started)[0]!) } },
    ));
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      error: { code: "OIDC_TOKEN_INVALID" },
    });
  });

  test("clears local custody even when provider revocation fails", async () => {
    const signing = await signingFixture();
    let nonce = "";
    const relyingParty = createSuiteOidcRelyingParty({
      consumer: "soundfish",
      cookieSecret: "test-secret-that-is-at-least-thirty-two-bytes",
      environment: "production",
      fetch: async (input) => {
        const url = fetchUrl(input);
        if (url === provider.discoveryEndpoint) {
          return Response.json(discovery());
        }
        if (url === provider.jwksEndpoint) return Response.json(signing.jwks);
        if (url === provider.tokenEndpoint) {
          return Response.json({
            access_token: await signing.accessToken(),
            id_token: await signing.idToken(nonce),
            refresh_token: "initial-refresh-token-value-0001",
            token_type: "Bearer",
          });
        }
        if (url === provider.entitlementReceiptEndpoint) {
          return Response.json(entitlementReceipt());
        }
        if (url === provider.revocationEndpoint) {
          throw new Error("provider unavailable");
        }
        throw new Error("unexpected");
      },
      now: () => nowMs,
      randomBytes: randomSource(),
      receiptKeyVersion: "v1",
    });
    const started = await relyingParty.start(request(
      "/api/suite-auth/start",
      { headers: { "sec-fetch-site": "same-origin" } },
    ));
    const location = new URL(started.headers.get("location")!);
    nonce = location.searchParams.get("nonce")!;
    const callback = await relyingParty.callback(request(
      `/api/suite-auth/callback?code=code&state=${
        location.searchParams.get("state")!
      }`,
      { headers: { cookie: cookiePair(getSetCookies(started)[0]!) } },
    ));
    const sessionCookie = cookiePair(getSetCookies(callback).find(cookie =>
      cookie.startsWith("__Host-hraness-suite-oidc-session=")
    )!);
    const signedOut = await relyingParty.signOut(request(
      "/api/suite-auth/sign-out",
      {
        headers: {
          cookie: sessionCookie,
          origin: siteUrl,
          "sec-fetch-site": "same-origin",
        },
        method: "POST",
      },
    ));
    expect(signedOut.status).toBe(200);
    expect(getSetCookies(signedOut).every(cookie =>
      cookie.includes("Max-Age=0")
    )).toBe(true);
  });
});
