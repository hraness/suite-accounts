import { describe, expect, test } from "bun:test";
import {
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWK,
} from "jose";

import { SUITE_CATALOG_REVISION } from "./identity";

import {
  createSuiteBearerVerifier,
  parseSuiteBearerAuthorization,
} from "./bearer-verifier";
import { suiteAccountsOidcProviderConfiguration } from "./urls";

const nowMs = 1_800_000_300_000;
const nowSeconds = Math.floor(nowMs / 1_000);
const accountId = "acct_018f1f7a7a367ccdbd5d706d4dc5c018";
const clientId = "hraness:gnrte:production:v1";
const provider = suiteAccountsOidcProviderConfiguration("production");

function requestUrl(input: RequestInfo | URL): string {
  return input instanceof URL
    ? input.href
    : typeof input === "string"
      ? input
      : input.url;
}

async function signingFixture(kid = "accounts-es256-gnrte-1") {
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  const publicJwk = await exportJWK(publicKey);
  const jwk: JWK = {
    ...publicJwk,
    alg: "ES256",
    kid,
    use: "sig",
  };
  async function token(
    overrides: Record<string, unknown> = {},
    options: Readonly<{
      audience?: string | readonly string[];
      expiresAtSeconds?: number;
      issuer?: string;
      notBeforeSeconds?: number;
    }> = {},
  ): Promise<string> {
    const audience = options.audience === undefined
      ? [provider.resource, provider.userInfoAudience]
      : typeof options.audience === "string"
        ? options.audience
        : [...options.audience];
    return await new SignJWT({
      azp: clientId,
      profile_complete: true,
      profile_revision: "username-v1",
      suite_account_id: accountId,
      suite_client_id: clientId,
      suite_entitlements: {
        catalogRevision: SUITE_CATALOG_REVISION,
        expiresAtMs: nowMs + 8 * 60_000,
        features: ["suite.paid"],
        observedAtMs: nowMs - 1_000,
        projectionRevision: 7,
        version: "suite-entitlements-v1",
      },
      username: "reader",
      ...overrides,
    })
      .setProtectedHeader({ alg: "ES256", kid })
      .setIssuer(options.issuer ?? provider.issuer)
      .setAudience(audience)
      .setSubject("better-auth-user-17")
      .setIssuedAt(nowSeconds)
      .setNotBefore(options.notBeforeSeconds ?? nowSeconds)
      .setExpirationTime(options.expiresAtSeconds ?? nowSeconds + 10 * 60)
      .sign(privateKey);
  }
  return { jwks: { keys: [jwk] }, token };
}

function jwksFetch(
  jwks: unknown,
  requests: Array<Readonly<{ init?: RequestInit; url: string }>>,
) {
  return (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    requests.push({
      ...(init === undefined ? {} : { init }),
      url: requestUrl(input),
    });
    return Promise.resolve(Response.json(jwks));
  };
}

describe("suite bearer authorization", () => {
  test("accepts exactly one bounded compact Bearer credential", () => {
    const token = `${"a".repeat(24)}.${"b".repeat(24)}.${"c".repeat(24)}`;
    expect(parseSuiteBearerAuthorization(`Bearer ${token}`)).toEqual({
      ok: true,
      value: token,
    });
    for (const value of [
      null,
      "",
      `bearer ${token}`,
      `Bearer  ${token}`,
      `Bearer ${token} `,
      `Bearer ${token},Bearer ${token}`,
      `Basic ${token}`,
      "Bearer a.b.c",
    ]) {
      expect(parseSuiteBearerAuthorization(value)).toEqual({
        error: "invalid-authorization",
        ok: false,
      });
    }
  });
});

describe("suite bearer verifier", () => {
  test("pins product authority and verifies one exact client-bound token", async () => {
    const signing = await signingFixture();
    const requests: Array<Readonly<{ init?: RequestInit; url: string }>> = [];
    const verifier = createSuiteBearerVerifier({
      consumer: "gnrte",
      environment: "production",
      fetch: jwksFetch(signing.jwks, requests),
      now: () => nowMs,
    });
    expect(verifier.configuration).toEqual({
      audiences: [provider.resource, provider.userInfoAudience],
      clientId,
      issuer: "https://account.hraness.com",
      jwksEndpoint: "https://account.hraness.com/api/auth/jwks",
    });
    expect(Reflect.set(
      verifier.configuration,
      "jwksEndpoint",
      "https://attacker.example/jwks",
    )).toBe(false);
    expect(Reflect.set(
      verifier.configuration.audiences,
      "0",
      "https://attacker.example/resource",
    )).toBe(false);

    const compactToken = await signing.token();
    const first = await verifier.verify(compactToken);
    expect(first).toMatchObject({
      claims: {
        profileComplete: true,
        suiteAccountId: accountId,
        username: "reader",
      },
      entitlements: {
        features: ["suite.paid"],
        kind: "fresh",
      },
      kind: "verified",
    });
    expect(await verifier.verify(compactToken)).toEqual(first);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      init: {
        cache: "no-store",
        method: "GET",
        redirect: "manual",
      },
      url: provider.jwksEndpoint,
    });
    expect(new Headers(requests[0]?.init?.headers).get("authorization"))
      .toBeNull();
  });

  test("rejects every issuer, audience, client, time, and entitlement drift", async () => {
    const signing = await signingFixture();
    const attacker = await signingFixture();
    const verifier = createSuiteBearerVerifier({
      consumer: "gnrte",
      environment: "production",
      fetch: jwksFetch(signing.jwks, []),
      now: () => nowMs,
    });
    const cases = [
      {
        reason: "claims",
        token: signing.token({}, { issuer: "https://attacker.example" }),
      },
      {
        reason: "audience",
        token: signing.token({}, { audience: [provider.resource] }),
      },
      {
        reason: "audience",
        token: signing.token({}, {
          audience: [
            provider.resource,
            provider.userInfoAudience,
            "https://attacker.example",
          ],
        }),
      },
      {
        reason: "client",
        token: signing.token({ azp: "hraness:oprte:production:v1" }),
      },
      {
        reason: "client",
        token: signing.token({
          suite_client_id: "hraness:oprte:production:v1",
        }),
      },
      {
        reason: "time",
        token: signing.token(
          {},
          { notBeforeSeconds: nowSeconds + 60 },
        ),
      },
      {
        reason: "entitlements",
        token: signing.token({
          suite_entitlements: {
            catalogRevision: SUITE_CATALOG_REVISION,
            expiresAtMs: nowMs + 8 * 60_000,
            features: ["suite.unknown"],
            observedAtMs: nowMs,
            projectionRevision: 7,
            version: "suite-entitlements-v1",
          },
        }),
      },
    ] as const;
    for (const testCase of cases) {
      expect(await verifier.verify(await testCase.token)).toEqual({
        kind: "invalid",
        reason: testCase.reason,
      });
    }
    expect(await verifier.verify(await attacker.token())).toEqual({
      kind: "invalid",
      reason: "signature",
    });
  });

  test("distinguishes unavailable or invalid JWKS from caller rejection", async () => {
    const signing = await signingFixture();
    const token = await signing.token();
    for (const fetchImplementation of [
      () => Promise.resolve(new Response("offline", { status: 503 })),
      () => Promise.resolve(Response.json({ keys: [] })),
      () =>
        Promise.resolve(Response.json({
          keys: [
            {
              ...signing.jwks.keys[0],
              d: "private-key-material-must-never-enter-a-verifier",
            },
          ],
        })),
      () => Promise.resolve(new Response(
        JSON.stringify(signing.jwks),
        {
          headers: { "content-type": "text/plain" },
          status: 200,
        },
      )),
      () =>
        Promise.resolve(new Response(null, {
          headers: { location: "https://attacker.example/jwks" },
          status: 302,
        })),
      () =>
        Promise.resolve(new Response("{}", {
          headers: {
            "content-length": String(64 * 1_024 + 1),
            "content-type": "application/json",
          },
          status: 200,
        })),
    ]) {
      const verifier = createSuiteBearerVerifier({
        consumer: "gnrte",
        environment: "production",
        fetch: fetchImplementation,
        now: () => nowMs,
      });
      expect(await verifier.verify(token)).toEqual({
        kind: "unavailable",
        reason: "jwks",
      });
    }
    const verifier = createSuiteBearerVerifier({
      consumer: "gnrte",
      environment: "production",
      fetch: jwksFetch(signing.jwks, []),
      now: () => nowMs,
    });
    expect(await verifier.verify("not-a-jwt")).toEqual({
      kind: "invalid",
      reason: "authorization",
    });
  });

  test("rejects malformed P-256 coordinates as unavailable without caching them", async () => {
    const signing = await signingFixture();
    const token = await signing.token();
    const original = signing.jwks.keys[0];
    const malformedKeys = [
      {
        ...original,
        x: "junk-coordinate",
      },
      {
        ...original,
        x: `${"A".repeat(42)}B`,
      },
      {
        ...original,
        x: "A".repeat(43),
        y: "A".repeat(43),
      },
    ];

    for (const malformedKey of malformedKeys) {
      let requests = 0;
      const verifier = createSuiteBearerVerifier({
        consumer: "gnrte",
        environment: "production",
        fetch: () => {
          requests += 1;
          return Promise.resolve(Response.json({ keys: [malformedKey] }));
        },
        now: () => nowMs,
      });
      expect(await verifier.verify(token)).toEqual({
        kind: "unavailable",
        reason: "jwks",
      });
      expect(await verifier.verify(token)).toEqual({
        kind: "unavailable",
        reason: "jwks",
      });
      expect(requests).toBe(2);
    }
  });

  test("keeps a warm key after an unknown-kid refresh fails", async () => {
    const first = await signingFixture("accounts-es256-gnrte-old");
    const rotated = await signingFixture("accounts-es256-gnrte-new");
    const firstToken = await first.token();
    const rotatedToken = await rotated.token();
    let clock = nowMs;
    let currentJwks: unknown = first.jwks;
    let unavailable = false;
    let requests = 0;
    const verifier = createSuiteBearerVerifier({
      consumer: "gnrte",
      environment: "production",
      fetch: () => {
        requests += 1;
        return Promise.resolve(unavailable
          ? new Response("offline", { status: 503 })
          : Response.json(currentJwks));
      },
      jwksRefreshCooldownMs: 60_000,
      now: () => clock,
    });

    expect((await verifier.verify(firstToken)).kind).toBe("verified");
    unavailable = true;
    expect(await verifier.verify(rotatedToken)).toEqual({
      kind: "unavailable",
      reason: "jwks",
    });
    expect(requests).toBe(2);

    expect((await verifier.verify(firstToken)).kind).toBe("verified");
    expect(requests).toBe(2);

    unavailable = false;
    currentJwks = rotated.jwks;
    expect(await verifier.verify(rotatedToken)).toEqual({
      kind: "invalid",
      reason: "signature",
    });
    expect(requests).toBe(2);

    clock += 60_000;
    expect((await verifier.verify(rotatedToken)).kind).toBe("verified");
    expect(requests).toBe(3);
  });

  test("bounds unknown-key refreshes while still accepting key rotation", async () => {
    const first = await signingFixture("accounts-es256-gnrte-old");
    const rotated = await signingFixture("accounts-es256-gnrte-new");
    let clock = nowMs;
    const requests: Array<Readonly<{ init?: RequestInit; url: string }>> = [];
    let currentJwks: unknown = first.jwks;
    const verifier = createSuiteBearerVerifier({
      consumer: "gnrte",
      environment: "production",
      fetch: (input, init) => {
        requests.push({
          ...(init === undefined ? {} : { init }),
          url: requestUrl(input),
        });
        return Promise.resolve(Response.json(currentJwks));
      },
      jwksRefreshCooldownMs: 60_000,
      now: () => clock,
    });
    expect((await verifier.verify(await first.token())).kind).toBe("verified");
    currentJwks = rotated.jwks;
    expect((await verifier.verify(await rotated.token())).kind)
      .toBe("verified");
    expect(requests).toHaveLength(2);

    for (let index = 0; index < 20; index += 1) {
      const header = Buffer.from(JSON.stringify({
        alg: "ES256",
        kid: `attacker-${index}`,
      })).toString("base64url");
      const payload = Buffer.from("{}").toString("base64url");
      const token = `${header}.${payload}.${"a".repeat(86)}`;
      expect(await verifier.verify(token)).toEqual({
        kind: "invalid",
        reason: "signature",
      });
    }
    expect(requests).toHaveLength(2);

    clock += 60_000;
    const header = Buffer.from(JSON.stringify({
      alg: "ES256",
      kid: "attacker-after-cooldown",
    })).toString("base64url");
    const payload = Buffer.from("{}").toString("base64url");
    expect(await verifier.verify(
      `${header}.${payload}.${"a".repeat(86)}`,
    )).toEqual({ kind: "invalid", reason: "signature" });
    expect(requests).toHaveLength(3);
  });

  test("fails closed on invalid verifier timing configuration", () => {
    expect(() => createSuiteBearerVerifier({
      consumer: "gnrte",
      environment: "production",
      fetchTimeoutMs: 99,
    })).toThrow("100–30000ms");
    expect(() => createSuiteBearerVerifier({
      consumer: "gnrte",
      environment: "production",
      jwksCacheTtlMs: 999,
    })).toThrow("1000–86400000ms");
    expect(() => createSuiteBearerVerifier({
      consumer: "gnrte",
      environment: "production",
      jwksRefreshCooldownMs: 999,
    })).toThrow("1000–300000ms");
  });
});
