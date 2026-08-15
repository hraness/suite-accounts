import { describe, expect, expectTypeOf, test } from "bun:test";

import {
  parseSuiteAccountId,
  parseSuiteUsername,
  type SuiteAccountId,
  type SuiteUsername,
} from "./identity";

import {
  parseSuiteConvexBrowserIdentity,
  SUITE_CONVEX_BROWSER_CONSUMER_IDS,
  SUITE_CONVEX_BROWSER_TOKEN_USE,
  suiteConvexBrowserAuthConfig,
  suiteConvexBrowserConfiguration,
  suiteConvexBrowserEnvironmentForOrigin,
  type SuiteConvexBrowserConsumerId,
} from "./convex-browser-auth";

const parsedAccountId = parseSuiteAccountId(
  "acct_018f1f7a7a367ccdbd5d706d4dc5c018",
);
if (!parsedAccountId.ok) throw new Error("The account fixture did not parse.");
const accountId = parsedAccountId.value;
const parsedUsername = parseSuiteUsername("reader");
if (!parsedUsername.ok) throw new Error("The username fixture did not parse.");
const username = parsedUsername.value;

describe("suite Convex browser-token configuration", () => {
  test("admits only Elders and pins production", () => {
    expect(SUITE_CONVEX_BROWSER_CONSUMER_IDS).toEqual(["elders"]);
    expectTypeOf<SuiteConvexBrowserConsumerId>().toEqualTypeOf<"elders">();

    expect(suiteConvexBrowserConfiguration("elders", "production"))
      .toEqual({
        audience: "https://elders.hraness.com/convex",
        clientId: "hraness:elders:production:v1",
        consumer: "elders",
        environment: "production",
        issuer: "https://elders.hraness.com/api/convex-auth",
        jwksEndpoint: "https://elders.hraness.com/api/convex-auth/jwks",
        siteUrl: "https://elders.hraness.com",
        suiteIssuer: "https://account.hraness.com",
        tokenEndpoint: "https://elders.hraness.com/api/convex-auth/token",
      });
    expect(() => suiteConvexBrowserConfiguration(
      "sup" as SuiteConvexBrowserConsumerId,
      "production",
    )).toThrow("no Convex browser-token grant");
  });

  test("resolves deployment only from the exact registered origin", () => {
    expect(suiteConvexBrowserEnvironmentForOrigin(
      "elders",
      "https://elders.hraness.com",
    )).toBe("production");
    expect(suiteConvexBrowserEnvironmentForOrigin(
      "elders",
      "https://preview.elders.hraness.com",
    )).toBeNull();
    for (const value of [
      "http://elders.hraness.com",
      "https://elders.hraness.com.evil",
      "https://elders.hraness.com/",
      undefined,
      null,
    ]) {
      expect(suiteConvexBrowserEnvironmentForOrigin("elders", value))
        .toBeNull();
    }
  });

  test("builds one exact ES256 custom-JWT provider", () => {
    const authConfig = suiteConvexBrowserAuthConfig("elders", "production");
    expect(authConfig).toEqual({
      providers: [
        {
          algorithm: "ES256",
          applicationID: "https://elders.hraness.com/convex",
          issuer: "https://elders.hraness.com/api/convex-auth",
          jwks: "https://elders.hraness.com/api/convex-auth/jwks",
          type: "customJwt",
        },
      ],
    });
    expect(Reflect.set(
      SUITE_CONVEX_BROWSER_CONSUMER_IDS,
      "0",
      "sup",
    )).toBe(false);
    expect(Reflect.set(
      authConfig.providers[0]!,
      "issuer",
      "https://attacker.example",
    )).toBe(false);
    expect(SUITE_CONVEX_BROWSER_CONSUMER_IDS).toEqual(["elders"]);
    const provider = authConfig.providers[0];
    expect(provider && "issuer" in provider ? provider.issuer : null).toBe(
      "https://elders.hraness.com/api/convex-auth",
    );
  });

  test("returns an immutable exact browser-token configuration", () => {
    const configuration = suiteConvexBrowserConfiguration(
      "elders",
      "production",
    );
    expect(Reflect.set(
      configuration,
      "jwksEndpoint",
      "https://attacker.example/jwks",
    )).toBe(false);
    expect(suiteConvexBrowserConfiguration("elders", "production").jwksEndpoint)
      .toBe("https://elders.hraness.com/api/convex-auth/jwks");
  });
});

describe("suite Convex browser identity", () => {
  const configuration = suiteConvexBrowserConfiguration(
    "elders",
    "production",
  );
  const identity = {
    issuer: configuration.issuer,
    profile_complete: true,
    profile_revision: "username-v1",
    subject: accountId,
    suite_account_id: accountId,
    suite_client_id: configuration.clientId,
    suite_issuer: configuration.suiteIssuer,
    tokenIdentifier: `${configuration.issuer}|${accountId}`,
    token_use: SUITE_CONVEX_BROWSER_TOKEN_USE,
    username: "reader",
  } as const;

  test("parses only the signed account and public username projection", () => {
    const parsed = parseSuiteConvexBrowserIdentity(identity, configuration);
    expect(parsed).toEqual({
      ok: true,
      value: {
        issuer: configuration.issuer,
        subject: accountId,
        suiteAccountId: accountId,
        username,
      },
    });
    if (parsed.ok) {
      expectTypeOf(parsed.value.suiteAccountId).toEqualTypeOf<SuiteAccountId>();
      expectTypeOf(parsed.value.username).toEqualTypeOf<SuiteUsername>();
    }
  });

  test("rejects every product, suite, use, profile, and subject drift", () => {
    const cases = [
      [{ ...identity, issuer: "https://evil.example" }, "invalid-issuer"],
      [{ ...identity, suite_client_id: "hraness:sup:production:v1" }, "invalid-client"],
      [{ ...identity, suite_issuer: "https://evil.example" }, "invalid-client"],
      [{ ...identity, token_use: "access" }, "invalid-token-use"],
      [{ ...identity, profile_complete: false }, "invalid-profile"],
      [{ ...identity, profile_revision: null }, "invalid-profile"],
      [{ ...identity, username: "Reader" }, "invalid-profile"],
      [{ ...identity, subject: "acct_ffffffffffffffffffffffffffffffff" }, "invalid-subject"],
      [{ ...identity, suite_account_id: "acct_bad" }, "invalid-subject"],
      [null, "invalid-identity"],
    ] as const;
    for (const [candidate, error] of cases) {
      expect(parseSuiteConvexBrowserIdentity(candidate, configuration))
        .toEqual({ error, ok: false });
    }
  });
});
