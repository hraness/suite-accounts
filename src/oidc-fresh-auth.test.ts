import { describe, expect, test } from "bun:test";
import { exportJWK, generateKeyPair, SignJWT } from "jose";

import { parseSuiteAccountId, SUITE_CATALOG_REVISION } from "./identity";
import { createSuiteOidcRelyingParty } from "./oidc-rp";
import { assertAsyncProperty, fc } from "./test-support";
import { suiteAccountsOidcProviderConfiguration } from "./urls";

const initialTime = 1_800_000_300_123;
const initialSeconds = Math.floor(initialTime / 1_000);
const parsedAccountId = parseSuiteAccountId("acct_018f1f7a7a367ccdbd5d706d4dc5c018");
if (!parsedAccountId.ok) throw new Error("Invalid synthetic Suite account ID.");
const accountId = parsedAccountId.value;
const otherAccountId = "acct_018f1f7a7a367ccdbd5d706d4dc5c019";
const subject = "synthetic-fresh-auth-principal";
const siteUrl = "https://aicharts.io";
const clientId = "hraness:aicharts:production:v1";
const context = "pairing_context_".repeat(4);
const provider = suiteAccountsOidcProviderConfiguration("production");
const transactionName = "__Host-hraness-suite-oidc-transaction";
const sessionName = "__Host-hraness-suite-oidc-session";
const refreshToken = "synthetic-refresh-token-fresh-auth-0001";

function request(path: string, init: RequestInit = {}): Request {
  return new Request(new URL(path, siteUrl), init);
}

function cookies(response: Response): readonly string[] {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  return headers.getSetCookie?.() ?? [headers.get("set-cookie") ?? ""];
}

function cookiePair(response: Response, name: string): string {
  const cookie = cookies(response).find(value => value.startsWith(`${name}=`));
  if (cookie === undefined) throw new Error("Missing synthetic response cookie.");
  return cookie.split(";", 1)[0]!;
}

function fetchUrl(input: RequestInfo | URL): string {
  return input instanceof URL ? input.href : typeof input === "string" ? input : input.url;
}

function randomSource() {
  let state = 0x193a8f27;
  return (length: number): Uint8Array => Uint8Array.from({ length }, () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state & 255;
  });
}

function validStartInput(value: unknown): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const keys = Object.keys(candidate).sort();
  return keys.length === 2 && keys[0] === "context" && keys[1] === "expiresAtMs"
    && typeof candidate["context"] === "string"
    && /^[A-Za-z0-9_-]{32,256}$/u.test(candidate["context"])
    && typeof candidate["expiresAtMs"] === "number"
    && Number.isSafeInteger(candidate["expiresAtMs"])
    && candidate["expiresAtMs"] > initialTime
    && candidate["expiresAtMs"] <= initialTime + 600_000;
}

async function fixture() {
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  const jwk = { ...await exportJWK(publicKey), alg: "ES256", kid: "fresh-auth-es256" };
  const clock = { now: initialTime };
  const idClaims: Record<string, unknown> = {};
  const accessClaims: Record<string, unknown> = {};
  const calls: { url: string; body: string }[] = [];
  const tokens: string[] = [];
  const consumedCodes = new Set<string>();
  let singleUseCodes = false;
  let nonce = "";
  let onFetch: (url: string) => void = () => undefined;
  let onRandom: () => void = () => undefined;
  let transformIdToken: (value: string) => string = value => value;
  const random = randomSource();

  async function sign(claims: Record<string, unknown>) {
    return await new SignJWT(claims)
      .setProtectedHeader({ alg: "ES256", kid: jwk.kid })
      .sign(privateKey);
  }

  const relyingParty = createSuiteOidcRelyingParty({
    consumer: "aicharts",
    cookieSecret: "synthetic-fresh-auth-cookie-secret-at-least-32-bytes",
    environment: "production",
    fetch: async (input, init) => {
      const url = fetchUrl(input);
      calls.push({ url, body: init?.body instanceof URLSearchParams ? init.body.toString() : "" });
      onFetch(url);
      if (url === provider.discoveryEndpoint) {
        return Response.json({
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
        });
      }
      if (url === provider.jwksEndpoint) return Response.json({ keys: [jwk] });
      if (url === provider.tokenEndpoint) {
        if (singleUseCodes && init?.body instanceof URLSearchParams && init.body.get("grant_type") === "authorization_code") {
          const code = init.body.get("code") ?? "";
          if (consumedCodes.has(code)) return Response.json({ error: "invalid_grant" }, { status: 400 });
          consumedCodes.add(code);
        }
        const accessToken = await sign({
          aud: [provider.resource, provider.userInfoAudience],
          azp: clientId,
          exp: initialSeconds + 420,
          iat: initialSeconds,
          iss: provider.issuer,
          nbf: initialSeconds,
          profile_complete: false,
          profile_revision: "username-v1",
          username: null,
          sub: subject,
          suite_account_id: accountId,
          suite_client_id: clientId,
          suite_entitlements: {
            catalogRevision: SUITE_CATALOG_REVISION,
            expiresAtMs: (typeof accessClaims["exp"] === "number" ? accessClaims["exp"] : initialSeconds + 420) * 1_000,
            features: [],
            observedAtMs: initialTime - 1_000,
            projectionRevision: 7,
            version: "suite-entitlements-v1",
          },
          ...accessClaims,
        });
        const idToken = transformIdToken(await sign({
          aud: clientId,
          auth_time: initialSeconds,
          exp: initialSeconds + 300,
          iat: initialSeconds,
          iss: provider.issuer,
          nonce,
          profile_complete: false,
          profile_revision: "username-v1",
          username: null,
          sub: subject,
          suite_account_id: accountId,
          ...idClaims,
        }));
        tokens.push(accessToken, idToken);
        return Response.json({
          access_token: accessToken,
          id_token: idToken,
          refresh_token: init?.body instanceof URLSearchParams && init.body.get("grant_type") === "refresh_token"
            ? "synthetic-rotated-refresh-token-fresh-auth-0002"
            : refreshToken,
          token_type: "Bearer",
        });
      }
      if (url === provider.userInfoAudience) {
        return Response.json({
          profile_complete: false,
          profile_revision: "username-v1",
          username: null,
          sub: subject,
          suite_account_id: accountId,
          suite_client_id: clientId,
        });
      }
      throw new Error("Unexpected synthetic provider operation.");
    },
    now: () => clock.now,
    randomBytes: length => { onRandom(); return random(length); },
    receiptKeyVersion: "v1",
  });

  function callbackRequest(started: Response, cookie = cookiePair(started, transactionName)) {
    const authorization = new URL(started.headers.get("location")!);
    return request(`/api/suite-auth/callback?code=synthetic-code&state=${authorization.searchParams.get("state")!}`, {
      headers: {
        cookie,
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "cross-site",
      },
    });
  }

  async function start(input: unknown = { context, expiresAtMs: initialTime + 600_000 }) {
    const response = await relyingParty.startFreshAuthentication(
      request("/api/suite-auth/start", { headers: { "sec-fetch-site": "same-origin" } }),
      input,
    );
    const location = response.headers.get("location");
    if (location !== null) nonce = new URL(location).searchParams.get("nonce") ?? "";
    return response;
  }

  return {
    accessClaims, callbackRequest, calls, clock, idClaims, relyingParty, start, tokens,
    setFetchHook(hook: (url: string) => void) { onFetch = hook; },
    setRandomHook(hook: () => void) { onRandom = hook; },
    setTokenTransform(transform: (value: string) => string) { transformIdToken = transform; },
    requireSingleUseCode() { singleUseCodes = true; },
  };
}

async function expectRejected(result: Awaited<ReturnType<ReturnType<typeof createSuiteOidcRelyingParty>["completeFreshAuthentication"]>>) {
  expect(result.kind).toBe("rejected");
  expect(Object.keys(result).sort()).toEqual(["kind", "response"]);
  expect(result.response.status).toBeGreaterThanOrEqual(400);
  expect(result.response.headers.get("cache-control")).toBe("no-store");
  expect(cookies(result.response).some(cookie => cookie.startsWith(`${sessionName}=`) && !cookie.includes("Max-Age=0"))).toBe(false);
  expect(await result.response.clone().text()).not.toContain(context);
}

describe("fresh OIDC authentication completion", () => {
  test("returns only verified server facts and seals context away from browser surfaces", async () => {
    const f = await fixture();
    const started = await f.start();
    expect(started.status).toBe(302);
    const authorization = new URL(started.headers.get("location")!);
    expect(authorization.searchParams.get("prompt")).toBe("login");
    expect(authorization.searchParams.get("code_challenge_method")).toBe("S256");
    expect(authorization.searchParams.get("client_id")).toBe(clientId);
    expect(authorization.href).not.toContain(context);
    expect(cookies(started).join(" ")).not.toContain(context);
    expect(cookies(started)[0]).toContain("HttpOnly");
    expect(cookies(started)[0]).toContain("Secure");
    expect(f.calls).toEqual([]);

    const completed = await f.relyingParty.completeFreshAuthentication(f.callbackRequest(started));
    expect(completed.kind).toBe("authenticated");
    if (completed.kind !== "authenticated") throw new Error("Expected a synthetic fresh completion.");
    expect(Object.keys(completed).sort()).toEqual(["authentication", "kind", "response"]);
    expect(completed.authentication).toEqual({
      authenticatedAtMs: initialSeconds * 1_000,
      context,
      expiresAtMs: (initialSeconds + 300) * 1_000,
      startedAtMs: initialTime,
      suiteAccountId: accountId,
    });
    expect(completed.response.status).toBe(200);
    const html = await completed.response.clone().text();
    const headers = JSON.stringify([...completed.response.headers]);
    for (const secret of [context, refreshToken, subject, ...f.tokens]) {
      expect(html).not.toContain(secret);
      expect(headers).not.toContain(secret);
    }
    expect(f.calls.every(call => !call.body.includes(context) && !call.url.includes(context))).toBe(true);

    const sessionCookie = cookiePair(completed.response, sessionName);
    const session = await f.relyingParty.currentSession(request("/api/suite-auth/session", { headers: { cookie: sessionCookie } }));
    expect(session.status).toBe(200);
    const sessionJson = await session.text();
    for (const secret of [context, refreshToken, subject, "authenticatedAtMs", "startedAtMs", ...f.tokens]) {
      expect(sessionJson).not.toContain(secret);
    }
    const refreshed = await f.relyingParty.refreshSession(request("/api/suite-auth/refresh", {
      headers: { cookie: sessionCookie, origin: siteUrl, "sec-fetch-site": "same-origin" }, method: "POST",
    }));
    expect(refreshed.status).toBe(200);
    expect(await refreshed.text()).not.toContain(context);
    await expectRejected(await f.relyingParty.completeFreshAuthentication(
      f.callbackRequest(started, cookiePair(refreshed, sessionName)),
    ));
  });

  test.each([
    { name: "intent expiry", intent: initialTime + 30_000, id: initialSeconds + 300, access: initialSeconds + 420, expected: initialTime + 30_000 },
    { name: "ID token expiry", intent: initialTime + 600_000, id: initialSeconds + 35, access: initialSeconds + 420, expected: (initialSeconds + 35) * 1_000 },
    { name: "access token expiry", intent: initialTime + 600_000, id: initialSeconds + 300, access: initialSeconds + 40, expected: (initialSeconds + 40) * 1_000 },
  ])("caps completion at $name", async ({ intent, id, access, expected }) => {
    const f = await fixture();
    f.idClaims["exp"] = id;
    f.accessClaims["exp"] = access;
    const started = await f.start({ context, expiresAtMs: intent });
    const result = await f.relyingParty.completeFreshAuthentication(f.callbackRequest(started));
    expect(result.kind).toBe("authenticated");
    if (result.kind === "authenticated") expect(result.authentication.expiresAtMs).toBe(expected);
  });

  test.each([
    null, undefined, [], context, 1, {},
    { context }, { expiresAtMs: initialTime + 1 },
    { context: "x".repeat(31), expiresAtMs: initialTime + 1 },
    { context: "x".repeat(257), expiresAtMs: initialTime + 1 },
    { context: `${"x".repeat(32)}\n`, expiresAtMs: initialTime + 1 },
    { context: "https://example.com/context-000000000", expiresAtMs: initialTime + 1 },
    { context, expiresAtMs: initialTime },
    { context, expiresAtMs: initialTime - 1 },
    { context, expiresAtMs: initialTime + 600_001 },
    { context, expiresAtMs: initialTime + 0.5 },
    { context, expiresAtMs: Number.NaN },
    { context, expiresAtMs: Number.POSITIVE_INFINITY },
    { context, expiresAtMs: Number.MAX_SAFE_INTEGER + 1 },
    { context, expiresAtMs: String(initialTime + 1) },
    { context, expiresAtMs: initialTime + 1, returnTo: "/settings" },
  ])("rejects malformed server start input %# without provider work", async input => {
    const f = await fixture();
    const response = await f.relyingParty.startFreshAuthentication(request("/api/suite-auth/start"), input);
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.headers.get("location")).toBeNull();
    expect(f.calls).toEqual([]);
  });

  test("the start parser is total over arbitrary foreign values", async () => {
    const f = await fixture();
    await assertAsyncProperty(fc.asyncProperty(fc.anything(), async input => {
      const response = await f.relyingParty.startFreshAuthentication(request("/api/suite-auth/start"), input);
      expect(response.status === 302).toBe(validStartInput(input));
      expect(f.calls).toEqual([]);
    }));
  });

  test("rejects accessors and hostile proxies without executing input getters or throwing", async () => {
    const f = await fixture();
    let getterCalls = 0;
    const accessor = Object.defineProperty({ expiresAtMs: initialTime + 1_000 }, "context", {
      enumerable: true,
      get() { getterCalls++; throw new Error("Untrusted input getter."); },
    });
    const proxy = new Proxy({}, {
      ownKeys() { throw new Error("Untrusted input proxy."); },
      getOwnPropertyDescriptor() { throw new Error("Untrusted input descriptor."); },
    });
    for (const input of [accessor, proxy]) {
      const response = await f.relyingParty.startFreshAuthentication(request("/api/suite-auth/start"), input);
      expect(response.status).toBe(400);
    }
    expect(getterCalls).toBe(0);
    expect(f.calls).toEqual([]);
  });

  test("bounded opaque contexts round-trip with exact server-owned start and expiry", async () => {
    const f = await fixture();
    const opaque = fc.array(fc.constantFrom(..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-"), {
      minLength: 32, maxLength: 256,
    }).map(chars => chars.join(""));
    await assertAsyncProperty(fc.asyncProperty(opaque, fc.integer({ min: 1, max: 600_000 }), async (candidate, duration) => {
      const input = { context: candidate, expiresAtMs: initialTime + duration };
      const started = await f.start(input);
      expect(started.status).toBe(302);
      const result = await f.relyingParty.completeFreshAuthentication(f.callbackRequest(started));
      expect(result.kind).toBe("authenticated");
      if (result.kind === "authenticated") {
        expect(result.authentication).toEqual({
          authenticatedAtMs: initialSeconds * 1_000,
          context: candidate,
          expiresAtMs: Math.min(input.expiresAtMs, (initialSeconds + 300) * 1_000),
          startedAtMs: initialTime,
          suiteAccountId: accountId,
        });
      }
    }));
  });

  test("owns the validated input before caller mutation during asynchronous sealing", async () => {
    const f = await fixture();
    const input = { context, expiresAtMs: initialTime + 60_000 };
    f.setRandomHook(() => {
      input.context = "substituted_context_".repeat(3);
      input.expiresAtMs = initialTime + 600_000;
    });
    const started = await f.start(input);
    const result = await f.relyingParty.completeFreshAuthentication(f.callbackRequest(started));
    expect(result.kind).toBe("authenticated");
    if (result.kind === "authenticated") {
      expect(result.authentication.context).toBe(context);
      expect(result.authentication.expiresAtMs).toBe(initialTime + 60_000);
    }
  });

  test.each([
    { url: "https://preview.aicharts.io/api/suite-auth/start", init: {} },
    { url: "/api/suite-auth/other", init: {} },
    { url: "/api/suite-auth/start", init: { method: "POST" } },
    { url: "/api/suite-auth/start", init: { headers: { "sec-fetch-site": "cross-site" } } },
  ])("rejects noncanonical start request %# before provider work", async ({ url, init }) => {
    const f = await fixture();
    const response = await f.relyingParty.startFreshAuthentication(request(url, init), { context, expiresAtMs: initialTime + 60_000 });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(f.calls).toEqual([]);
  });

  test("does not accept fresh context supplied only through the request URL", async () => {
    const f = await fixture();
    const response = await f.relyingParty.startFreshAuthentication(request(`/api/suite-auth/start?context=${context}&expiresAtMs=${initialTime + 60_000}`), undefined);
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(f.calls).toEqual([]);
  });

  test("ordinary callback and generic handle reject fresh transactions before any provider request", async () => {
    const f = await fixture();
    const started = await f.start();
    for (const response of [
      await f.relyingParty.callback(f.callbackRequest(started)),
      await f.relyingParty.handle(f.callbackRequest(started)),
    ]) expect(response.status).toBeGreaterThanOrEqual(400);
    expect(f.calls).toEqual([]);
  });

  test("fresh completion rejects ordinary transactions before any provider request", async () => {
    const f = await fixture();
    const started = await f.relyingParty.start(request("/api/suite-auth/start"));
    expect(started.status).toBe(302);
    await expectRejected(await f.relyingParty.completeFreshAuthentication(f.callbackRequest(started)));
    expect(f.calls).toEqual([]);
  });

  test("tampered transaction ciphertext and substituted state fail before token exchange", async () => {
    const f = await fixture();
    const started = await f.start();
    const original = cookiePair(started, transactionName);
    const split = original.lastIndexOf(".") + 1;
    const tampered = original.slice(0, split) + (original[split] === "A" ? "B" : "A") + original.slice(split + 1);
    await expectRejected(await f.relyingParty.completeFreshAuthentication(f.callbackRequest(started, tampered)));
    const callback = f.callbackRequest(started);
    const wrongState = new URL(callback.url);
    wrongState.searchParams.set("state", "substituted-state");
    await expectRejected(await f.relyingParty.completeFreshAuthentication(new Request(wrongState, callback)));
    expect(f.calls).toEqual([]);
  });

  test("a different browser transaction cannot complete the original state", async () => {
    const f = await fixture();
    const first = await f.start();
    const second = await f.start();
    await expectRejected(await f.relyingParty.completeFreshAuthentication(
      f.callbackRequest(first, cookiePair(second, transactionName)),
    ));
    await expectRejected(await f.relyingParty.completeFreshAuthentication(f.callbackRequest(first, "")));
    expect(f.calls).toEqual([]);
  });

  test("fresh transaction context cannot cross consumer bindings even with the same cookie secret", async () => {
    const f = await fixture();
    const started = await f.start();
    let foreignFetches = 0;
    const otherConsumer = createSuiteOidcRelyingParty({
      consumer: "soundfish",
      cookieSecret: "synthetic-fresh-auth-cookie-secret-at-least-32-bytes",
      environment: "production",
      fetch: () => { foreignFetches++; return Promise.reject(new Error("Unexpected synthetic cross-consumer fetch.")); },
      now: () => initialTime,
      receiptKeyVersion: "v1",
    });
    const callback = f.callbackRequest(started);
    const foreignUrl = new URL(callback.url);
    foreignUrl.host = "sound.fish";
    await expectRejected(await otherConsumer.completeFreshAuthentication(new Request(foreignUrl, callback)));
    expect(foreignFetches).toBe(0);
    expect(f.calls).toEqual([]);
  });

  test.each([
    ["missing authentication time", { auth_time: undefined }],
    ["string authentication time", { auth_time: String(initialSeconds) }],
    ["fractional authentication time", { auth_time: initialSeconds + 0.1 }],
    ["negative authentication time", { auth_time: -1 }],
    ["unsafe authentication time", { auth_time: Number.MAX_SAFE_INTEGER + 1 }],
    ["stale authentication despite a new token", { auth_time: initialSeconds - 1 }],
    ["future authentication time", { auth_time: initialSeconds + 1 }],
    ["authentication after signed issuance", { iat: initialSeconds - 1 }],
    ["missing issuance", { iat: undefined }],
    ["fractional issuance", { iat: initialSeconds + 0.1 }],
    ["future issuance within ordinary clock tolerance", { iat: initialSeconds + 20 }],
    ["future not-before within ordinary clock tolerance", { nbf: initialSeconds + 20 }],
    ["missing expiry", { exp: undefined }],
    ["fractional expiry", { exp: initialSeconds + 300.5 }],
    ["expired within ordinary JWT clock tolerance", { exp: initialSeconds }],
    ["missing audience", { aud: undefined }],
    ["foreign audience", { aud: "hraness:soundfish:production:v1" }],
    ["multiple audiences including this client", { aud: [clientId, "hraness:soundfish:production:v1"] }],
    ["array-shaped audience", { aud: [clientId] }],
    ["foreign authorized party", { azp: "hraness:soundfish:production:v1" }],
    ["non-string authorized party", { azp: [clientId] }],
    ["nonce substitution", { nonce: "substituted-nonce" }],
    ["issuer substitution", { iss: "https://attacker.example" }],
    ["account disagreement", { suite_account_id: otherAccountId }],
    ["provider subject disagreement", { sub: "another-synthetic-principal" }],
  ] satisfies [string, Record<string, unknown>][]) ("rejects signed ID-token %s", async (_name, claims) => {
    const f = await fixture();
    Object.assign(f.idClaims, claims);
    const started = await f.start();
    await expectRejected(await f.relyingParty.completeFreshAuthentication(f.callbackRequest(started)));
  });

  test("accepts an exact optional authorized party", async () => {
    const f = await fixture();
    f.idClaims["azp"] = clientId;
    const started = await f.start();
    expect((await f.relyingParty.completeFreshAuthentication(f.callbackRequest(started))).kind).toBe("authenticated");
  });

  test("signed authentication ordering is bounded by start, issuance and completion time", async () => {
    const f = await fixture();
    await assertAsyncProperty(fc.asyncProperty(
      fc.integer({ min: -2, max: 4 }), fc.integer({ min: -2, max: 4 }),
      async (authenticationOffset, issuanceOffset) => {
        f.clock.now = initialTime;
        f.idClaims["auth_time"] = initialSeconds + authenticationOffset;
        f.idClaims["iat"] = initialSeconds + issuanceOffset;
        const started = await f.start();
        f.clock.now = initialTime + 2_000;
        const result = await f.relyingParty.completeFreshAuthentication(f.callbackRequest(started));
        const ordered = authenticationOffset >= 0 && authenticationOffset <= 2
          && authenticationOffset <= issuanceOffset && issuanceOffset <= 2;
        expect(result.kind === "authenticated").toBe(ordered);
        if (result.kind === "authenticated") {
          expect(result.authentication.authenticatedAtMs).toBe((initialSeconds + authenticationOffset) * 1_000);
          expect(result.authentication.startedAtMs).toBe(initialTime);
        }
      },
    ));
  });

  test("rejects signature tampering even when the decoded claims would be fresh", async () => {
    const f = await fixture();
    f.setTokenTransform(token => {
      const split = token.lastIndexOf(".") + 1;
      return token.slice(0, split) + (token[split] === "A" ? "B" : "A") + token.slice(split + 1);
    });
    const started = await f.start();
    await expectRejected(await f.relyingParty.completeFreshAuthentication(f.callbackRequest(started)));
  });

  test.each([
    ["foreign access-token client", { suite_client_id: "hraness:soundfish:production:v1" }],
    ["foreign access-token authorized party", { azp: "hraness:soundfish:production:v1" }],
    ["access-token account disagreement", { suite_account_id: otherAccountId }],
    ["strictly expired access token", { exp: initialSeconds }],
    ["future access-token not-before", { nbf: initialSeconds + 20 }],
    ["future access-token issuance", { iat: initialSeconds + 20 }],
  ] satisfies [string, Record<string, unknown>][]) ("rejects %s after ID-token verification", async (_name, claims) => {
    const f = await fixture();
    Object.assign(f.accessClaims, claims);
    const started = await f.start();
    await expectRejected(await f.relyingParty.completeFreshAuthentication(f.callbackRequest(started)));
  });

  test.each(["intent", "ID token", "access token"])("rejects %s expiry reached during provider work", async limit => {
    const f = await fixture();
    f.idClaims["exp"] = initialSeconds + (limit === "ID token" ? 1 : 300);
    f.accessClaims["exp"] = initialSeconds + (limit === "access token" ? 1 : 420);
    const expiresAtMs = limit === "intent" ? initialTime + 1_000 : initialTime + 600_000;
    const started = await f.start({ context, expiresAtMs });
    f.setFetchHook(url => { if (url === provider.jwksEndpoint) f.clock.now = initialTime + 1_000; });
    await expectRejected(await f.relyingParty.completeFreshAuthentication(f.callbackRequest(started)));
  });

  test("rejects intent expiry before provider work", async () => {
    const f = await fixture();
    const started = await f.start({ context, expiresAtMs: initialTime + 1_000 });
    f.clock.now += 1_000;
    await expectRejected(await f.relyingParty.completeFreshAuthentication(f.callbackRequest(started)));
    expect(f.calls).toEqual([]);
  });

  test.each(["before callback", "during provider work"])("rejects server clock regression %s", async stage => {
    const f = await fixture();
    const started = await f.start();
    if (stage === "before callback") f.clock.now -= 1;
    else f.setFetchHook(url => { if (url === provider.jwksEndpoint) f.clock.now -= 1; });
    await expectRejected(await f.relyingParty.completeFreshAuthentication(f.callbackRequest(started)));
    if (stage === "before callback") expect(f.calls).toEqual([]);
  });

  test.each(["expiry", "clock regression"])("rechecks %s after providers finish and session-cookie sealing starts", async condition => {
    const f = await fixture();
    const started = await f.start({ context, expiresAtMs: initialTime + 1_000 });
    f.setRandomHook(() => { f.clock.now = condition === "expiry" ? initialTime + 1_000 : initialTime - 1; });
    await expectRejected(await f.relyingParty.completeFreshAuthentication(f.callbackRequest(started)));
    expect(f.calls.map(call => call.url)).toContain(provider.tokenEndpoint);
    expect(f.calls.map(call => call.url)).toContain(provider.jwksEndpoint);
    expect(f.tokens).toHaveLength(2);
  });

  test("a consumed code cannot produce a second completion after the first response is lost", async () => {
    const f = await fixture();
    f.requireSingleUseCode();
    const started = await f.start();
    const first = await f.relyingParty.completeFreshAuthentication(f.callbackRequest(started));
    expect(first.kind).toBe("authenticated");
    // The browser received neither this continuation nor its replacement cookies.
    // Retrying the old transaction must not imply a replayable completion receipt.
    await expectRejected(await f.relyingParty.completeFreshAuthentication(f.callbackRequest(started)));
    expect(f.calls.filter(call => call.url === provider.tokenEndpoint)).toHaveLength(2);
    expect(f.tokens).toHaveLength(2);
  });
});
