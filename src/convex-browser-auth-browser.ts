import {
  loadSuiteOidcBrowserSession,
  type SuiteOidcExclusiveLock,
} from "./browser-session.js";
import {
  SUITE_CONVEX_BROWSER_PARENT_REFRESH_WINDOW_MS,
  SUITE_CONVEX_BROWSER_TOKEN_PATH,
} from "./convex-browser-auth.js";

const MAXIMUM_TOKEN_RESPONSE_BYTES = 20 * 1_024;
const TOKEN_RESPONSE_VERSION =
  "suite-convex-browser-token-response-v1" as const;

type FetchImplementation = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type SuiteConvexBrowserTokenLoaderDependencies = Readonly<{
  fetch?: FetchImplementation;
  now?: () => number;
  refreshSuiteSession?: () => Promise<unknown>;
  withExclusiveLock?: SuiteOidcExclusiveLock | null;
}>;

export type SuiteConvexBrowserTokenLoader = Readonly<{
  clear(): void;
  fetchAccessToken(): Promise<string | null>;
}>;

type TokenEndpointResult =
  | Readonly<{ kind: "refresh_required" }>
  | Readonly<{ kind: "signed_out" }>
  | Readonly<{ expiresAtMs: number; kind: "token"; token: string }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length
    && keys.every(key => Object.hasOwn(value, key));
}

function compactJwt(value: unknown): value is string {
  return typeof value === "string"
    && value.length >= 32
    && value.length <= 16_384
    && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u.test(value);
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const contentType = response.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  const cacheControl = response.headers.get("cache-control")?.toLowerCase();
  if (
    contentType !== "application/json"
    || cacheControl === undefined
    || !cacheControl.split(",").some(value => value.trim() === "no-store")
    || response.body === null
  ) {
    throw new Error("The Convex token response was unsafe.");
  }
  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null
    && (
      !/^(?:0|[1-9]\d*)$/u.test(declaredLength)
      || Number(declaredLength) > MAXIMUM_TOKEN_RESPONSE_BYTES
    )
  ) {
    await response.body.cancel().catch(() => undefined);
    throw new Error("The Convex token response was too large.");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      length += result.value.byteLength;
      if (length > MAXIMUM_TOKEN_RESPONSE_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new Error("The Convex token response was too large.");
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(bytes),
  ) as unknown;
}

function parseEndpointResult(
  value: unknown,
  status: number,
  nowMs: number,
): TokenEndpointResult {
  if (!isRecord(value)) {
    throw new Error("The Convex token response was invalid.");
  }
  if (
    status === 401
    && exactKeys(value, ["kind"])
    && value["kind"] === "signed_out"
  ) {
    return { kind: "signed_out" };
  }
  if (
    status === 409
    && exactKeys(value, ["kind"])
    && value["kind"] === "refresh_required"
  ) {
    return { kind: "refresh_required" };
  }
  if (
    status !== 200
    || !exactKeys(value, ["expiresAtMs", "kind", "token", "version"])
    || value["kind"] !== "token"
    || value["version"] !== TOKEN_RESPONSE_VERSION
    || !compactJwt(value["token"])
    || typeof value["expiresAtMs"] !== "number"
    || !Number.isSafeInteger(value["expiresAtMs"])
    || value["expiresAtMs"] <= nowMs
    || value["expiresAtMs"] > nowMs + 5 * 60_000
  ) {
    throw new Error("The Convex token response was invalid.");
  }
  return {
    expiresAtMs: value["expiresAtMs"],
    kind: "token",
    token: value["token"],
  };
}

async function requestToken(
  fetcher: FetchImplementation,
  now: () => number,
): Promise<TokenEndpointResult> {
  const response = await fetcher(SUITE_CONVEX_BROWSER_TOKEN_PATH, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { accept: "application/json" },
    method: "POST",
    redirect: "error",
  });
  return parseEndpointResult(
    await readBoundedJson(response),
    response.status,
    now(),
  );
}

/**
 * Create a memory-only Convex bearer loader for `ConvexProviderWithAuth`.
 *
 * Concurrent calls share one in-flight exchange. A near-expiry parent session
 * runs the existing origin-locked RP refresh path, then retries exactly once.
 * No suite access or refresh token reaches this module or its return value.
 */
export function createSuiteConvexBrowserTokenLoader(
  dependencies: SuiteConvexBrowserTokenLoaderDependencies = {},
): SuiteConvexBrowserTokenLoader {
  const fetcher = dependencies.fetch ?? globalThis.fetch;
  const now = dependencies.now ?? Date.now;
  const withExclusiveLock = dependencies.withExclusiveLock;
  const refreshSuiteSession = dependencies.refreshSuiteSession
    ?? (() => loadSuiteOidcBrowserSession({
      fetch: fetcher,
      ...(withExclusiveLock === undefined
        ? {}
        : { withExclusiveLock }),
    }));
  let cached: Readonly<{ expiresAtMs: number; token: string }> | null = null;
  let pending: Promise<string | null> | null = null;
  let custodyGeneration = 0;

  async function exchange(generation: number): Promise<string | null> {
    const first = await requestToken(fetcher, now);
    const result = first.kind === "refresh_required"
      ? await (async () => {
          await refreshSuiteSession();
          return await requestToken(fetcher, now);
        })()
      : first;
    if (result.kind === "refresh_required") {
      throw new Error("The suite session still requires refresh.");
    }
    if (result.kind === "signed_out") {
      if (custodyGeneration === generation) cached = null;
      return null;
    }
    if (custodyGeneration !== generation) return null;
    cached = { expiresAtMs: result.expiresAtMs, token: result.token };
    return result.token;
  }

  return Object.freeze({
    clear() {
      custodyGeneration += 1;
      cached = null;
    },
    async fetchAccessToken() {
      const nowMs = now();
      if (
        cached !== null
        && cached.expiresAtMs - nowMs
          >= SUITE_CONVEX_BROWSER_PARENT_REFRESH_WINDOW_MS
      ) {
        return cached.token;
      }
      if (pending !== null) return await pending;
      const request = exchange(custodyGeneration);
      pending = request;
      try {
        return await request;
      } finally {
        if (pending === request) pending = null;
      }
    },
  });
}
