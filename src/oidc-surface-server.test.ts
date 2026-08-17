import { describe, expect, test } from "bun:test";

import { parseSuiteAccountId, parseSuiteUsername } from "./identity";

import {
  createSurfaceSuiteRelyingParty,
  suiteEnvironmentForConsumerOrigin,
  suiteOidcSurfaceHandler,
  suiteOidcSurfaceServerAccountSession,
  suiteOidcSurfaceServerSession,
  suiteOidcSurfaceServerVerifiedEmail,
} from "./oidc-surface-server";

const configured = {
  NEXT_PUBLIC_SITE_URL: "https://oprte.com",
  SUITE_IDENTITY_RECEIPT_KEY_VERSION: "test-v1",
  SUITE_OIDC_COOKIE_SECRET: "0123456789abcdef0123456789abcdef",
} as const;

describe("shared Suite OIDC surface server", () => {
  test("binds only an exact registered environment origin", () => {
    expect(suiteEnvironmentForConsumerOrigin("oprte", "https://oprte.com"))
      .toBe("production");
    expect(suiteEnvironmentForConsumerOrigin("hra", "https://hra.sh"))
      .toBe("production");
    expect(suiteEnvironmentForConsumerOrigin(
      "oprte",
      "https://preview.oprte.com",
    )).toBeNull();
    expect(suiteEnvironmentForConsumerOrigin("oprte", "https://oprte.com.evil"))
      .toBeNull();
    expect(suiteEnvironmentForConsumerOrigin(
      "act60",
      "https://preview.act60.me",
    )).toBeNull();
    expect(suiteEnvironmentForConsumerOrigin(
      "sponge",
      "https://sponge.computer",
    )).toBe("production");
    expect(suiteEnvironmentForConsumerOrigin(
      "sponge",
      "https://spongesearch.com",
    )).toBeNull();
    expect(suiteEnvironmentForConsumerOrigin("oprte", undefined)).toBeNull();
  });

  test("creates a public client only from complete checked configuration", () => {
    expect(createSurfaceSuiteRelyingParty("oprte", configured)?.configuration)
      .toMatchObject({
        callbackUrl: "https://oprte.com/api/suite-auth/callback",
        clientId: "hraness:oprte:production:v1",
        siteUrl: "https://oprte.com",
      });
    expect(createSurfaceSuiteRelyingParty("hra", {
      ...configured,
      NEXT_PUBLIC_SITE_URL: "https://hra.sh",
    })?.configuration).toMatchObject({
      callbackUrl: "https://hra.sh/api/suite-auth/callback",
      clientId: "hraness:hra:production:v1",
      siteUrl: "https://hra.sh",
    });
    expect(createSurfaceSuiteRelyingParty("oprte", {
      ...configured,
      NEXT_PUBLIC_SITE_URL: "https://oprte.com.evil",
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
      "oprte",
      new Request("https://evil.example/api/private"),
      configured,
    );
    expect(session).toBeNull();
    expect(await suiteOidcSurfaceServerAccountSession(
      "oprte",
      new Request("https://evil.example/join"),
      configured,
    )).toBeNull();
    expect(await suiteOidcSurfaceServerVerifiedEmail(
      "oprte",
      new Request("https://evil.example/join"),
      configured,
    )).toBeNull();
  });

  test("preserves the verified email's Suite account binding", async () => {
    const parsedAccountId = parseSuiteAccountId(
      "acct_018f1f7a7a367ccdbd5d706d4dc5c018",
    );
    const parsedUsername = parseSuiteUsername("reader");
    if (!parsedAccountId.ok || !parsedUsername.ok) {
      throw new Error("Expected valid Suite identity values.");
    }
    const request = new Request("https://oprte.com/private-profile");

    const verifiedEmail = await suiteOidcSurfaceServerVerifiedEmail(
      "oprte",
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
