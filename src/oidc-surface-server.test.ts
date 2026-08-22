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
  NEXT_PUBLIC_SITE_URL: "https://hra.sh",
  SUITE_IDENTITY_RECEIPT_KEY_VERSION: "test-v1",
  SUITE_OIDC_COOKIE_SECRET: "0123456789abcdef0123456789abcdef",
} as const;

describe("shared Suite OIDC surface server", () => {
  test("binds only an exact registered environment origin", () => {
    expect(suiteEnvironmentForConsumerOrigin("hra", "https://hra.sh"))
      .toBe("production");
    expect(suiteEnvironmentForConsumerOrigin(
      "subcounter",
      "https://subcounter.com",
    )).toBe("production");
    expect(suiteEnvironmentForConsumerOrigin(
      "subcounter",
      "https://subcounter-git-main.vercel.app",
    )).toBeNull();
    expect(suiteEnvironmentForConsumerOrigin(
      "subcounter",
      "https://subcounter.com.evil.example",
    )).toBeNull();
    expect(suiteEnvironmentForConsumerOrigin(
      "slackorgs",
      "https://slackorgs.com",
    )).toBe("production");
    expect(suiteEnvironmentForConsumerOrigin(
      "slackorgs",
      "https://slackorgs-git-main.vercel.app",
    )).toBeNull();
    expect(suiteEnvironmentForConsumerOrigin(
      "slackorgs",
      "https://slackorgs.com.evil.example",
    )).toBeNull();
    expect(suiteEnvironmentForConsumerOrigin(
      "act60",
      "https://preview.act60.me",
    )).toBeNull();
    expect(suiteEnvironmentForConsumerOrigin(
      "sponge",
      "https://spongeresearch.com",
    )).toBe("production");
    expect(suiteEnvironmentForConsumerOrigin(
      "sponge",
      "https://sponge.computer",
    )).toBeNull();
    expect(suiteEnvironmentForConsumerOrigin(
      "sponge",
      "https://spongesearch.com",
    )).toBeNull();
    expect(suiteEnvironmentForConsumerOrigin("hra", undefined)).toBeNull();
  });

  test("creates a public client only from complete checked configuration", () => {
    expect(createSurfaceSuiteRelyingParty("hra", {
      ...configured,
      NEXT_PUBLIC_SITE_URL: "https://hra.sh",
    })?.configuration).toMatchObject({
      callbackUrl: "https://hra.sh/api/suite-auth/callback",
      clientId: "hraness:hra:production:v1",
      siteUrl: "https://hra.sh",
    });
    expect(createSurfaceSuiteRelyingParty("subcounter", {
      NEXT_PUBLIC_SITE_URL: "https://subcounter.com",
      SUITE_OIDC_COOKIE_SECRET: configured.SUITE_OIDC_COOKIE_SECRET,
    })?.configuration).toMatchObject({
      callbackUrl: "https://subcounter.com/api/suite-auth/callback",
      clientId: "hraness:subcounter:production:v1",
      siteUrl: "https://subcounter.com",
    });
    expect(createSurfaceSuiteRelyingParty("subcounter", {
      NEXT_PUBLIC_SITE_URL: "https://subcounter.com",
      NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN:
        "https://subcounter-git-main.vercel.app",
      SUITE_OIDC_COOKIE_SECRET: configured.SUITE_OIDC_COOKIE_SECRET,
    })).toBeNull();
    expect(createSurfaceSuiteRelyingParty("subcounter", {
      NEXT_PUBLIC_SITE_URL: "https://foreign.example",
      SUITE_OIDC_COOKIE_SECRET: configured.SUITE_OIDC_COOKIE_SECRET,
    })).toBeNull();
    expect(createSurfaceSuiteRelyingParty("slackorgs", {
      NEXT_PUBLIC_SITE_URL: "https://slackorgs.com",
      SUITE_OIDC_COOKIE_SECRET: configured.SUITE_OIDC_COOKIE_SECRET,
    })?.configuration).toMatchObject({
      callbackUrl: "https://slackorgs.com/api/suite-auth/callback",
      clientId: "hraness:slackorgs:production:v1",
      siteUrl: "https://slackorgs.com",
    });
    expect(createSurfaceSuiteRelyingParty("slackorgs", {
      NEXT_PUBLIC_SITE_URL: "https://slackorgs.com",
      NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN:
        "https://slackorgs-git-main.vercel.app",
      SUITE_OIDC_COOKIE_SECRET: configured.SUITE_OIDC_COOKIE_SECRET,
    })).toBeNull();
    expect(createSurfaceSuiteRelyingParty("slackorgs", {
      NEXT_PUBLIC_SITE_URL: "https://foreign.example",
      SUITE_OIDC_COOKIE_SECRET: configured.SUITE_OIDC_COOKIE_SECRET,
    })).toBeNull();
    expect(createSurfaceSuiteRelyingParty("hra", {
      ...configured,
      NEXT_PUBLIC_SITE_URL: "https://hra.sh.evil",
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
      "hra",
      new Request("https://evil.example/api/private"),
      configured,
    );
    expect(session).toBeNull();
    expect(await suiteOidcSurfaceServerAccountSession(
      "hra",
      new Request("https://evil.example/join"),
      configured,
    )).toBeNull();
    expect(await suiteOidcSurfaceServerVerifiedEmail(
      "hra",
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
    const request = new Request("https://hra.sh/private-profile");

    const verifiedEmail = await suiteOidcSurfaceServerVerifiedEmail(
      "hra",
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
