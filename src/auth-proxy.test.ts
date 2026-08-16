import { describe, expect, test } from "bun:test";

import {
  filteredSuiteAuthCookieHeader,
  suiteAccountsAuthServerForConfig,
} from "./auth-proxy";
import type { ReadySuiteAccountsPublicConfig } from "./public-config";

const drawMoneyConfig = {
  authBasePath: "/api/auth",
  authMode: "proxy",
  canonicalProductOrigin: "https://draw.money",
  consumer: "draw-money",
  convexSiteUrl: "https://qualified-marmot-22.convex.site",
  convexUrl: "https://qualified-marmot-22.convex.cloud",
  environment: "production",
  kind: "ready",
  siteUrl: "https://draw.money",
  surfaceOrigin: "https://draw.money",
} as const satisfies ReadySuiteAccountsPublicConfig;

const soundfishConfig = {
  ...drawMoneyConfig,
  authBasePath: "/api/suite-auth",
  authMode: "oidc-rp",
  canonicalProductOrigin: "https://sound.fish",
  consumer: "soundfish",
  siteUrl: "https://sound.fish",
  surfaceOrigin: "https://sound.fish",
} as const satisfies ReadySuiteAccountsPublicConfig;

type FetchCall = Readonly<{
  init: RequestInit | undefined;
  input: RequestInfo | URL;
}>;

function recordingFetch(response: Response): {
  calls: FetchCall[];
  fetch: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>;
} {
  const calls: FetchCall[] = [];
  return {
    calls,
    fetch: (input, init) => {
      calls.push({ init, input });
      return Promise.resolve(response);
    },
  };
}

function responseWithCookies(cookies: readonly string[]): Response {
  const headers = new Headers({ "content-type": "application/json" });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response('{"ok":true}', { headers });
}

function setCookies(response: Response): readonly string[] {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  return headers.getSetCookie?.() ?? [];
}

describe("suite Accounts same-origin auth proxy", () => {
  test("returns a stable no-store unavailable envelope", async () => {
    const response = await suiteAccountsAuthServerForConfig({
      kind: "missing",
      missing: ["NEXT_PUBLIC_SITE_URL"],
    }).handler.GET(new Request("https://draw.money/api/auth/get-session"));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: {
        code: "SERVICE_NOT_CONFIGURED",
        message: "Suite Accounts authentication is not configured.",
        retryable: false,
      },
      schemaVersion: 1,
    });
  });

  test("does not expose the Better Auth proxy to an OAuth RP consumer", async () => {
    const upstream = recordingFetch(Response.json({ ok: true }));
    const response = await suiteAccountsAuthServerForConfig(
      soundfishConfig,
      upstream.fetch,
    ).handler.POST(new Request("https://sound.fish/api/suite-auth/start", {
      headers: { origin: "https://sound.fish" },
      method: "POST",
    }));
    expect(response.status).toBe(503);
    expect(upstream.calls).toHaveLength(0);
  });

  test("rejects wrong origins, paths, and cross-site signals before fetching", async () => {
    const upstream = recordingFetch(new Response());
    const server = suiteAccountsAuthServerForConfig(drawMoneyConfig, upstream.fetch);
    const responses = await Promise.all([
      server.handler.GET(new Request(
        "https://attacker.example/api/auth/get-session",
      )),
      server.handler.GET(new Request("https://draw.money/api/other")),
      server.handler.POST(new Request("https://draw.money/api/auth/sign-out", {
        method: "POST",
      })),
      server.handler.POST(new Request("https://draw.money/api/auth/sign-out", {
        headers: { origin: "https://attacker.example" },
        method: "POST",
      })),
      server.handler.GET(new Request(
        "https://draw.money/api/auth/get-session",
        { headers: { "sec-fetch-site": "cross-site" } },
      )),
    ]);
    expect(responses.map(response => response.status)).toEqual([
      403, 403, 403, 403, 403,
    ]);
    expect(upstream.calls).toHaveLength(0);
  });

  test("preserves only exact enabled cookies with strict attributes", async () => {
    const valid = [
      "__Host-cclrte.session_token=one; Secure; HttpOnly; Path=/; SameSite=Lax",
      "__Host-cclrte.session_data.0=two; Max-Age=300; Path=/; HttpOnly; Secure; SameSite=Lax",
    ] as const;
    const upstream = recordingFetch(responseWithCookies([
      ...valid,
      "analytics=drop; Path=/",
      "__Host-cclrte.convex_jwt=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax",
    ]));
    const response = await suiteAccountsAuthServerForConfig(
      drawMoneyConfig,
      upstream.fetch,
    ).handler.GET(new Request("https://draw.money/api/auth/get-session"));
    expect(response.status).toBe(200);
    expect(setCookies(response)).toEqual(valid);
    expect(response.headers.get("cache-control")).toBe("no-store");

    for (const unsafe of [
      "__Host-cclrte.session_token=one; HttpOnly; Path=/; SameSite=Lax",
      "__Host-cclrte.session_token=one; Secure; Path=/; SameSite=Lax",
      "__Host-cclrte.session_token=one; Secure; HttpOnly; Path=/account; SameSite=Lax",
      "__Host-cclrte.session_token=one; Secure; HttpOnly; Path=/; SameSite=None",
      "__Host-cclrte.session_token=one; Secure; HttpOnly; Path=/; SameSite=Lax; Domain=draw.money",
      "__Host-cclrte.session_token=one; Secure; Secure; HttpOnly; Path=/; SameSite=Lax",
      "__Host-cclrte.convex_jwt=one; Secure; HttpOnly; Path=/; SameSite=Lax",
      "__Host-cclrte.convex_jwt=; Max-Age=1; Secure; HttpOnly; Path=/; SameSite=Lax",
    ]) {
      const hostile = recordingFetch(responseWithCookies([unsafe]));
      const rejected = await suiteAccountsAuthServerForConfig(
        drawMoneyConfig,
        hostile.fetch,
      ).handler.GET(
        new Request("https://draw.money/api/auth/get-session"),
      );
      expect(rejected.status).toBe(502);
      expect(setCookies(rejected)).toEqual([]);
    }
  });

  test("accepts only relative or exact same-origin redirects", async () => {
    for (const location of ["/account", "https://draw.money/account"]) {
      const upstream = recordingFetch(new Response(null, {
        headers: { location },
        status: 302,
      }));
      const response = await suiteAccountsAuthServerForConfig(
        drawMoneyConfig,
        upstream.fetch,
      ).handler.GET(new Request("https://draw.money/api/auth/callback"));
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(location);
    }
    for (const location of [
      "//attacker.example/account",
      "https://account.hraness.com/account",
      "https://person:secret@draw.money/account",
    ]) {
      const upstream = recordingFetch(new Response(null, {
        headers: { location },
        status: 302,
      }));
      const response = await suiteAccountsAuthServerForConfig(
        drawMoneyConfig,
        upstream.fetch,
      ).handler.GET(new Request("https://draw.money/api/auth/callback"));
      expect(response.status).toBe(502);
      expect(response.headers.get("location")).toBeNull();
    }
  });

  test("uses local non-Secure cookies and rejects oversized requests", async () => {
    const local = {
      ...drawMoneyConfig,
      canonicalProductOrigin: "http://localhost:3000",
      convexSiteUrl: "http://localhost:3211",
      convexUrl: "http://localhost:3210",
      environment: "local",
      siteUrl: "http://localhost:3000",
      surfaceOrigin: "http://localhost:3000",
    } as const satisfies ReadySuiteAccountsPublicConfig;
    const upstream = recordingFetch(responseWithCookies([
      "cclrte-local.session_token=one; HttpOnly; Path=/; SameSite=Lax",
    ]));
    const response = await suiteAccountsAuthServerForConfig(
      local,
      upstream.fetch,
    ).handler.POST(new Request(
      "http://localhost:3000/api/auth/sign-in/email-otp",
      {
        headers: {
          cookie: [
            "cclrte-local.session_token=old",
            "__Host-cclrte.session_token=remote",
          ].join("; "),
          origin: "http://localhost:3000",
        },
        method: "POST",
      },
    ));
    expect(response.status).toBe(200);
    expect(setCookies(response)).toEqual([
      "cclrte-local.session_token=one; HttpOnly; Path=/; SameSite=Lax",
    ]);
    expect(
      new Headers(upstream.calls[0]?.init?.headers).get("cookie"),
    ).toBe("cclrte-local.session_token=old");

    const oversized = await suiteAccountsAuthServerForConfig(
      local,
      upstream.fetch,
    ).handler.POST(new Request(
      "http://localhost:3000/api/auth/sign-in/email-otp",
      {
        headers: {
          "content-length": "1048577",
          origin: "http://localhost:3000",
        },
        method: "POST",
      },
    ));
    expect(oversized.status).toBe(413);
  });

  test("cancels a chunked request as soon as its body exceeds the limit", async () => {
    const upstream = recordingFetch(Response.json({ ok: true }));
    let canceled = false;
    let pulls = 0;
    const body = new ReadableStream<Uint8Array>({
      cancel: () => {
        canceled = true;
      },
      pull: (controller) => {
        pulls += 1;
        controller.enqueue(new Uint8Array(600_000));
        if (pulls === 3) controller.close();
      },
    });
    const response = await suiteAccountsAuthServerForConfig(
      drawMoneyConfig,
      upstream.fetch,
    ).handler.POST(new Request(
      "https://draw.money/api/auth/sign-in/email-otp",
      {
        body,
        headers: {
          "content-type": "application/json",
          origin: "https://draw.money",
        },
        method: "POST",
      },
    ));

    expect(response.status).toBe(413);
    expect(canceled).toBe(true);
    expect(upstream.calls).toHaveLength(0);
  });

  test("filters malformed values and all ambient cookie authority", () => {
    expect(filteredSuiteAuthCookieHeader([
      "theme=dark",
      "__Host-cclrte.session_token=valid",
      "__Host-cclrte.session_data.100=too-many",
      "__Host-cclrte.session_data.01=non-canonical",
      "__Host-cclrte.unknown=drop",
    ].join("; "), drawMoneyConfig)).toBe("__Host-cclrte.session_token=valid");
  });
});
