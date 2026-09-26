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
  SUITE_CONVEX_BROWSER_CONSUMER_IDS,
  SUITE_CONVEX_BROWSER_TOKEN_USE,
  suiteConvexBrowserConfiguration,
  type SuiteConvexBrowserConfiguration,
} from "./convex-browser-auth";
import {
  createSuiteConvexBrowserAuthHandlers,
  createSuiteConvexBrowserTokenSigner,
  parseSuiteConvexBrowserKeyring,
  type SuiteConvexBrowserKeyring,
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
const configuration = suiteConvexBrowserConfiguration("alt", "production");

// The retired Elders trust values stay in fixtures so the closure assertions
// prove a formerly admitted consumer cannot reopen the grant.
const retiredConfiguration: SuiteConvexBrowserConfiguration = {
  audience: "https://elders.hraness.com/convex",
  clientId: "hraness:elders:production:v1",
  consumer: "elders" as never,
  environment: "production",
  issuer: "https://elders.hraness.com/api/convex-auth",
  jwksEndpoint: "https://elders.hraness.com/api/convex-auth/jwks",
  siteUrl: "https://elders.hraness.com",
  suiteIssuer: "https://account.hraness.com",
  tokenEndpoint: "https://elders.hraness.com/api/convex-auth/token",
};

// Platonik is a current OIDC consumer without a browser-token grant. Its
// registered trust values must not open the exchange either.
const unadmittedConfiguration: SuiteConvexBrowserConfiguration = {
  audience: "https://platonik.space/convex",
  clientId: "hraness:platonik:production:v1",
  consumer: "platonik" as never,
  environment: "production",
  issuer: "https://platonik.space/api/convex-auth",
  jwksEndpoint: "https://platonik.space/api/convex-auth/jwks",
  siteUrl: "https://platonik.space",
  suiteIssuer: "https://account.hraness.com",
  tokenEndpoint: "https://platonik.space/api/convex-auth/token",
};

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

function keyringValue(consumer = "alt") {
  const active = privateJwk(`${consumer}-production-2`);
  const retiring = privateJwk(`${consumer}-production-1`);
  return {
    activeKid: active.kid,
    consumer,
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

describe("suite Convex browser server authority", () => {
  test("admits only Alt at its exact registered endpoints", () => {
    expect(SUITE_CONVEX_BROWSER_CONSUMER_IDS).toEqual(["alt"]);
    expect(configuration).toEqual({
      audience: "https://alt.dog/convex",
      clientId: "hraness:alt:production:v1",
      consumer: "alt",
      environment: "production",
      issuer: "https://alt.dog/api/convex-auth",
      jwksEndpoint: "https://alt.dog/api/convex-auth/jwks",
      siteUrl: "https://alt.dog",
      suiteIssuer: "https://account.hraness.com",
      tokenEndpoint: "https://alt.dog/api/convex-auth/token",
    });
  });

  test("rejects the retired and unadmitted keyrings, signers, and route handlers", () => {
    for (const [denied, consumer] of [
      [retiredConfiguration, "elders"],
      [unadmittedConfiguration, "platonik"],
    ] as const) {
      expect(() => parseSuiteConvexBrowserKeyring(
        keyringValue(consumer),
        denied,
      )).toThrow("no Convex browser-token grant");
      const deniedKeyring = undefined as unknown as SuiteConvexBrowserKeyring;
      expect(() => createSuiteConvexBrowserTokenSigner(
        denied,
        deniedKeyring,
        () => nowMs,
      )).toThrow("no Convex browser-token grant");
      expect(() => createSuiteConvexBrowserAuthHandlers({
        configuration: denied,
        keyring: deniedKeyring,
        now: () => nowMs,
        serverSession: () => Promise.reject(new Error("must not read session")),
      })).toThrow("no Convex browser-token grant");
    }
  });

  test("rejects an Alt configuration carrying any substituted trust value", () => {
    const substitutes = {
      audience: "https://platonik.space/convex",
      clientId: "hraness:platonik:production:v1",
      consumer: "platonik",
      environment: "staging",
      issuer: "https://attacker.example/api/convex-auth",
      jwksEndpoint: "https://attacker.example/jwks",
      siteUrl: "https://www.alt.dog",
      suiteIssuer: "https://attacker.example",
      tokenEndpoint: "https://alt.dog/api/convex-auth/token/",
    } as const satisfies Record<keyof SuiteConvexBrowserConfiguration, string>;
    for (const [key, value] of Object.entries(substitutes)) {
      const drifted: SuiteConvexBrowserConfiguration = {
        ...configuration,
        [key]: value,
      };
      expect(drifted[key as keyof SuiteConvexBrowserConfiguration]).toBe(value);
      expect(() => parseSuiteConvexBrowserKeyring(keyringValue(), drifted))
        .toThrow();
      expect(() => createSuiteConvexBrowserAuthHandlers({
        configuration: drifted,
        keyring: parsedKeyring(),
        now: () => nowMs,
        serverSession: () => Promise.reject(new Error("must not read session")),
      })).toThrow();
    }
    const widenedValue = { ...configuration, extra: "https://attacker.example" };
    const widened: SuiteConvexBrowserConfiguration = widenedValue;
    expect(() => parseSuiteConvexBrowserKeyring(keyringValue(), widened))
      .toThrow("does not match the registry");
  });
});

describe("suite Convex browser P-256 keyring", () => {
  test("keeps the active private coordinate out of the parsed keyring and JWKS", () => {
    const parsed = parsedKeyring();
    expect(parsed.activeKid).toBe("alt-production-2");
    expect(parsed.consumer).toBe("alt");
    expect(parsed.jwks.keys.map(key => key.kid)).toEqual([
      "alt-production-2",
      "alt-production-1",
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
    expect(parsed.activeKid).toBe("alt-production-2");
  });

  test("rejects caller-selected token endpoints after configuration creation", () => {
    const mutable = { ...configuration };
    mutable.jwksEndpoint = "https://attacker.example/jwks";
    expect(() => parseSuiteConvexBrowserKeyring(keyringValue(), mutable))
      .toThrow("does not match the registry");
  });

  test("rejects version, environment, consumer, shape, duplicate, and key-pair drift", () => {
    const value = keyringValue();
    const other = privateJwk("other");
    const cases = [
      { ...value, version: "v2" },
      { ...value, environment: "staging" },
      { ...value, consumer: "elders" },
      { ...value, consumer: "platonik" },
      { ...value, consumer: "Alt" },
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
  test("mints one exact Alt-only five-minute token", async () => {
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
      kid: "alt-production-2",
      typ: "JWT",
    });
    const verified = await jwtVerify(
      result.token,
      createLocalJWKSet(keyring.jwks as JSONWebKeySet),
      {
        algorithms: ["ES256"],
        audience: "https://alt.dog/convex",
        currentDate: new Date(nowMs),
        issuer: "https://alt.dog/api/convex-auth",
      },
    );
    expect(verified.payload).toMatchObject({
      aud: "https://alt.dog/convex",
      iss: "https://alt.dog/api/convex-auth",
      profile_complete: true,
      profile_revision: "username-v1",
      sub: accountId,
      suite_account_id: accountId,
      suite_client_id: "hraness:alt:production:v1",
      suite_issuer: "https://account.hraness.com",
      token_use: SUITE_CONVEX_BROWSER_TOKEN_USE,
      username,
    });
    expect(verified.payload).not.toHaveProperty("access_token");
    expect(verified.payload).not.toHaveProperty("email");
    expect(verified.payload).not.toHaveProperty("name");
    for (const [audience, issuer] of [
      ["https://platonik.space/convex", "https://alt.dog/api/convex-auth"],
      ["https://alt.dog/convex", "https://platonik.space/api/convex-auth"],
    ] as const) {
      let rejected = false;
      try {
        await jwtVerify(
          result.token,
          createLocalJWKSet(keyring.jwks as JSONWebKeySet),
          { algorithms: ["ES256"], audience, currentDate: new Date(nowMs), issuer },
        );
      } catch {
        rejected = true;
      }
      expect(rejected).toBe(true);
    }
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

  test("rejects a keyring that this module did not parse", () => {
    const forged = structuredClone(parsedKeyring());
    expect(() => createSuiteConvexBrowserTokenSigner(
      configuration,
      forged,
      () => nowMs,
    )).toThrow("was not parsed by this module");
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
    const response = await handlers.jwks(
      new Request("https://alt.dog/api/convex-auth/jwks"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
    const body = await response.text();
    expect(body).not.toContain('"d"');
    expect(JSON.parse(body)).toMatchObject({
      keys: [{ kid: "alt-production-2" }, { kid: "alt-production-1" }],
    });
    for (const request of [
      new Request(configuration.jwksEndpoint, { method: "POST" }),
      new Request(`${configuration.jwksEndpoint}?cache=1`),
      new Request("https://evil.example/api/convex-auth/jwks"),
      new Request("https://platonik.space/api/convex-auth/jwks"),
      new Request("https://www.alt.dog/api/convex-auth/jwks"),
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
    const response = await handlers.token(
      tokenRequest({ url: "https://alt.dog/api/convex-auth/token" }),
    );
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
      tokenRequest({ url: "https://platonik.space/api/convex-auth/token" }),
      tokenRequest({ headers: { origin: "https://evil.example" } }),
      tokenRequest({ headers: { origin: "https://platonik.space" } }),
      tokenRequest({ headers: { origin: "https://www.alt.dog" } }),
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
    const signedOutResponse = await signedOut.token(tokenRequest());
    expect(signedOutResponse.status).toBe(401);
    expect(await signedOutResponse.json()).toEqual({ kind: "signed_out" });

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
