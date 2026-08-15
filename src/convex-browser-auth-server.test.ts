import { describe, expect, test } from "bun:test";
import { generateKeyPairSync } from "node:crypto";
import {
  createLocalJWKSet,
  decodeProtectedHeader,
  jwtVerify,
  type JSONWebKeySet,
} from "jose";

import {
  parseSuiteAccountId,
  parseSuiteUsername,
} from "./identity";

import {
  SUITE_CONVEX_BROWSER_TOKEN_USE,
  suiteConvexBrowserConfiguration,
} from "./convex-browser-auth";
import {
  createSuiteConvexBrowserAuthHandlers,
  createSuiteConvexBrowserTokenSigner,
  parseSuiteConvexBrowserKeyring,
} from "./convex-browser-auth-server";

const parsedAccountId = parseSuiteAccountId(
  "acct_018f1f7a7a367ccdbd5d706d4dc5c018",
);
const parsedUsername = parseSuiteUsername("reader");
if (!parsedAccountId.ok || !parsedUsername.ok) {
  throw new Error("The identity fixture did not parse.");
}
const accountId = parsedAccountId.value;
const username = parsedUsername.value;
const nowMs = 1_800_000_300_250;
const configuration = suiteConvexBrowserConfiguration(
  "elders",
  "production",
);

function privateJwk(kid: string) {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const value = privateKey.export({ format: "jwk" });
  if (
    value.kty !== "EC"
    || value.crv !== "P-256"
    || value.x === undefined
    || value.y === undefined
    || value.d === undefined
  ) {
    throw new Error("The test key was not P-256.");
  }
  return {
    alg: "ES256",
    crv: "P-256",
    d: value.d,
    kid,
    kty: "EC",
    use: "sig",
    x: value.x,
    y: value.y,
  } as const;
}

function keyringValue() {
  const active = privateJwk("elders-production-2");
  const retiring = privateJwk("elders-production-1");
  return {
    activeKid: active.kid,
    consumer: "elders",
    environment: "production",
    keys: [
      { ...retiring, d: undefined },
      active,
    ],
    version: "suite-convex-browser-keyring-v1",
  } as const;
}

function parsedKeyring() {
  const parsed = parseSuiteConvexBrowserKeyring(
    keyringValue(),
    configuration,
  );
  if (parsed === null) throw new Error("The keyring fixture did not parse.");
  return parsed;
}

function tokenRequest(
  overrides: Readonly<{
    headers?: HeadersInit;
    method?: string;
    url?: string;
  }> = {},
): Request {
  return new Request(overrides.url ?? configuration.tokenEndpoint, {
    headers: overrides.headers ?? {
      origin: configuration.siteUrl,
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
    },
    method: overrides.method ?? "POST",
  });
}

describe("suite Convex browser P-256 keyring", () => {
  test("keeps the active private coordinate out of the parsed keyring and JWKS", () => {
    const parsed = parsedKeyring();
    expect(parsed.activeKid).toBe("elders-production-2");
    expect(parsed.jwks.keys.map(key => key.kid)).toEqual([
      "elders-production-2",
      "elders-production-1",
    ]);
    const serialized = JSON.stringify(parsed);
    expect(serialized).not.toContain('"d"');
    expect(serialized).not.toContain("private");
    for (const key of parsed.jwks.keys) {
      expect(Object.keys(key).sort()).toEqual([
        "alg",
        "crv",
        "kid",
        "kty",
        "use",
        "x",
        "y",
      ]);
    }
    expect(Reflect.set(parsed, "activeKid", "attacker")).toBe(false);
    expect(Reflect.set(parsed.jwks.keys[0]!, "kid", "attacker")).toBe(false);
    expect(parsed.activeKid).toBe("elders-production-2");
  });

  test("rejects caller-selected token endpoints after configuration creation", () => {
    const mutable = { ...configuration };
    mutable.jwksEndpoint = "https://attacker.example/jwks";
    expect(() => parseSuiteConvexBrowserKeyring(keyringValue(), mutable))
      .toThrow("does not match the registry");
  });

  test("rejects version, environment, shape, duplicate, and key-pair drift", () => {
    const value = keyringValue();
    const other = privateJwk("other");
    const cases = [
      { ...value, version: "v2" },
      { ...value, environment: "staging" },
      { ...value, consumer: "sup" },
      { ...value, unexpected: true },
      { ...value, activeKid: "missing" },
      { ...value, keys: [] },
      { ...value, keys: [value.keys[1], value.keys[1]] },
      {
        ...value,
        keys: [{ ...value.keys[1], x: other.x, y: other.y }],
      },
      {
        ...value,
        keys: [{ ...value.keys[1], d: undefined }],
      },
      {
        ...value,
        keys: [{ ...value.keys[1], alg: "ES384" }],
      },
    ];
    for (const candidate of cases) {
      expect(parseSuiteConvexBrowserKeyring(candidate, configuration)).toBeNull();
    }
  });
});

describe("suite Convex browser signer", () => {
  test("mints one exact Elders-only five-minute token", async () => {
    const keyring = parsedKeyring();
    const signer = createSuiteConvexBrowserTokenSigner(
      configuration,
      keyring,
      () => nowMs,
    );
    const result = await signer.sign({
      accessTokenExpiresAtMs: nowMs + 10 * 60_000,
      suiteAccountId: accountId,
      username,
    });
    expect(result.kind).toBe("token");
    if (result.kind !== "token") throw new Error("Expected a token.");
    expect(result.expiresAtMs).toBe(Math.floor(nowMs / 1_000) * 1_000 + 300_000);
    expect(decodeProtectedHeader(result.token)).toEqual({
      alg: "ES256",
      kid: keyring.activeKid,
      typ: "JWT",
    });
    const verified = await jwtVerify(
      result.token,
      createLocalJWKSet(keyring.jwks as JSONWebKeySet),
      {
        algorithms: ["ES256"],
        audience: configuration.audience,
        currentDate: new Date(nowMs),
        issuer: configuration.issuer,
      },
    );
    expect(verified.payload).toMatchObject({
      aud: configuration.audience,
      iss: configuration.issuer,
      profile_complete: true,
      profile_revision: "username-v1",
      sub: accountId,
      suite_account_id: accountId,
      suite_client_id: configuration.clientId,
      suite_issuer: configuration.suiteIssuer,
      token_use: SUITE_CONVEX_BROWSER_TOKEN_USE,
      username,
    });
    expect(verified.payload).not.toHaveProperty("access_token");
    expect(verified.payload).not.toHaveProperty("email");
    expect(verified.payload).not.toHaveProperty("name");
  });

  test("caps expiry by the parent and closes near parent refresh", async () => {
    const signer = createSuiteConvexBrowserTokenSigner(
      configuration,
      parsedKeyring(),
      () => nowMs,
    );
    const capped = await signer.sign({
      accessTokenExpiresAtMs: nowMs + 90_750,
      suiteAccountId: accountId,
      username,
    });
    expect(capped).toMatchObject({
      expiresAtMs: Math.floor((nowMs + 90_750) / 1_000) * 1_000,
      kind: "token",
    });
    expect(await signer.sign({
      accessTokenExpiresAtMs: nowMs + 29_999,
      suiteAccountId: accountId,
      username,
    })).toEqual({ kind: "refresh_required" });
  });
});

describe("suite Convex browser route handlers", () => {
  test("serves public-only no-store JWKS from one exact GET", async () => {
    const handlers = createSuiteConvexBrowserAuthHandlers({
      configuration,
      keyring: parsedKeyring(),
      now: () => nowMs,
      serverSession: () => Promise.reject(new Error("must not read session")),
    });
    const response = await handlers.jwks(new Request(configuration.jwksEndpoint));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
    const body = await response.text();
    expect(body).not.toContain('"d"');
    expect(JSON.parse(body)).toMatchObject({
      keys: [{ kid: "elders-production-2" }, { kid: "elders-production-1" }],
    });
    for (const request of [
      new Request(configuration.jwksEndpoint, { method: "POST" }),
      new Request(`${configuration.jwksEndpoint}?cache=1`),
      new Request("https://evil.example/api/convex-auth/jwks"),
    ]) {
      expect((await handlers.jwks(request)).status).toBe(403);
    }
  });

  test("mints from a current server session without exposing its bearer", async () => {
    const centralAccessToken = "central-access-token-must-stay-http-only";
    let sessionReads = 0;
    const handlers = createSuiteConvexBrowserAuthHandlers({
      configuration,
      keyring: parsedKeyring(),
      now: () => nowMs,
      serverSession: () => {
        sessionReads += 1;
        return Promise.resolve({
          accessToken: centralAccessToken,
          accessTokenExpiresAtMs: nowMs + 10 * 60_000,
          suiteAccountId: accountId,
          username,
        });
      },
    });
    const response = await handlers.token(tokenRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
    const body = await response.text();
    expect(body).not.toContain(centralAccessToken);
    expect(JSON.parse(body)).toMatchObject({
      kind: "token",
      version: "suite-convex-browser-token-response-v1",
    });
    expect(sessionReads).toBe(1);
  });

  test("rejects method, origin, path, body, and cross-site metadata before session", async () => {
    let sessionReads = 0;
    const handlers = createSuiteConvexBrowserAuthHandlers({
      configuration,
      keyring: parsedKeyring(),
      now: () => nowMs,
      serverSession: () => {
        sessionReads += 1;
        return Promise.resolve(null);
      },
    });
    const cases = [
      tokenRequest({ method: "GET" }),
      tokenRequest({ url: `${configuration.tokenEndpoint}?retry=1` }),
      tokenRequest({ url: "https://evil.example/api/convex-auth/token" }),
      tokenRequest({ headers: { origin: "https://evil.example" } }),
      tokenRequest({ headers: {
        origin: configuration.siteUrl,
        "sec-fetch-site": "cross-site",
      } }),
      tokenRequest({ headers: {
        origin: configuration.siteUrl,
        "sec-fetch-mode": "navigate",
      } }),
      tokenRequest({ headers: {
        origin: configuration.siteUrl,
        "sec-fetch-dest": "document",
      } }),
      tokenRequest({ headers: {
        "content-type": "application/json",
        origin: configuration.siteUrl,
      } }),
      new Request(configuration.tokenEndpoint, {
        body: "{}",
        headers: { origin: configuration.siteUrl },
        method: "POST",
      }),
    ];
    for (const request of cases) {
      const response = await handlers.token(request);
      expect(response.status).toBe(403);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    expect(sessionReads).toBe(0);
  });

  test("returns only closed signed-out and refresh envelopes", async () => {
    const keyring = parsedKeyring();
    const signedOut = createSuiteConvexBrowserAuthHandlers({
      configuration,
      keyring,
      now: () => nowMs,
      serverSession: () => Promise.resolve(null),
    });
    expect(await (await signedOut.token(tokenRequest())).json()).toEqual({
      kind: "signed_out",
    });

    const refresh = createSuiteConvexBrowserAuthHandlers({
      configuration,
      keyring,
      now: () => nowMs,
      serverSession: () => Promise.resolve({
        accessToken: "central-token",
        accessTokenExpiresAtMs: nowMs + 20_000,
        suiteAccountId: accountId,
        username,
      }),
    });
    const response = await refresh.token(tokenRequest());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ kind: "refresh_required" });
  });
});
