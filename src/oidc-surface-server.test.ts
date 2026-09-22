import { describe, expect, test } from "bun:test";

import { parseSuiteAccountId, parseSuiteUsername } from "./identity";

import {
  createSurfaceSuiteRelyingParty,
  suiteEnvironmentForConsumerOrigin,
  suiteOidcSurfaceHandler,
  suiteOidcSurfaceServerAccountSession,
  suiteOidcSurfaceServerVerifiedAccountEmail,
  suiteOidcSurfaceServerSession,
  suiteOidcSurfaceServerVerifiedEmail,
} from "./oidc-surface-server";
import type { SuiteAccountsCurrentOidcConsumerId } from "./registry";

const configured = {
  NEXT_PUBLIC_SITE_URL: "https://sound.fish",
  SUITE_IDENTITY_RECEIPT_KEY_VERSION: "test-v1",
  SUITE_OIDC_COOKIE_SECRET: "0123456789abcdef0123456789abcdef",
} as const;

describe("shared Suite OIDC surface server", () => {
  test("binds only an exact registered environment origin", () => {
    expect(suiteEnvironmentForConsumerOrigin("soundfish", "https://sound.fish"))
      .toBe("production");
    expect(suiteEnvironmentForConsumerOrigin(
      "subcounter" as SuiteAccountsCurrentOidcConsumerId,
      "https://subcounter.com",
    )).toBeNull();
    expect(suiteEnvironmentForConsumerOrigin(
      "subcounter" as SuiteAccountsCurrentOidcConsumerId,
      "https://subcounter-git-main.vercel.app",
    )).toBeNull();
    expect(suiteEnvironmentForConsumerOrigin(
      "subcounter" as SuiteAccountsCurrentOidcConsumerId,
      "https://subcounter.com.evil.example",
    )).toBeNull();
    expect(suiteEnvironmentForConsumerOrigin(
      "act60",
      "https://preview.act60.me",
    )).toBeNull();
    expect(suiteEnvironmentForConsumerOrigin(
      "sponge",
      "https://spongeresearch.com",
    )).toBeNull();
    expect(suiteEnvironmentForConsumerOrigin(
      "sponge",
      "https://sponge.computer",
    )).toBe("production");
    expect(suiteEnvironmentForConsumerOrigin(
      "sponge",
      "https://spongesearch.com",
    )).toBeNull();
    expect(suiteEnvironmentForConsumerOrigin("soundfish", undefined)).toBeNull();
  });

  test("creates a public client only from complete checked configuration", () => {
    expect(createSurfaceSuiteRelyingParty("soundfish", {
      ...configured,
      NEXT_PUBLIC_SITE_URL: "https://sound.fish",
    })?.configuration).toMatchObject({
      callbackUrl: "https://sound.fish/api/suite-auth/callback",
      clientId: "hraness:soundfish:production:v1",
      siteUrl: "https://sound.fish",
    });
    expect(createSurfaceSuiteRelyingParty("subcounter" as SuiteAccountsCurrentOidcConsumerId, {
      NEXT_PUBLIC_SITE_URL: "https://subcounter.com",
      SUITE_OIDC_COOKIE_SECRET: configured.SUITE_OIDC_COOKIE_SECRET,
    })).toBeNull();
    expect(createSurfaceSuiteRelyingParty("subcounter" as SuiteAccountsCurrentOidcConsumerId, {
      NEXT_PUBLIC_SITE_URL: "https://subcounter.com",
      NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN:
        "https://subcounter-git-main.vercel.app",
      SUITE_OIDC_COOKIE_SECRET: configured.SUITE_OIDC_COOKIE_SECRET,
    })).toBeNull();
    expect(createSurfaceSuiteRelyingParty("subcounter" as SuiteAccountsCurrentOidcConsumerId, {
      NEXT_PUBLIC_SITE_URL: "https://foreign.example",
      SUITE_OIDC_COOKIE_SECRET: configured.SUITE_OIDC_COOKIE_SECRET,
    })).toBeNull();
    expect(createSurfaceSuiteRelyingParty("soundfish", {
      ...configured,
      NEXT_PUBLIC_SITE_URL: "https://sound.fish.evil",
    })).toBeNull();
    expect(createSurfaceSuiteRelyingParty("act60", {
      NEXT_PUBLIC_SITE_URL: "https://act60.me",
      SUITE_OIDC_COOKIE_SECRET: configured.SUITE_OIDC_COOKIE_SECRET,
    })).not.toBeNull();
    expect(createSurfaceSuiteRelyingParty("soundfish", {
      NEXT_PUBLIC_SITE_URL: "https://example.com",
      SUITE_OIDC_COOKIE_SECRET: configured.SUITE_OIDC_COOKIE_SECRET,
    })).toBeNull();
    expect(createSurfaceSuiteRelyingParty("act60", {
      NEXT_PUBLIC_SITE_URL: "https://preview.act60.me",
      SUITE_OIDC_COOKIE_SECRET: configured.SUITE_OIDC_COOKIE_SECRET,
    })).toBeNull();
  });

  test("does not expose a server session from a foreign origin", async () => {
    const session = await suiteOidcSurfaceServerSession(
      "soundfish",
      new Request("https://evil.example/api/private"),
      configured,
    );
    expect(session).toBeNull();
    expect(await suiteOidcSurfaceServerAccountSession(
      "soundfish",
      new Request("https://evil.example/join"),
      configured,
    )).toBeNull();
    expect(await suiteOidcSurfaceServerVerifiedAccountEmail(
      "soundfish",
      new Request("https://evil.example/join"),
      configured,
    )).toBeNull();
    expect(await suiteOidcSurfaceServerVerifiedEmail(
      "soundfish",
      new Request("https://evil.example/join"),
      configured,
    )).toBeNull();
  });

  test("preserves each verified email's Suite account binding", async () => {
    const parsedAccountId = parseSuiteAccountId(
      "acct_018f1f7a7a367ccdbd5d706d4dc5c018",
    );
    const parsedUsername = parseSuiteUsername("reader");
    if (!parsedAccountId.ok || !parsedUsername.ok) {
      throw new Error("Expected valid Suite identity values.");
    }
    const request = new Request("https://sound.fish/private-profile");

    const accountVerifiedEmail =
      await suiteOidcSurfaceServerVerifiedAccountEmail(
        "soundfish",
        request,
        configured,
        {
          createRelyingParty: (incomingRequest) => {
            expect(incomingRequest).toBe(request);
            return {
              serverVerifiedAccountEmail: (serverRequest) => {
                expect(serverRequest).toBe(request);
                return Promise.resolve({
                  accessTokenExpiresAtMs: 2_000,
                  email: "reader@example.com",
                  suiteAccountId: parsedAccountId.value,
                });
              },
            };
          },
        },
      );
    expect(accountVerifiedEmail).toEqual({
      accessTokenExpiresAtMs: 2_000,
      email: "reader@example.com",
      suiteAccountId: parsedAccountId.value,
    });

    const verifiedEmail = await suiteOidcSurfaceServerVerifiedEmail(
      "soundfish",
      request,
      configured,
      {
        createRelyingParty: (incomingRequest) => {
          expect(incomingRequest).toBe(request);
          return {
            serverVerifiedEmail: (serverRequest) => {
              expect(serverRequest).toBe(request);
              return Promise.resolve({
                accessTokenExpiresAtMs: 2_000,
                email: "reader@example.com",
                suiteAccountId: parsedAccountId.value,
                username: parsedUsername.value,
              });
            },
          };
        },
      },
    );

    expect(verifiedEmail).toEqual({
      accessTokenExpiresAtMs: 2_000,
      email: "reader@example.com",
      suiteAccountId: parsedAccountId.value,
      username: parsedUsername.value,
    });
  });

  test("passes the exact canonical request to the relying party", async () => {
    let receivedUrl = "";
    const handler = suiteOidcSurfaceHandler("soundfish", {
      createRelyingParty: (request) => {
        receivedUrl = request.url;
        return {
          handle: () => Promise.resolve(Response.json({ consumer: "soundfish" })),
        };
      },
    });

    const response = await handler(
      new Request("https://sound.fish/api/suite-auth/session"),
    );
    expect(receivedUrl).toBe("https://sound.fish/api/suite-auth/session");
    expect(await response.json()).toEqual({ consumer: "soundfish" });
  });
});
