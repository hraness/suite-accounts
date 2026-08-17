import {
  getSuiteAccountsCurrentConsumer,
  getSuiteAccountsConsumer,
  isSuiteAccountsCurrentConsumerId,
  type SuiteAccountsCookieCapabilities,
  type SuiteAccountsCookieName,
} from "./registry.js";
import {
  suiteAccountsPublicConfigFromEnvironment,
  type ReadySuiteAccountsPublicConfig,
  type SuiteAccountsPublicConfig,
  type SuiteAccountsPublicEnvironment,
} from "./public-config.js";
import { deepFreeze } from "./immutable.js";

const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "content-type",
  "sec-fetch-dest",
  "sec-fetch-mode",
  "sec-fetch-site",
  "sec-fetch-user",
] as const;

const FORWARDED_RESPONSE_HEADERS = [
  "content-language",
  "content-type",
  "vary",
] as const;

const MAX_AUTH_REQUEST_BYTES = 1_048_576;

type BoundedRequestBody =
  | Readonly<{ bytes: ArrayBuffer; kind: "ok" }>
  | Readonly<{ kind: "too_large" }>;

type FetchImplementation = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

function errorResponse(
  code: string,
  message: string,
  status: number,
  retryable = false,
): Response {
  return Response.json(
    {
      error: { code, message, retryable },
      schemaVersion: 1,
    },
    {
      headers: {
        "cache-control": "no-store",
        pragma: "no-cache",
      },
      status,
    },
  );
}

function unavailable(): Promise<Response> {
  return Promise.resolve(errorResponse(
    "SERVICE_NOT_CONFIGURED",
    "Suite Accounts authentication is not configured.",
    503,
  ));
}

function cookiePrefix(config: ReadySuiteAccountsPublicConfig): string {
  return config.environment === "local"
    ? "cclrte-local"
    : "__Host-cclrte";
}

function cookieCapabilities(
  config: ReadySuiteAccountsPublicConfig,
): SuiteAccountsCookieCapabilities {
  const auth = isSuiteAccountsCurrentConsumerId(config.consumer)
    ? getSuiteAccountsCurrentConsumer(config.consumer).auth
    : getSuiteAccountsConsumer(config.consumer).auth;
  if (auth.kind !== "proxy") {
    throw new Error("Only a registered suite auth proxy may forward cookies.");
  }
  return auth.cookies;
}

function cookieSuffix(
  name: string,
  config: ReadySuiteAccountsPublicConfig,
): string | null {
  const prefix = `${cookiePrefix(config)}.`;
  return name.startsWith(prefix) ? name.slice(prefix.length) : null;
}

function enabledCookieName(
  name: string,
  config: ReadySuiteAccountsPublicConfig,
): boolean {
  const suffix = cookieSuffix(name, config);
  if (suffix === null) return false;
  const capabilities = cookieCapabilities(config);
  if ((capabilities.names as readonly string[]).includes(suffix)) return true;
  const separator = suffix.lastIndexOf(".");
  if (separator < 1) return false;
  const base = suffix.slice(0, separator) as SuiteAccountsCookieName;
  const chunk = suffix.slice(separator + 1);
  return (capabilities.chunked as readonly string[]).includes(base)
    && /^(?:0|[1-9]\d?)$/u.test(chunk);
}

function matchingOwnedCookiePrefix(
  name: string,
  config: ReadySuiteAccountsPublicConfig,
): boolean {
  return cookieSuffix(name, config) !== null;
}

function containsCookieControl(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

export function filteredSuiteAuthCookieHeader(
  cookieHeader: string | null,
  config: ReadySuiteAccountsPublicConfig,
): string | null {
  if (cookieHeader === null) return null;
  const cookies: string[] = [];
  for (const segment of cookieHeader.split(";")) {
    const trimmed = segment.trim();
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const name = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (
      enabledCookieName(name, config)
      && !containsCookieControl(value)
      && !value.includes(";")
    ) {
      cookies.push(`${name}=${value}`);
    }
  }
  return cookies.length === 0 ? null : cookies.join("; ");
}

function requestIsAllowed(
  request: Request,
  config: ReadySuiteAccountsPublicConfig,
): boolean {
  let incoming: URL;
  try {
    incoming = new URL(request.url);
  } catch {
    return false;
  }
  const onAuthPath = incoming.pathname === config.authBasePath
    || incoming.pathname.startsWith(`${config.authBasePath}/`);
  if (incoming.origin !== config.siteUrl || !onAuthPath) return false;

  const origin = request.headers.get("origin");
  if (
    (origin !== null && origin !== config.siteUrl)
    || (request.method === "POST" && origin !== config.siteUrl)
  ) {
    return false;
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  return fetchSite === null || fetchSite.toLowerCase() === "same-origin";
}

function forwardedRequestHeaders(
  request: Request,
  config: ReadySuiteAccountsPublicConfig,
): Headers {
  const headers = new Headers();
  headers.set("origin", config.siteUrl);
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  const cookie = filteredSuiteAuthCookieHeader(
    request.headers.get("cookie"),
    config,
  );
  if (cookie !== null) headers.set("cookie", cookie);
  return headers;
}

function splitSetCookieHeader(value: string): string[] {
  return value
    .split(/,(?=\s*[!#$%&'*+\-.^_`|~0-9A-Za-z]+=)/u)
    .map(cookie => cookie.trim())
    .filter(cookie => cookie !== "");
}

function responseCookies(headers: Headers): readonly string[] {
  const cookieHeaders = headers as Headers & {
    getSetCookie?: () => string[];
  };
  const discrete = cookieHeaders.getSetCookie?.();
  if (discrete !== undefined) return discrete;
  const combined = headers.get("set-cookie");
  return combined === null ? [] : splitSetCookieHeader(combined);
}

function cookieName(cookie: string): string | null {
  if (/[\r\n]/u.test(cookie)) return null;
  const pair = cookie.split(";", 1)[0]?.trim();
  const separator = pair?.indexOf("=") ?? -1;
  if (pair === undefined || separator <= 0) return null;
  const name = pair.slice(0, separator).trim();
  return /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/u.test(name) ? name : null;
}

function validateOwnedCookie(
  cookie: string,
  config: ReadySuiteAccountsPublicConfig,
): boolean {
  const parts = cookie.split(";").map(value => value.trim());
  parts.shift();
  const attributes = new Map<string, string | null>();
  for (const part of parts) {
    if (part === "") continue;
    const separator = part.indexOf("=");
    const name = (separator === -1 ? part : part.slice(0, separator))
      .trim()
      .toLowerCase();
    const value = separator === -1
      ? null
      : part.slice(separator + 1).trim();
    if (name === "" || attributes.has(name)) return false;
    attributes.set(name, value);
  }
  const secure = config.environment === "local"
    ? !attributes.has("secure")
    : attributes.has("secure") && attributes.get("secure") === null;
  return (
    attributes.has("httponly")
    && attributes.get("httponly") === null
    && attributes.get("path") === "/"
    && attributes.get("samesite")?.toLowerCase() === "lax"
    && !attributes.has("domain")
    && secure
  );
}

function isSafeCookieDeletion(
  cookie: string,
  config: ReadySuiteAccountsPublicConfig,
): boolean {
  const pair = cookie.split(";", 1)[0]?.trim();
  const separator = pair?.indexOf("=") ?? -1;
  if (
    pair === undefined
    || separator <= 0
    || pair.slice(separator + 1) !== ""
    || !validateOwnedCookie(cookie, config)
  ) {
    return false;
  }
  const maxAge = cookie.split(";").slice(1).find((attribute) => {
    const [name] = attribute.trim().split("=", 1);
    return name?.toLowerCase() === "max-age";
  });
  return maxAge?.trim().toLowerCase() === "max-age=0";
}

function validLocation(
  location: string,
  config: ReadySuiteAccountsPublicConfig,
): boolean {
  if (/[\r\n]/u.test(location) || location.startsWith("//")) return false;
  let url: URL;
  try {
    url = new URL(location, config.siteUrl);
  } catch {
    return false;
  }
  return url.origin === config.siteUrl
    && url.username === ""
    && url.password === "";
}

function safeUpstreamResponse(
  upstream: Response,
  config: ReadySuiteAccountsPublicConfig,
): Response {
  const headers = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  headers.set("cache-control", "no-store");
  headers.set("pragma", "no-cache");

  const location = upstream.headers.get("location");
  if (location !== null) {
    if (!validLocation(location, config)) {
      return errorResponse(
        "INVALID_AUTH_UPSTREAM_RESPONSE",
        "Suite Accounts returned an unsafe redirect.",
        502,
        true,
      );
    }
    headers.set("location", location);
  }
  for (const cookie of responseCookies(upstream.headers)) {
    const name = cookieName(cookie);
    if (name === null) {
      return errorResponse(
        "INVALID_AUTH_UPSTREAM_RESPONSE",
        "Suite Accounts returned a malformed cookie.",
        502,
        true,
      );
    }
    if (!matchingOwnedCookiePrefix(name, config)) continue;
    if (!enabledCookieName(name, config)) {
      if (isSafeCookieDeletion(cookie, config)) continue;
      return errorResponse(
        "INVALID_AUTH_UPSTREAM_RESPONSE",
        "Suite Accounts returned an unsafe session cookie.",
        502,
        true,
      );
    }
    if (!validateOwnedCookie(cookie, config)) {
      return errorResponse(
        "INVALID_AUTH_UPSTREAM_RESPONSE",
        "Suite Accounts returned an unsafe session cookie.",
        502,
        true,
      );
    }
    headers.append("set-cookie", cookie);
  }
  return new Response(upstream.body, {
    headers,
    status: upstream.status,
    statusText: upstream.statusText,
  });
}

function upstreamPath(
  incoming: URL,
  config: ReadySuiteAccountsPublicConfig,
): string {
  if (config.authBasePath === null) {
    throw new Error("A CLI auth consumer has no proxy route.");
  }
  const suffix = incoming.pathname.slice(config.authBasePath.length);
  return `/api/auth${suffix}${incoming.search}`;
}

async function readBoundedRequestBody(
  request: Request,
  maximumBytes: number,
): Promise<BoundedRequestBody> {
  if (request.body === null) {
    return { bytes: new ArrayBuffer(0), kind: "ok" };
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    if (result.value.byteLength > maximumBytes - length) {
      await reader.cancel();
      return { kind: "too_large" };
    }
    length += result.value.byteLength;
    chunks.push(result.value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes: bytes.buffer, kind: "ok" };
}

async function proxyRequest(
  request: Request,
  config: ReadySuiteAccountsPublicConfig,
  fetchImplementation: FetchImplementation,
): Promise<Response> {
  if (!requestIsAllowed(request, config)) {
    return errorResponse(
      "AUTH_PROXY_REQUEST_REJECTED",
      "The authentication request did not come from this environment.",
      403,
    );
  }
  const declaredLength = request.headers.get("content-length");
  if (
    declaredLength !== null
    && (!/^(?:0|[1-9]\d*)$/u.test(declaredLength)
      || Number(declaredLength) > MAX_AUTH_REQUEST_BYTES)
  ) {
    return errorResponse(
      "AUTH_REQUEST_TOO_LARGE",
      "The authentication request was too large.",
      413,
    );
  }
  const incoming = new URL(request.url);
  const init: RequestInit = {
    headers: forwardedRequestHeaders(request, config),
    method: request.method,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    const body = await readBoundedRequestBody(request, MAX_AUTH_REQUEST_BYTES);
    if (body.kind === "too_large") {
      return errorResponse(
        "AUTH_REQUEST_TOO_LARGE",
        "The authentication request was too large.",
        413,
      );
    }
    if (body.bytes.byteLength > 0) init.body = body.bytes;
  }
  try {
    const upstream = await fetchImplementation(
      new URL(upstreamPath(incoming, config), config.convexSiteUrl),
      init,
    );
    return safeUpstreamResponse(upstream, config);
  } catch {
    return errorResponse(
      "AUTH_UPSTREAM_UNAVAILABLE",
      "Suite Accounts authentication is temporarily unavailable.",
      502,
      true,
    );
  }
}

export function suiteAccountsAuthServerForConfig(
  config: SuiteAccountsPublicConfig,
  fetchImplementation: FetchImplementation = fetch,
) {
  if (config.kind !== "ready" || config.authMode !== "proxy") {
    return deepFreeze({ handler: { GET: unavailable, POST: unavailable } });
  }
  const ownedConfig = deepFreeze({ ...config });
  return deepFreeze({
    handler: {
      GET: async (request: Request) =>
        await proxyRequest(request, ownedConfig, fetchImplementation),
      POST: async (request: Request) =>
        await proxyRequest(request, ownedConfig, fetchImplementation),
    },
  });
}

export function suiteAccountsAuthHandler(
  consumer: ReadySuiteAccountsPublicConfig["consumer"],
  environment?: SuiteAccountsPublicEnvironment,
) {
  return suiteAccountsAuthServerForConfig(
    suiteAccountsPublicConfigFromEnvironment(consumer, environment),
  ).handler;
}
