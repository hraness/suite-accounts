import { describe, expect, test } from "bun:test";

import {
  createSuiteConvexBrowserTokenLoader,
  type SuiteConvexBrowserTokenLoaderDependencies,
} from "./convex-browser-auth-browser";

const nowMs = 1_800_000_300_000;
const token = `${"a".repeat(32)}.${"b".repeat(32)}.${"c".repeat(64)}`;

function jsonResponse(value: unknown, status = 200): Response {
  const body = JSON.stringify(value);
  return new Response(body, {
    headers: {
      "cache-control": "no-store",
      "content-length": String(new TextEncoder().encode(body).byteLength),
      "content-type": "application/json; charset=utf-8",
      pragma: "no-cache",
    },
    status,
  });
}

function tokenResponse(expiresAtMs = nowMs + 5 * 60_000): Response {
  return jsonResponse({
    expiresAtMs,
    kind: "token",
    token,
    version: "suite-convex-browser-token-response-v1",
  });
}

function requestPath(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  return input instanceof URL ? input.href : input.url;
}

describe("suite Convex browser token loader", () => {
  test("shares one exchange and keeps the bearer only in memory", async () => {
    const requests: Array<Readonly<{
      init?: RequestInit;
      path: string;
    }>> = [];
    const fetcher: NonNullable<
      SuiteConvexBrowserTokenLoaderDependencies["fetch"]
    > = (input, init) => {
      requests.push({
        ...(init === undefined ? {} : { init }),
        path: requestPath(input),
      });
      return Promise.resolve(tokenResponse());
    };
    const loader = createSuiteConvexBrowserTokenLoader({
      fetch: fetcher,
      now: () => nowMs,
      refreshSuiteSession: () => Promise.reject(new Error("must not refresh")),
    });

    expect(await Promise.all([
      loader.fetchAccessToken(),
      loader.fetchAccessToken(),
      loader.fetchAccessToken(),
    ])).toEqual([token, token, token]);
    expect(await loader.fetchAccessToken()).toBe(token);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      init: {
        cache: "no-store",
        credentials: "same-origin",
        headers: { accept: "application/json" },
        method: "POST",
        redirect: "error",
      },
      path: "/api/convex-auth/token",
    });

    loader.clear();
    expect(await loader.fetchAccessToken()).toBe(token);
    expect(requests).toHaveLength(2);
    expect(JSON.stringify(loader)).not.toContain(token);
  });

  test("refreshes the sealed suite session once and retries once", async () => {
    let tokenRequests = 0;
    let refreshes = 0;
    const loader = createSuiteConvexBrowserTokenLoader({
      fetch: () => {
        tokenRequests += 1;
        return Promise.resolve(tokenRequests === 1
          ? jsonResponse({ kind: "refresh_required" }, 409)
          : tokenResponse());
      },
      now: () => nowMs,
      refreshSuiteSession: () => {
        refreshes += 1;
        return Promise.resolve({
          kind: "signed_in",
          session: { suiteAccountId: "not-returned-by-loader" },
        });
      },
    });

    expect(await loader.fetchAccessToken()).toBe(token);
    expect(tokenRequests).toBe(2);
    expect(refreshes).toBe(1);
  });

  test("uses the existing serialized RP refresh path by default", async () => {
    let refreshed = false;
    let tokenRequests = 0;
    const paths: string[] = [];
    const loader = createSuiteConvexBrowserTokenLoader({
      fetch: (input, init) => {
        const path = requestPath(input);
        paths.push(`${init?.method ?? "GET"} ${path}`);
        if (path === "/api/convex-auth/token") {
          tokenRequests += 1;
          return Promise.resolve(tokenRequests === 1
            ? jsonResponse({ kind: "refresh_required" }, 409)
            : tokenResponse());
        }
        if (path === "/api/suite-auth/session") {
          return Promise.resolve(jsonResponse(refreshed
            ? { kind: "signed_in", session: { suiteAccountId: "suite_1" } }
            : { kind: "refresh_required" }));
        }
        if (path === "/api/suite-auth/refresh") {
          refreshed = true;
          return Promise.resolve(jsonResponse({
            kind: "signed_in",
            session: { suiteAccountId: "suite_1" },
          }));
        }
        throw new Error(`Unexpected request: ${path}`);
      },
      now: () => nowMs,
      withExclusiveLock: null,
    });

    expect(await loader.fetchAccessToken()).toBe(token);
    expect(paths).toEqual([
      "POST /api/convex-auth/token",
      "GET /api/suite-auth/session",
      "GET /api/suite-auth/session",
      "POST /api/suite-auth/refresh",
      "POST /api/convex-auth/token",
    ]);
  });

  test("returns null only for the exact signed-out envelope", async () => {
    const loader = createSuiteConvexBrowserTokenLoader({
      fetch: () => Promise.resolve(jsonResponse({ kind: "signed_out" }, 401)),
      now: () => nowMs,
      refreshSuiteSession: () => Promise.reject(new Error("must not refresh")),
    });
    expect(await loader.fetchAccessToken()).toBeNull();
  });

  test("fences an in-flight exchange after local custody is cleared", async () => {
    let release: ((response: Response) => void) | undefined;
    const response = new Promise<Response>((resolve) => {
      release = resolve;
    });
    const loader = createSuiteConvexBrowserTokenLoader({
      fetch: () => response,
      now: () => nowMs,
      refreshSuiteSession: () => Promise.reject(new Error("must not refresh")),
    });

    const pending = loader.fetchAccessToken();
    loader.clear();
    release?.(tokenResponse());

    expect(await pending).toBeNull();
  });

  test("rejects repeated refresh, malformed, cacheable, and oversized responses", async () => {
    let repeatedRefreshError: unknown;
    try {
      await createSuiteConvexBrowserTokenLoader({
        fetch: () => Promise.resolve(
          jsonResponse({ kind: "refresh_required" }, 409),
        ),
        now: () => nowMs,
        refreshSuiteSession: () => Promise.resolve(undefined),
      }).fetchAccessToken();
    } catch (error) {
      repeatedRefreshError = error;
    }
    expect(repeatedRefreshError).toBeInstanceOf(Error);
    expect((repeatedRefreshError as Error).message).toContain("still requires");

    for (const response of [
      jsonResponse({
        expiresAtMs: nowMs + 300_000,
        extra: true,
        kind: "token",
        token,
        version: "suite-convex-browser-token-response-v1",
      }),
      jsonResponse({
        expiresAtMs: nowMs - 1,
        kind: "token",
        token,
        version: "suite-convex-browser-token-response-v1",
      }),
      new Response("{}", {
        headers: {
          "cache-control": "public, max-age=60",
          "content-type": "application/json",
        },
      }),
      new Response("{}", {
        headers: {
          "cache-control": "no-store",
          "content-length": "20481",
          "content-type": "application/json",
        },
      }),
    ]) {
      let error: unknown;
      try {
        await createSuiteConvexBrowserTokenLoader({
          fetch: () => Promise.resolve(response),
          now: () => nowMs,
          refreshSuiteSession: () => Promise.reject(new Error("must not refresh")),
        }).fetchAccessToken();
      } catch (caught) {
        error = caught;
      }
      expect(error).toBeInstanceOf(Error);
    }
  });
});
