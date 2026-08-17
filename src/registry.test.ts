import { describe, expect, expectTypeOf, test } from "bun:test";

import {
  SUITE_ACCOUNTS_CONSUMERS,
  SUITE_ACCOUNTS_CURRENT_CONSUMERS,
  SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS,
  SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS,
  SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS,
  SUITE_ACCOUNTS_DEPLOYMENTS,
  SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS,
  SUITE_CONSUMER_IDS,
  SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS,
  getSuiteAccountsCurrentConsumer,
  getSuiteAccountsCurrentConsumerEnvironment,
  getSuiteAccountsConsumerEnvironment,
  isSuiteAccountsCurrentConsumerId,
  isSuiteAccountsCurrentOAuthConsumerId,
  isSuiteAccountsCurrentOidcConsumerId,
  isSuiteAccountsOAuthConsumerId,
  isSuiteAccountsOidcConsumerId,
  suiteAccountsCurrentConsumerRequiresEmailOtp,
  suiteAccountsConsumerRequiresEmailOtp,
  type SuiteAccountsCurrentOAuthConsumerId,
  type SuiteAccountsCurrentOidcConsumerId,
  type SuiteAccountsRemoteEnvironment,
  type SuiteAccountsOAuthConsumerId,
  type SuiteAccountsOidcConsumerId,
} from "./registry";

describe("suite Accounts auth-mode registry", () => {
  test("assigns one explicit auth transport to every consumer", () => {
    expect(Object.keys(SUITE_ACCOUNTS_CONSUMERS).sort()).toEqual(
      [...SUITE_CONSUMER_IDS].sort(),
    );
    expect(SUITE_ACCOUNTS_CONSUMERS.accounts.auth).toMatchObject({
      basePath: "/api/auth",
      kind: "authority",
    });
    expect(SUITE_ACCOUNTS_CONSUMERS["draw-money"].auth).toMatchObject({
      basePath: "/api/auth",
      kind: "proxy",
    });
    expect(SUITE_ACCOUNTS_CONSUMERS["draw-money"].environments).toEqual({
      production: {
        billingReturn: { kind: "unsupported" },
        siteUrl: "https://draw.money",
      },
    });
    const oidcConsumers = SUITE_CONSUMER_IDS.filter(
      isSuiteAccountsOidcConsumerId,
    );
    expect(oidcConsumers).toHaveLength(6);
    for (const consumer of oidcConsumers) {
      expect(SUITE_ACCOUNTS_CONSUMERS[consumer].auth).toEqual({
        basePath: "/api/suite-auth",
        kind: "oidc-rp",
      });
      expect(isSuiteAccountsOidcConsumerId(consumer)).toBe(true);
    }
  });

  test("keeps frozen v1 bytes while evolving a distinct current authority", () => {
    expect(SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS).toEqual([
      "accounts",
      "act60",
      "elders",
      "soundfish",
      "oh-computer",
      "oprte",
      "sponge",
    ]);
    expect(SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS).toEqual([
      "accounts",
      "act60",
      "elders",
      "soundfish",
      "oh-computer",
      "oprte",
      "hra",
      "sponge",
    ]);
    expect(SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS)
      .not.toBe(SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS);
    expect(getSuiteAccountsCurrentConsumerEnvironment(
      "draw-money",
      "production",
    )).toBeNull();
    expect(getSuiteAccountsConsumerEnvironment(
      "draw-money",
      "production",
    )).toEqual({
      billingReturn: { kind: "unsupported" },
      siteUrl: "https://draw.money",
    });
  });

  test("registers HRA alongside the bounded OPRTE rollback client", () => {
    expect(SUITE_ACCOUNTS_CURRENT_CONSUMERS.hra).toEqual({
      auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
      displayName: "HRA",
      environments: {
        production: {
          billingReturn: { kind: "unsupported" },
          siteUrl: "https://hra.sh",
        },
      },
      id: "hra",
    });
    expect(getSuiteAccountsCurrentConsumer("oprte"))
      .toBe(SUITE_ACCOUNTS_CONSUMERS.oprte);
    expect(getSuiteAccountsCurrentConsumerEnvironment(
      "hra",
      "production",
    )).toEqual({
      billingReturn: { kind: "unsupported" },
      siteUrl: "https://hra.sh",
    });
    expect(isSuiteAccountsCurrentConsumerId("hra")).toBe(true);
    expect(isSuiteAccountsCurrentConsumerId("draw-money")).toBe(false);
    expect(isSuiteAccountsCurrentOidcConsumerId("hra")).toBe(true);
    expect(isSuiteAccountsCurrentOAuthConsumerId("hra")).toBe(true);
    expectTypeOf<SuiteAccountsCurrentOidcConsumerId>().toEqualTypeOf<
      | "act60"
      | "elders"
      | "soundfish"
      | "oh-computer"
      | "oprte"
      | "hra"
      | "sponge"
    >();
    expectTypeOf<SuiteAccountsCurrentOAuthConsumerId>().toEqualTypeOf<
      SuiteAccountsCurrentOidcConsumerId
    >();
  });

  test("keeps current OTP and linked-product policies explicit", () => {
    expect(SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS)
      .toEqual([
        "act60",
        "elders",
        "soundfish",
        "oh-computer",
        "oprte",
        "hra",
        "sponge",
      ]);
    expect(SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS).toEqual([
      "soundfish",
      "oprte",
      "hra",
    ]);
    expect(suiteAccountsCurrentConsumerRequiresEmailOtp("hra")).toBe(true);
    expect(SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS).not.toContain("hra");
  });

  test("does not expose proxy cookie capabilities on OAuth registrations", () => {
    const oauthConsumers = SUITE_CONSUMER_IDS.filter(
      isSuiteAccountsOAuthConsumerId,
    );
    expect(oauthConsumers).toHaveLength(6);
    for (const consumer of oauthConsumers) {
      expect("cookies" in SUITE_ACCOUNTS_CONSUMERS[consumer].auth).toBe(false);
      expect(isSuiteAccountsOAuthConsumerId(consumer)).toBe(true);
    }
    expect("cookies" in SUITE_ACCOUNTS_CONSUMERS["draw-money"].auth).toBe(true);
    expect(isSuiteAccountsOidcConsumerId("draw-money")).toBe(false);
    expect(isSuiteAccountsOidcConsumerId("accounts")).toBe(false);
    expectTypeOf<SuiteAccountsOidcConsumerId>().toEqualTypeOf<
      | "act60"
      | "elders"
      | "soundfish"
      | "oh-computer"
      | "oprte"
      | "sponge"
    >();
    expectTypeOf<SuiteAccountsOAuthConsumerId>().toEqualTypeOf<
      SuiteAccountsOidcConsumerId
    >();
  });

  test("registers every remote consumer only in production", () => {
    expectTypeOf<SuiteAccountsRemoteEnvironment>()
      .toEqualTypeOf<"production">();
    expect(SUITE_ACCOUNTS_CONSUMERS.act60).toEqual({
      auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
      displayName: "ACT60",
      environments: {
        production: {
          billingReturn: { kind: "unsupported" },
          siteUrl: "https://act60.me",
        },
      },
      id: "act60",
    });
    expect(getSuiteAccountsConsumerEnvironment("act60", "production"))
      .toMatchObject({ siteUrl: "https://act60.me" });
    for (const consumer of SUITE_CONSUMER_IDS) {
      expect(getSuiteAccountsConsumerEnvironment(consumer, "production"))
        .not.toBeNull();
    }
    expect(SUITE_ACCOUNTS_CONSUMERS.sponge).toEqual({
      auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
      displayName: "Sponge",
      environments: {
        production: {
          billingReturn: { kind: "unsupported" },
          siteUrl: "https://spongesearch.com",
        },
      },
      id: "sponge",
    });
    expect(getSuiteAccountsCurrentConsumerEnvironment(
      "sponge",
      "production",
    )).toEqual({
      billingReturn: { kind: "unsupported" },
      siteUrl: "https://sponge.computer",
    });
    expect(getSuiteAccountsConsumerEnvironment("sponge", "production"))
      .toMatchObject({ siteUrl: "https://spongesearch.com" });
    expect("rsrch" in SUITE_ACCOUNTS_CONSUMERS).toBe(false);
    expect(suiteAccountsConsumerRequiresEmailOtp("sponge")).toBe(true);
  });

  test("registers Elders as one exact browser RP", () => {
    expect(SUITE_ACCOUNTS_CONSUMERS["elders"]).toEqual({
      auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
      displayName: "Elders",
      environments: {
        production: {
          billingReturn: { kind: "unsupported" },
          siteUrl: "https://elders.hraness.com",
        },
      },
      id: "elders",
    });
    expect(suiteAccountsConsumerRequiresEmailOtp("elders")).toBe(true);
    expect("ask-town" in SUITE_ACCOUNTS_CONSUMERS).toBe(false);
    expect(suiteAccountsConsumerRequiresEmailOtp("soundfish")).toBe(true);
    expect(new Set<string>(SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS)).toEqual(
      new Set(Object.values(SUITE_ACCOUNTS_CONSUMERS)
        .filter(consumer => consumer.auth.kind === "oidc-rp")
        .map(consumer => consumer.id)),
    );
  });

  test("keeps the exact frozen v1 OPRTE identity", () => {
    expect(SUITE_ACCOUNTS_CONSUMERS.oprte).toEqual({
      auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
      displayName: "OPRTE",
      environments: {
        production: {
          billingReturn: { kind: "unsupported" },
          siteUrl: "https://oprte.com",
        },
      },
      id: "oprte",
    });
    expect("kitchen" in SUITE_ACCOUNTS_CONSUMERS).toBe(false);
  });

  test("registers only the canonical Soundfish client", () => {
    expect(SUITE_ACCOUNTS_CONSUMERS.soundfish).toEqual({
      auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
      displayName: "Soundfish",
      environments: {
        production: {
          billingReturn: { kind: "unsupported" },
          siteUrl: "https://sound.fish",
        },
      },
      id: "soundfish",
    });
    expect("loops" in SUITE_ACCOUNTS_CONSUMERS).toBe(false);
  });

  test("does not register retired Transmute-family clients", () => {
    for (const retired of ["transmute", "transmute-cli", "studio", "graphics"]) {
      expect(retired in SUITE_ACCOUNTS_CONSUMERS).toBe(false);
    }
  });

  test("keeps authority origins, cookies, and OTP policy runtime immutable", () => {
    expect(Reflect.set(
      SUITE_ACCOUNTS_DEPLOYMENTS.production,
      "accountsOrigin",
      "https://attacker.example",
    )).toBe(false);
    expect(Reflect.set(
      SUITE_ACCOUNTS_CONSUMERS.oprte.environments.production,
      "siteUrl",
      "https://attacker.example",
    )).toBe(false);
    expect(Reflect.set(
      SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS,
      "0",
      "accounts",
    )).toBe(false);
    expect(Reflect.set(
      SUITE_ACCOUNTS_CURRENT_CONSUMERS.hra.environments.production,
      "siteUrl",
      "https://attacker.example",
    )).toBe(false);
    expect(Reflect.set(
      SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS,
      "0",
      "accounts",
    )).toBe(false);
    const authority = SUITE_ACCOUNTS_CONSUMERS.accounts.auth;
    if (authority.kind !== "authority") throw new Error("Missing authority.");
    expect(Reflect.set(authority.cookies.names, "0", "foreign_cookie"))
      .toBe(false);
    expect(SUITE_ACCOUNTS_DEPLOYMENTS.production.accountsOrigin).toBe(
      "https://account.hraness.com",
    );
    expect(SUITE_ACCOUNTS_CONSUMERS.oprte.environments.production.siteUrl)
      .toBe("https://oprte.com");
    expect(SUITE_ACCOUNTS_CURRENT_CONSUMERS.hra.environments.production.siteUrl)
      .toBe("https://hra.sh");
    expect(suiteAccountsConsumerRequiresEmailOtp("act60")).toBe(true);
    expect(authority.cookies.names[0]).toBe("account_data");
  });
});
