// src/identity/consumers.ts
import { err, ok } from "@hraness/result";

// src/immutable.ts
function deepFreeze(value) {
  const visited = new WeakSet;
  function freezeOwned(current) {
    if (current === null || typeof current !== "object")
      return;
    if (visited.has(current))
      return;
    visited.add(current);
    for (const key of Reflect.ownKeys(current)) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (descriptor !== undefined && "value" in descriptor) {
        freezeOwned(descriptor.value);
      }
    }
    Object.freeze(current);
  }
  freezeOwned(value);
  return value;
}

// src/identity/consumers.ts
var SUITE_CONSUMER_IDS = deepFreeze([
  "accounts",
  "act60",
  "elders",
  "soundfish",
  "oh-computer",
  "draw-money",
  "oprte",
  "sponge"
]);
var LEGACY_SUITE_CONSUMER_IDS = deepFreeze([
  "kitchen"
]);
function parseSuiteConsumerId(value) {
  switch (value) {
    case "accounts":
    case "act60":
    case "elders":
    case "soundfish":
    case "oh-computer":
    case "draw-money":
    case "oprte":
    case "sponge":
      return ok(value);
    case "kitchen":
      return ok("oprte");
    default:
      return err("invalid-consumer");
  }
}

// src/registry.ts
var SUITE_ACCOUNTS_REMOTE_ENVIRONMENTS = deepFreeze([
  "production"
]);
var accountsCookies = deepFreeze({
  chunked: ["account_data", "session_data"],
  names: [
    "account_data",
    "convex_jwt",
    "dont_remember",
    "session_data",
    "session_token"
  ]
});
var consumerCookies = deepFreeze({
  chunked: ["session_data"],
  names: ["dont_remember", "session_data", "session_token"]
});
var SUITE_ACCOUNTS_DEPLOYMENTS = deepFreeze({
  production: {
    accountsOrigin: "https://account.hraness.com",
    convexSiteUrl: "https://qualified-marmot-22.convex.site",
    convexUrl: "https://qualified-marmot-22.convex.cloud"
  }
});
function unsupported(siteUrl) {
  return { billingReturn: { kind: "unsupported" }, siteUrl };
}
function oidcSite(id, displayName, productionSiteUrl) {
  return {
    auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
    displayName,
    environments: {
      production: unsupported(productionSiteUrl)
    },
    id
  };
}
var SUITE_ACCOUNTS_CONSUMERS = deepFreeze({
  accounts: {
    auth: {
      basePath: "/api/auth",
      cookies: accountsCookies,
      kind: "authority"
    },
    displayName: "Accounts",
    environments: {
      production: {
        billingReturn: { kind: "supported", path: "/account" },
        siteUrl: "https://account.hraness.com"
      }
    },
    id: "accounts"
  },
  act60: oidcSite("act60", "ACT60", "https://act60.me"),
  elders: oidcSite("elders", "Elders", "https://elders.hraness.com"),
  soundfish: {
    auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
    displayName: "Soundfish",
    environments: {
      production: unsupported("https://sound.fish")
    },
    id: "soundfish"
  },
  "oh-computer": oidcSite("oh-computer", "Oh", "https://oh.computer"),
  "draw-money": {
    auth: {
      basePath: "/api/auth",
      cookies: consumerCookies,
      kind: "proxy"
    },
    displayName: "Draw Money",
    environments: {
      production: unsupported("https://draw.money")
    },
    id: "draw-money"
  },
  oprte: {
    auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
    displayName: "OPRTE",
    environments: {
      production: unsupported("https://oprte.com")
    },
    id: "oprte"
  },
  sponge: oidcSite("sponge", "Sponge", "https://spongesearch.com")
});
var SUITE_ACCOUNTS_CURRENT_ORIGIN_OVERRIDES = deepFreeze({
  sponge: {
    production: unsupported("https://spongeresearch.com")
  }
});
var SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS = deepFreeze([
  "accounts",
  "act60",
  "elders",
  "soundfish",
  "oh-computer",
  "oprte",
  "hra",
  "sponge",
  "subcounter",
  "slackorgs"
]);
function currentOidcSite(id, displayName, productionSiteUrl) {
  return {
    auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
    displayName,
    environments: {
      production: unsupported(productionSiteUrl)
    },
    id
  };
}
var SUITE_ACCOUNTS_CURRENT_CONSUMERS = deepFreeze({
  accounts: SUITE_ACCOUNTS_CONSUMERS.accounts,
  act60: SUITE_ACCOUNTS_CONSUMERS.act60,
  elders: SUITE_ACCOUNTS_CONSUMERS.elders,
  soundfish: SUITE_ACCOUNTS_CONSUMERS.soundfish,
  "oh-computer": SUITE_ACCOUNTS_CONSUMERS["oh-computer"],
  oprte: SUITE_ACCOUNTS_CONSUMERS.oprte,
  hra: currentOidcSite("hra", "HRA", "https://hra.sh"),
  sponge: currentOidcSite("sponge", "Sponge", SUITE_ACCOUNTS_CURRENT_ORIGIN_OVERRIDES.sponge.production.siteUrl),
  subcounter: currentOidcSite("subcounter", "Subcounter", "https://subcounter.com"),
  slackorgs: currentOidcSite("slackorgs", "SlackOrgs", "https://slackorgs.com")
});
var SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS = deepFreeze([
  "accounts",
  "act60",
  "elders",
  "soundfish",
  "oh-computer",
  "oprte",
  "sponge"
]);
var SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS = deepFreeze(SUITE_CONSUMER_IDS.filter((consumer) => SUITE_ACCOUNTS_CONSUMERS[consumer].auth.kind === "oidc-rp"));
function suiteAccountsConsumerRequiresEmailOtp(consumer) {
  return SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS.includes(consumer);
}
var SUITE_ACCOUNTS_LINKED_OIDC_CONSUMER_IDS = deepFreeze([
  "soundfish",
  "oprte"
]);
var SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS = deepFreeze(SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS.filter((consumer) => SUITE_ACCOUNTS_CURRENT_CONSUMERS[consumer].auth.kind === "oidc-rp"));
var SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS = deepFreeze([
  "soundfish",
  "oprte",
  "hra"
]);
function isSuiteAccountsConsumerId(value) {
  return typeof value === "string" && SUITE_CONSUMER_IDS.includes(value);
}
function isSuiteAccountsOidcConsumerId(value) {
  return getSuiteAccountsConsumer(value).auth.kind === "oidc-rp";
}
function isSuiteAccountsLinkedOidcConsumerId(value) {
  return SUITE_ACCOUNTS_LINKED_OIDC_CONSUMER_IDS.includes(value);
}
function isSuiteAccountsOAuthConsumerId(value) {
  return getSuiteAccountsConsumer(value).auth.kind === "oidc-rp";
}
function isSuiteAccountsCurrentConsumerId(value) {
  return typeof value === "string" && SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS.includes(value);
}
function isSuiteAccountsCurrentOidcConsumerId(value) {
  return getSuiteAccountsCurrentConsumer(value).auth.kind === "oidc-rp";
}
function isSuiteAccountsCurrentLinkedOidcConsumerId(value) {
  return SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS.includes(value);
}
function isSuiteAccountsCurrentOAuthConsumerId(value) {
  return getSuiteAccountsCurrentConsumer(value).auth.kind === "oidc-rp";
}
function suiteAccountsCurrentConsumerRequiresEmailOtp(consumer) {
  return SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS.includes(consumer);
}
function getSuiteAccountsConsumer(consumer) {
  return SUITE_ACCOUNTS_CONSUMERS[consumer];
}
function getSuiteAccountsConsumerEnvironment(consumer, environment) {
  const registration = getSuiteAccountsConsumer(consumer);
  return registration.environments[environment] ?? null;
}
function getSuiteAccountsCurrentConsumer(consumer) {
  return SUITE_ACCOUNTS_CURRENT_CONSUMERS[consumer];
}
function getSuiteAccountsCurrentConsumerEnvironment(consumer, environment) {
  if (!isSuiteAccountsCurrentConsumerId(consumer))
    return null;
  return getSuiteAccountsCurrentConsumer(consumer).environments[environment] ?? null;
}
function isSuiteAccountsActiveConsumerId(value) {
  return SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS.includes(value);
}
function getSuiteAccountsDeployment(environment) {
  return SUITE_ACCOUNTS_DEPLOYMENTS[environment];
}

// src/convex-url.ts
var LOCAL_HOSTNAMES = new Set(["127.0.0.1", "[::1]", "localhost"]);
function invalid(input, reason, message) {
  return deepFreeze({ input, kind: "invalid", message, reason });
}
function parseConvexDeployment(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return deepFreeze({ kind: "missing" });
  }
  const input = value.trim();
  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    return invalid(input, "not-a-url", "Use a complete Convex deployment URL.");
  }
  if (parsed.username !== "" || parsed.password !== "") {
    return invalid(input, "credentials", "Deployment URLs cannot contain credentials.");
  }
  if (parsed.pathname !== "/" || parsed.search !== "" || parsed.hash !== "") {
    return invalid(input, "not-an-origin", "Use the deployment origin without a path or query.");
  }
  const local = LOCAL_HOSTNAMES.has(parsed.hostname);
  if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) {
    return invalid(input, "insecure-remote", "Remote Convex deployments must use HTTPS.");
  }
  return deepFreeze({
    kind: "ready",
    origin: parsed.origin,
    transport: local ? "local" : "cloud",
    url: parsed.origin
  });
}

// src/public-config.ts
var LOOPBACK_HOSTS = new Set(["127.0.0.1", "[::1]", "localhost"]);
var SUITE_ACCOUNTS_PUBLIC_ENVIRONMENT_KEYS = deepFreeze([
  "NEXT_PUBLIC_ACCOUNTS_CONVEX_URL",
  "NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL",
  "NEXT_PUBLIC_SITE_URL"
]);
function parseOrigin(value, field) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${field} must be an absolute URL.`);
  }
  const loopback = LOOPBACK_HOSTS.has(url.hostname);
  if (url.protocol !== "https:" && !(loopback && url.protocol === "http:")) {
    throw new Error(`${field} must use HTTPS (HTTP is allowed only on loopback).`);
  }
  if (url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "" || url.pathname !== "" && url.pathname !== "/") {
    throw new Error(`${field} must be a credential-free origin.`);
  }
  return new URL(url.origin);
}
function readyRemoteConfig(consumer, siteUrl, convexUrl, convexSiteUrl) {
  const registration = getPublicConsumer(consumer);
  const environment = "production";
  const consumerEnvironment = getSuiteAccountsCurrentConsumerEnvironment(consumer, environment);
  const deployment = getSuiteAccountsDeployment(environment);
  if (consumerEnvironment?.siteUrl === siteUrl && deployment.convexUrl === convexUrl && deployment.convexSiteUrl === convexSiteUrl) {
    return deepFreeze({
      ...publicAuthConfiguration(registration.auth),
      canonicalProductOrigin: siteUrl,
      consumer,
      convexSiteUrl,
      convexUrl,
      environment,
      kind: "ready",
      siteUrl,
      surfaceOrigin: siteUrl
    });
  }
  return null;
}
function publicAuthConfiguration(auth) {
  switch (auth.kind) {
    case "authority":
      return { authBasePath: auth.basePath, authMode: auth.kind };
    case "oidc-rp":
      return { authBasePath: auth.basePath, authMode: auth.kind };
    case "proxy":
      return { authBasePath: auth.basePath, authMode: auth.kind };
  }
}
function getPublicConsumer(consumer) {
  return isSuiteAccountsCurrentConsumerId(consumer) ? getSuiteAccountsCurrentConsumer(consumer) : getSuiteAccountsConsumer(consumer);
}
function parseSuiteAccountsPublicConfig(consumer, environment) {
  const missing = SUITE_ACCOUNTS_PUBLIC_ENVIRONMENT_KEYS.filter((name) => {
    const value = environment[name];
    return typeof value !== "string" || value.trim() === "";
  });
  if (missing.length > 0)
    return deepFreeze({ kind: "missing", missing });
  const site = parseOrigin(environment.NEXT_PUBLIC_SITE_URL, "NEXT_PUBLIC_SITE_URL");
  const convexSite = parseOrigin(environment.NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL, "NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL");
  const deployment = parseConvexDeployment(environment.NEXT_PUBLIC_ACCOUNTS_CONVEX_URL);
  if (deployment.kind !== "ready") {
    throw new Error(deployment.kind === "invalid" ? `NEXT_PUBLIC_ACCOUNTS_CONVEX_URL is invalid: ${deployment.message}` : "NEXT_PUBLIC_ACCOUNTS_CONVEX_URL is required.");
  }
  const convex = parseOrigin(deployment.url, "NEXT_PUBLIC_ACCOUNTS_CONVEX_URL");
  const loopback = [site, convex, convexSite].map((url) => LOOPBACK_HOSTS.has(url.hostname));
  if (loopback.every(Boolean)) {
    if (deployment.transport !== "local" || site.hostname !== convex.hostname || site.hostname !== convexSite.hostname) {
      throw new Error("Local consumer and Accounts endpoints must use the same loopback host.");
    }
    const registration = getPublicConsumer(consumer);
    return deepFreeze({
      ...publicAuthConfiguration(registration.auth),
      canonicalProductOrigin: site.origin,
      consumer,
      convexSiteUrl: convexSite.origin,
      convexUrl: convex.origin,
      environment: "local",
      kind: "ready",
      siteUrl: site.origin,
      surfaceOrigin: site.origin
    });
  }
  if (loopback.some(Boolean)) {
    throw new Error("Consumer and Accounts endpoints cannot mix local and remote environments.");
  }
  const previewSurfaceValue = environment.NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN;
  if (previewSurfaceValue !== undefined) {
    const previewSurface = parseOrigin(previewSurfaceValue, "NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN");
    if (!previewSurface.hostname.endsWith(".vercel.app")) {
      throw new Error("NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN must use a generated .vercel.app origin.");
    }
    const production = readyRemoteConfig(consumer, site.origin, convex.origin, convexSite.origin);
    if (production === null) {
      throw new Error(`${getPublicConsumer(consumer).displayName} and Accounts endpoints ` + "do not match the production deployment.");
    }
    return deepFreeze({
      canonicalProductOrigin: site.origin,
      environment: "production",
      kind: "unavailable",
      message: "Suite authentication is unavailable on generated Vercel Preview origins.",
      surfaceOrigin: previewSurface.origin
    });
  }
  const remote = readyRemoteConfig(consumer, site.origin, convex.origin, convexSite.origin);
  if (remote !== null)
    return remote;
  throw new Error(`${getPublicConsumer(consumer).displayName} and Accounts endpoints ` + "do not match an owned deployment environment.");
}
function suiteAccountsPublicConfigFromEnvironment(consumer, environment = {
  NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN: process.env.NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN,
  NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL: process.env.NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL,
  NEXT_PUBLIC_ACCOUNTS_CONVEX_URL: process.env.NEXT_PUBLIC_ACCOUNTS_CONVEX_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL
}) {
  try {
    return parseSuiteAccountsPublicConfig(consumer, environment);
  } catch (error) {
    return deepFreeze({
      kind: "invalid",
      message: error instanceof Error ? error.message : "Suite Accounts configuration is invalid."
    });
  }
}

// src/auth-proxy.ts
var FORWARDED_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "content-type",
  "sec-fetch-dest",
  "sec-fetch-mode",
  "sec-fetch-site",
  "sec-fetch-user"
];
var FORWARDED_RESPONSE_HEADERS = [
  "content-language",
  "content-type",
  "vary"
];
var MAX_AUTH_REQUEST_BYTES = 1048576;
function errorResponse(code, message, status, retryable = false) {
  return Response.json({
    error: { code, message, retryable },
    schemaVersion: 1
  }, {
    headers: {
      "cache-control": "no-store",
      pragma: "no-cache"
    },
    status
  });
}
function unavailable() {
  return Promise.resolve(errorResponse("SERVICE_NOT_CONFIGURED", "Suite Accounts authentication is not configured.", 503));
}
function cookiePrefix(config) {
  return config.environment === "local" ? "cclrte-local" : "__Host-cclrte";
}
function cookieCapabilities(config) {
  const auth = isSuiteAccountsCurrentConsumerId(config.consumer) ? getSuiteAccountsCurrentConsumer(config.consumer).auth : getSuiteAccountsConsumer(config.consumer).auth;
  if (auth.kind !== "proxy") {
    throw new Error("Only a registered suite auth proxy may forward cookies.");
  }
  return auth.cookies;
}
function cookieSuffix(name, config) {
  const prefix = `${cookiePrefix(config)}.`;
  return name.startsWith(prefix) ? name.slice(prefix.length) : null;
}
function enabledCookieName(name, config) {
  const suffix = cookieSuffix(name, config);
  if (suffix === null)
    return false;
  const capabilities = cookieCapabilities(config);
  if (capabilities.names.includes(suffix))
    return true;
  const separator = suffix.lastIndexOf(".");
  if (separator < 1)
    return false;
  const base = suffix.slice(0, separator);
  const chunk = suffix.slice(separator + 1);
  return capabilities.chunked.includes(base) && /^(?:0|[1-9]\d?)$/u.test(chunk);
}
function matchingOwnedCookiePrefix(name, config) {
  return cookieSuffix(name, config) !== null;
}
function containsCookieControl(value) {
  for (let index = 0;index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127)
      return true;
  }
  return false;
}
function filteredSuiteAuthCookieHeader(cookieHeader, config) {
  if (cookieHeader === null)
    return null;
  const cookies = [];
  for (const segment of cookieHeader.split(";")) {
    const trimmed = segment.trim();
    const separator = trimmed.indexOf("=");
    if (separator <= 0)
      continue;
    const name = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (enabledCookieName(name, config) && !containsCookieControl(value) && !value.includes(";")) {
      cookies.push(`${name}=${value}`);
    }
  }
  return cookies.length === 0 ? null : cookies.join("; ");
}
function requestIsAllowed(request, config) {
  let incoming;
  try {
    incoming = new URL(request.url);
  } catch {
    return false;
  }
  const onAuthPath = incoming.pathname === config.authBasePath || incoming.pathname.startsWith(`${config.authBasePath}/`);
  if (incoming.origin !== config.siteUrl || !onAuthPath)
    return false;
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== config.siteUrl || request.method === "POST" && origin !== config.siteUrl) {
    return false;
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  return fetchSite === null || fetchSite.toLowerCase() === "same-origin";
}
function forwardedRequestHeaders(request, config) {
  const headers = new Headers;
  headers.set("origin", config.siteUrl);
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null)
      headers.set(name, value);
  }
  const cookie = filteredSuiteAuthCookieHeader(request.headers.get("cookie"), config);
  if (cookie !== null)
    headers.set("cookie", cookie);
  return headers;
}
function splitSetCookieHeader(value) {
  return value.split(/,(?=\s*[!#$%&'*+\-.^_`|~0-9A-Za-z]+=)/u).map((cookie) => cookie.trim()).filter((cookie) => cookie !== "");
}
function responseCookies(headers) {
  const cookieHeaders = headers;
  const discrete = cookieHeaders.getSetCookie?.();
  if (discrete !== undefined)
    return discrete;
  const combined = headers.get("set-cookie");
  return combined === null ? [] : splitSetCookieHeader(combined);
}
function cookieName(cookie) {
  if (/[\r\n]/u.test(cookie))
    return null;
  const pair = cookie.split(";", 1)[0]?.trim();
  const separator = pair?.indexOf("=") ?? -1;
  if (pair === undefined || separator <= 0)
    return null;
  const name = pair.slice(0, separator).trim();
  return /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/u.test(name) ? name : null;
}
function validateOwnedCookie(cookie, config) {
  const parts = cookie.split(";").map((value) => value.trim());
  parts.shift();
  const attributes = new Map;
  for (const part of parts) {
    if (part === "")
      continue;
    const separator = part.indexOf("=");
    const name = (separator === -1 ? part : part.slice(0, separator)).trim().toLowerCase();
    const value = separator === -1 ? null : part.slice(separator + 1).trim();
    if (name === "" || attributes.has(name))
      return false;
    attributes.set(name, value);
  }
  const secure = config.environment === "local" ? !attributes.has("secure") : attributes.has("secure") && attributes.get("secure") === null;
  return attributes.has("httponly") && attributes.get("httponly") === null && attributes.get("path") === "/" && attributes.get("samesite")?.toLowerCase() === "lax" && !attributes.has("domain") && secure;
}
function isSafeCookieDeletion(cookie, config) {
  const pair = cookie.split(";", 1)[0]?.trim();
  const separator = pair?.indexOf("=") ?? -1;
  if (pair === undefined || separator <= 0 || pair.slice(separator + 1) !== "" || !validateOwnedCookie(cookie, config)) {
    return false;
  }
  const maxAge = cookie.split(";").slice(1).find((attribute) => {
    const [name] = attribute.trim().split("=", 1);
    return name?.toLowerCase() === "max-age";
  });
  return maxAge?.trim().toLowerCase() === "max-age=0";
}
function validLocation(location, config) {
  if (/[\r\n]/u.test(location) || location.startsWith("//"))
    return false;
  let url;
  try {
    url = new URL(location, config.siteUrl);
  } catch {
    return false;
  }
  return url.origin === config.siteUrl && url.username === "" && url.password === "";
}
function safeUpstreamResponse(upstream, config) {
  const headers = new Headers;
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value !== null)
      headers.set(name, value);
  }
  headers.set("cache-control", "no-store");
  headers.set("pragma", "no-cache");
  const location = upstream.headers.get("location");
  if (location !== null) {
    if (!validLocation(location, config)) {
      return errorResponse("INVALID_AUTH_UPSTREAM_RESPONSE", "Suite Accounts returned an unsafe redirect.", 502, true);
    }
    headers.set("location", location);
  }
  for (const cookie of responseCookies(upstream.headers)) {
    const name = cookieName(cookie);
    if (name === null) {
      return errorResponse("INVALID_AUTH_UPSTREAM_RESPONSE", "Suite Accounts returned a malformed cookie.", 502, true);
    }
    if (!matchingOwnedCookiePrefix(name, config))
      continue;
    if (!enabledCookieName(name, config)) {
      if (isSafeCookieDeletion(cookie, config))
        continue;
      return errorResponse("INVALID_AUTH_UPSTREAM_RESPONSE", "Suite Accounts returned an unsafe session cookie.", 502, true);
    }
    if (!validateOwnedCookie(cookie, config)) {
      return errorResponse("INVALID_AUTH_UPSTREAM_RESPONSE", "Suite Accounts returned an unsafe session cookie.", 502, true);
    }
    headers.append("set-cookie", cookie);
  }
  return new Response(upstream.body, {
    headers,
    status: upstream.status,
    statusText: upstream.statusText
  });
}
function upstreamPath(incoming, config) {
  if (config.authBasePath === null) {
    throw new Error("A CLI auth consumer has no proxy route.");
  }
  const suffix = incoming.pathname.slice(config.authBasePath.length);
  return `/api/auth${suffix}${incoming.search}`;
}
async function readBoundedRequestBody(request, maximumBytes) {
  if (request.body === null) {
    return { bytes: new ArrayBuffer(0), kind: "ok" };
  }
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const result = await reader.read();
    if (result.done)
      break;
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
async function proxyRequest(request, config, fetchImplementation) {
  if (!requestIsAllowed(request, config)) {
    return errorResponse("AUTH_PROXY_REQUEST_REJECTED", "The authentication request did not come from this environment.", 403);
  }
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null && (!/^(?:0|[1-9]\d*)$/u.test(declaredLength) || Number(declaredLength) > MAX_AUTH_REQUEST_BYTES)) {
    return errorResponse("AUTH_REQUEST_TOO_LARGE", "The authentication request was too large.", 413);
  }
  const incoming = new URL(request.url);
  const init = {
    headers: forwardedRequestHeaders(request, config),
    method: request.method,
    redirect: "manual"
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    const body = await readBoundedRequestBody(request, MAX_AUTH_REQUEST_BYTES);
    if (body.kind === "too_large") {
      return errorResponse("AUTH_REQUEST_TOO_LARGE", "The authentication request was too large.", 413);
    }
    if (body.bytes.byteLength > 0)
      init.body = body.bytes;
  }
  try {
    const upstream = await fetchImplementation(new URL(upstreamPath(incoming, config), config.convexSiteUrl), init);
    return safeUpstreamResponse(upstream, config);
  } catch {
    return errorResponse("AUTH_UPSTREAM_UNAVAILABLE", "Suite Accounts authentication is temporarily unavailable.", 502, true);
  }
}
function suiteAccountsAuthServerForConfig(config, fetchImplementation = fetch) {
  if (config.kind !== "ready" || config.authMode !== "proxy") {
    return deepFreeze({ handler: { GET: unavailable, POST: unavailable } });
  }
  const ownedConfig = deepFreeze({ ...config });
  return deepFreeze({
    handler: {
      GET: async (request) => await proxyRequest(request, ownedConfig, fetchImplementation),
      POST: async (request) => await proxyRequest(request, ownedConfig, fetchImplementation)
    }
  });
}
function suiteAccountsAuthHandler(consumer, environment) {
  return suiteAccountsAuthServerForConfig(suiteAccountsPublicConfigFromEnvironment(consumer, environment)).handler;
}
export {
  suiteAccountsAuthServerForConfig,
  suiteAccountsAuthHandler,
  filteredSuiteAuthCookieHeader
};
