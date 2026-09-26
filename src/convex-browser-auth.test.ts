import { describe, expect, expectTypeOf, test } from "bun:test";
import fc from "fast-check";

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
import {
  getSuiteAccountsConsumerEnvironment,
  getSuiteAccountsCurrentConsumerEnvironment,
  SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS,
  SUITE_ACCOUNTS_REGISTERED_CONSUMER_IDS,
  SUITE_CONSUMER_IDS,
} from "./registry";

const parsedAccountId = parseSuiteAccountId(
  "acct_018f1f7a7a367ccdbd5d706d4dc5c018",
);
if (!parsedAccountId.ok) throw new Error("The account fixture did not parse.");
const accountId = parsedAccountId.value;
const parsedUsername = parseSuiteUsername("reader");
if (!parsedUsername.ok) throw new Error("The username fixture did not parse.");
const username = parsedUsername.value;

const altConfiguration = {
  audience: "https://alt.dog/convex",
  clientId: "hraness:alt:production:v1",
  consumer: "alt",
  environment: "production",
  issuer: "https://alt.dog/api/convex-auth",
  jwksEndpoint: "https://alt.dog/api/convex-auth/jwks",
  siteUrl: "https://alt.dog",
  suiteIssuer: "https://account.hraness.com",
  tokenEndpoint: "https://alt.dog/api/convex-auth/token",
} as const;

/**
 * Every identity that exists anywhere in the package, plus retired and
 * look-alike spellings. None of them except `alt` may reach the grant.
 */
function nonAltConsumerCandidates(): readonly string[] {
  const candidates = new Set<string>([
    ...SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS,
    ...SUITE_ACCOUNTS_REGISTERED_CONSUMER_IDS,
    ...SUITE_CONSUMER_IDS,
    "elders", "subcounter", "hra", "oprte", "kitchen", "loops", "wrench",
    "Alt", "ALT", " alt", "alt ", "alt.dog", "alt-dog", "hraness:alt:production:v1",
    "",
  ]);
  candidates.delete("alt");
  return [...candidates];
}

describe("suite Convex browser-token configuration", () => {
  test("admits only Alt and derives its production trust values", () => {
    expect(SUITE_CONVEX_BROWSER_CONSUMER_IDS).toEqual(["alt"]);
    expectTypeOf<SuiteConvexBrowserConsumerId>().toEqualTypeOf<"alt">();
    expect(suiteConvexBrowserConfiguration("alt", "production"))
      .toEqual(altConfiguration);
  });

  test("rejects every other current, deprecated, historical, and retired consumer", () => {
    const candidates = nonAltConsumerCandidates();
    for (const consumer of SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS) {
      if (consumer !== "alt") expect(candidates).toContain(consumer);
    }
    for (const consumer of candidates) {
      const denied = consumer as SuiteConvexBrowserConsumerId;
      expect(() => suiteConvexBrowserConfiguration(denied, "production"))
        .toThrow("no Convex browser-token grant");
      expect(() => suiteConvexBrowserAuthConfig(denied, "production"))
        .toThrow("no Convex browser-token grant");
      const registeredOrigins = [
        getSuiteAccountsCurrentConsumerEnvironment(consumer, "production")?.siteUrl,
        getSuiteAccountsConsumerEnvironment(consumer, "production")?.siteUrl,
        altConfiguration.siteUrl,
      ];
      for (const origin of registeredOrigins) {
        expect(suiteConvexBrowserEnvironmentForOrigin(denied, origin)).toBeNull();
      }
    }
  });

  test("arbitrary non-Alt consumer strings never receive a grant", () => {
    fc.assert(fc.property(fc.string(), (consumer) => {
      fc.pre(consumer !== "alt");
      const denied = consumer as SuiteConvexBrowserConsumerId;
      expect(() => suiteConvexBrowserConfiguration(denied, "production"))
        .toThrow("no Convex browser-token grant");
      expect(() => suiteConvexBrowserAuthConfig(denied, "production"))
        .toThrow("no Convex browser-token grant");
      expect(suiteConvexBrowserEnvironmentForOrigin(
        denied,
        altConfiguration.siteUrl,
      )).toBeNull();
    }), { numRuns: 200 });
  });

  test("resolves deployment only from the exact registered Alt origin", () => {
    expect(suiteConvexBrowserEnvironmentForOrigin("alt", "https://alt.dog"))
      .toBe("production");
    for (const value of [
      "http://alt.dog",
      "https://www.alt.dog",
      "https://alt.dog/",
      "https://alt.dog:443",
      "https://ALT.COOL",
      "https://alt.dog.evil.example",
      "https://alt-git-main-hraness.vercel.app",
      "http://localhost:3000",
      "https://platonik.space",
      "",
      undefined,
      null,
      0,
      {},
      ["https://alt.dog"],
    ]) {
      expect(suiteConvexBrowserEnvironmentForOrigin("alt", value)).toBeNull();
    }
  });

  test("arbitrary origin values other than the exact Alt origin resolve nothing", () => {
    const originLike = fc.tuple(
      fc.constantFrom("https://", "http://", "HTTPS://", "//", ""),
      fc.oneof(fc.domain(), fc.constant("alt.dog"), fc.constant("www.alt.dog")),
      fc.constantFrom("", "/", ":443", "/convex", "?next=/", "#fragment", "."),
    ).map(([scheme, host, suffix]) => `${scheme}${host}${suffix}`);
    fc.assert(fc.property(fc.oneof(
      fc.string(),
      originLike,
      fc.jsonValue({ maxDepth: 2 }),
    ), (value) => {
      fc.pre(value !== "https://alt.dog");
      expect(suiteConvexBrowserEnvironmentForOrigin("alt", value)).toBeNull();
    }), { numRuns: 200 });
  });

  test("builds one exact ES256 custom-JWT provider", () => {
    const authConfig = suiteConvexBrowserAuthConfig("alt", "production");
    expect(authConfig).toEqual({
      providers: [
        {
          algorithm: "ES256",
          applicationID: "https://alt.dog/convex",
          issuer: "https://alt.dog/api/convex-auth",
          jwks: "https://alt.dog/api/convex-auth/jwks",
          type: "customJwt",
        },
      ],
    });
    expect(Reflect.set(
      SUITE_CONVEX_BROWSER_CONSUMER_IDS,
      "0",
      "platonik",
    )).toBe(false);
    expect(Reflect.set(
      SUITE_CONVEX_BROWSER_CONSUMER_IDS,
      "1",
      "elders",
    )).toBe(false);
    expect(Reflect.set(
      authConfig.providers[0]!,
      "issuer",
      "https://attacker.example",
    )).toBe(false);
    expect(SUITE_CONVEX_BROWSER_CONSUMER_IDS).toEqual(["alt"]);
    const provider = authConfig.providers[0];
    expect(provider && "issuer" in provider ? provider.issuer : null).toBe(
      "https://alt.dog/api/convex-auth",
    );
  });

  test("returns an immutable exact browser-token configuration", () => {
    const configuration = suiteConvexBrowserConfiguration("alt", "production");
    expect(Object.isFrozen(configuration)).toBe(true);
    expect(Reflect.set(
      configuration,
      "jwksEndpoint",
      "https://attacker.example/jwks",
    )).toBe(false);
    expect(suiteConvexBrowserConfiguration("alt", "production").jwksEndpoint)
      .toBe("https://alt.dog/api/convex-auth/jwks");
  });
});

describe("suite Convex browser identity", () => {
  const configuration = suiteConvexBrowserConfiguration("alt", "production");
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
        issuer: "https://alt.dog/api/convex-auth",
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
      [{ ...identity, issuer: "https://platonik.space/api/convex-auth" }, "invalid-issuer"],
      [{ ...identity, suite_client_id: "hraness:platonik:production:v1" }, "invalid-client"],
      [{ ...identity, suite_client_id: "hraness:elders:production:v1" }, "invalid-client"],
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
