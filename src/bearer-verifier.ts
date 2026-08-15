import {
  base64url,
  createLocalJWKSet,
  decodeProtectedHeader,
  importJWK,
  jwtVerify,
  type JSONWebKeySet,
  type JWTPayload,
} from "jose";

import type { SuiteJwtClaims } from "./identity/principals.js";

import { deepFreeze } from "./immutable.js";
import {
  verifySuiteEntitlementToken,
  type VerifiedSuiteEntitlements,
} from "./entitlements.js";
import {
  type SuiteAccountsOAuthConsumerId,
  type SuiteAccountsRemoteEnvironment,
} from "./registry.js";
import {
  suiteAccountsOidcClientRegistration,
  suiteAccountsOidcProviderConfiguration,
} from "./urls.js";

const MAX_TOKEN_BYTES = 16_384;
const MAX_JWKS_BYTES = 64 * 1_024;
const DEFAULT_FETCH_TIMEOUT_MS = 5_000;
const DEFAULT_JWKS_CACHE_TTL_MS = 5 * 60_000;
const DEFAULT_JWKS_REFRESH_COOLDOWN_MS = 60_000;
const ALGORITHMS = ["ES256"] as const;

type FetchImplementation = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type SuiteBearerVerifierConfiguration = Readonly<{
  audiences: readonly [string, string];
  clientId: string;
  issuer: string;
  jwksEndpoint: string;
}>;

export type VerifiedSuiteBearer = Readonly<{
  claims: SuiteJwtClaims;
  entitlements: VerifiedSuiteEntitlements;
  kind: "verified";
}>;

export type SuiteBearerVerification =
  | VerifiedSuiteBearer
  | Readonly<{
      kind: "invalid";
      reason:
        | "audience"
        | "authorization"
        | "claims"
        | "client"
        | "entitlements"
        | "signature"
        | "time";
    }>
  | Readonly<{
      kind: "unavailable";
      reason: "jwks";
    }>;

export type SuiteBearerVerifier = Readonly<{
  configuration: SuiteBearerVerifierConfiguration;
  verify(bearerToken: string): Promise<SuiteBearerVerification>;
}>;

export type CreateSuiteBearerVerifierOptions = Readonly<{
  consumer: SuiteAccountsOAuthConsumerId;
  environment: SuiteAccountsRemoteEnvironment;
  fetch?: FetchImplementation;
  fetchTimeoutMs?: number;
  jwksCacheTtlMs?: number;
  jwksRefreshCooldownMs?: number;
  now?: () => number;
}>;

export type SuiteBearerAuthorizationResult =
  | Readonly<{ ok: true; value: string }>
  | Readonly<{ error: "invalid-authorization"; ok: false }>;

type CachedJwks = Readonly<{
  expiresAtMs: number;
  value: JSONWebKeySet;
}>;

type SignatureResult =
  | Readonly<{ kind: "verified"; payload: JWTPayload }>
  | Readonly<{ kind: "invalid"; reason: "signature" | "time" }>
  | Readonly<{ kind: "unavailable"; reason: "jwks" }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeInteger(value: unknown): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= 0;
}

function containsAsciiControl(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

function boundedString(
  value: unknown,
  minimum: number,
  maximum: number,
): value is string {
  return typeof value === "string"
    && value.length >= minimum
    && value.length <= maximum
    && value.trim() === value
    && !containsAsciiControl(value);
}

function compactJwt(value: string): boolean {
  return value.length >= 32
    && value.length <= MAX_TOKEN_BYTES
    && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u.test(value);
}

/**
 * Parse one exact HTTP Bearer credential without accepting lists, alternate
 * schemes, leading/trailing whitespace, or control characters.
 */
export function parseSuiteBearerAuthorization(
  value: unknown,
): SuiteBearerAuthorizationResult {
  if (
    typeof value !== "string"
    || value.length > "Bearer ".length + MAX_TOKEN_BYTES
    || !value.startsWith("Bearer ")
    || value.includes(",")
  ) {
    return { error: "invalid-authorization", ok: false };
  }
  const token = value.slice("Bearer ".length);
  return compactJwt(token)
    ? { ok: true, value: token }
    : { error: "invalid-authorization", ok: false };
}

function canonicalP256Coordinate(value: unknown): value is string {
  if (
    typeof value !== "string"
    || !/^[A-Za-z0-9_-]{43}$/u.test(value)
  ) {
    return false;
  }
  try {
    const decoded = base64url.decode(value);
    return decoded.byteLength === 32 && base64url.encode(decoded) === value;
  } catch {
    return false;
  }
}

async function validJwks(value: unknown): Promise<JSONWebKeySet | null> {
  if (
    !isRecord(value)
    || !Array.isArray(value["keys"])
    || value["keys"].length < 1
    || value["keys"].length > 8
  ) {
    return null;
  }
  const kids = new Set<string>();
  for (const key of value["keys"]) {
    if (
      !isRecord(key)
      || !boundedString(key["kid"], 1, 128)
      || kids.has(key["kid"])
      || key["kty"] !== "EC"
      || key["crv"] !== "P-256"
      || (key["alg"] !== undefined && key["alg"] !== "ES256")
      || (key["use"] !== undefined && key["use"] !== "sig")
      || !canonicalP256Coordinate(key["x"])
      || !canonicalP256Coordinate(key["y"])
      || key["d"] !== undefined
    ) {
      return null;
    }
    try {
      const imported = await importJWK(key, "ES256");
      if (
        imported instanceof Uint8Array
        || imported.type !== "public"
        || !imported.usages.includes("verify")
      ) {
        return null;
      }
    } catch {
      return null;
    }
    kids.add(key["kid"]);
  }
  return value as unknown as JSONWebKeySet;
}

async function readBoundedJson(
  response: Response,
  maximumBytes: number,
): Promise<unknown> {
  const declared = response.headers.get("content-length");
  if (
    declared !== null
    && (
      !/^(?:0|[1-9]\d*)$/u.test(declared)
      || Number(declared) > maximumBytes
    )
  ) {
    throw new Error("The JWKS response was too large.");
  }
  if (response.body === null) throw new Error("The JWKS response was empty.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    if (result.value.byteLength > maximumBytes - length) {
      await reader.cancel();
      throw new Error("The JWKS response was too large.");
    }
    chunks.push(result.value);
    length += result.value.byteLength;
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

function exactAudience(
  value: unknown,
  audiences: readonly [string, string],
): boolean {
  if (!Array.isArray(value) || value.length !== 2) return false;
  const actual = new Set(value);
  return actual.size === 2
    && actual.has(audiences[0])
    && actual.has(audiences[1]);
}

function jwtFailureReason(error: unknown): "signature" | "time" {
  if (!isRecord(error)) return "signature";
  const code = error["code"];
  if (code === "ERR_JWT_EXPIRED") return "time";
  if (
    code === "ERR_JWT_CLAIM_VALIDATION_FAILED"
    && (
      error["claim"] === "exp"
      || error["claim"] === "iat"
      || error["claim"] === "nbf"
    )
  ) {
    return "time";
  }
  return "signature";
}

function missingJwksKey(error: unknown): boolean {
  return isRecord(error) && error["code"] === "ERR_JWKS_NO_MATCHING_KEY";
}

/**
 * Build a server-only verifier for access tokens minted to one exact suite
 * public client. Registry authority, not caller input, selects every trust
 * endpoint and client binding.
 */
export function createSuiteBearerVerifier(
  options: CreateSuiteBearerVerifierOptions,
): SuiteBearerVerifier {
  const client = suiteAccountsOidcClientRegistration(
    options.consumer,
    options.environment,
  );
  if (client === null) {
    throw new Error("The suite bearer consumer has no OAuth client.");
  }
  const provider =
    suiteAccountsOidcProviderConfiguration(options.environment);
  const configuration: SuiteBearerVerifierConfiguration = deepFreeze({
    audiences: [provider.resource, provider.userInfoAudience],
    clientId: client.clientId,
    issuer: provider.issuer,
    jwksEndpoint: provider.jwksEndpoint,
  });
  const fetchImplementation = options.fetch ?? fetch;
  const fetchTimeoutMs = options.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const jwksCacheTtlMs =
    options.jwksCacheTtlMs ?? DEFAULT_JWKS_CACHE_TTL_MS;
  const jwksRefreshCooldownMs = options.jwksRefreshCooldownMs
    ?? DEFAULT_JWKS_REFRESH_COOLDOWN_MS;
  if (
    !safeInteger(fetchTimeoutMs)
    || fetchTimeoutMs < 100
    || fetchTimeoutMs > 30_000
  ) {
    throw new Error("The suite JWKS fetch timeout must be 100–30000ms.");
  }
  if (
    !safeInteger(jwksCacheTtlMs)
    || jwksCacheTtlMs < 1_000
    || jwksCacheTtlMs > 24 * 60 * 60_000
  ) {
    throw new Error("The suite JWKS cache TTL must be 1000–86400000ms.");
  }
  if (
    !safeInteger(jwksRefreshCooldownMs)
    || jwksRefreshCooldownMs < 1_000
    || jwksRefreshCooldownMs > 5 * 60_000
  ) {
    throw new Error("The suite JWKS refresh cooldown must be 1000–300000ms.");
  }
  const now = options.now ?? Date.now;
  let cache: CachedJwks | null = null;
  let lastForcedRefreshAtMs: number | null = null;
  let pending: Promise<JSONWebKeySet> | null = null;

  async function fetchJwks(): Promise<JSONWebKeySet> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);
    try {
      const response = await fetchImplementation(configuration.jwksEndpoint, {
        cache: "no-store",
        headers: { accept: "application/json" },
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
      });
      if (
        response.status !== 200
        || response.headers.has("location")
        || response.headers.get("content-type")?.split(";", 1)[0]?.trim()
          .toLowerCase() !== "application/json"
      ) {
        throw new Error("The suite JWKS endpoint was unavailable.");
      }
      const value = await validJwks(
        await readBoundedJson(response, MAX_JWKS_BYTES),
      );
      if (value === null) throw new Error("The suite JWKS was invalid.");
      cache = {
        expiresAtMs: now() + jwksCacheTtlMs,
        value,
      };
      return value;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function jwks(forceRefresh = false): Promise<JSONWebKeySet> {
    const nowMs = now();
    if (!forceRefresh && cache !== null && cache.expiresAtMs > nowMs) {
      return cache.value;
    }
    if (pending !== null) return await pending;
    // A forced rotation probe commits only after the replacement has passed
    // every JWKS check, leaving the still-live known-good set available.
    pending = fetchJwks();
    try {
      return await pending;
    } finally {
      pending = null;
    }
  }

  async function verifySignature(
    token: string,
    nowMs: number,
    forceRefresh = false,
  ): Promise<SignatureResult> {
    let keySet: JSONWebKeySet;
    try {
      keySet = await jwks(forceRefresh);
    } catch {
      return { kind: "unavailable", reason: "jwks" };
    }
    try {
      const result = await jwtVerify(
        token,
        createLocalJWKSet(keySet),
        {
          algorithms: [...ALGORITHMS],
          clockTolerance: 30,
          currentDate: new Date(nowMs),
          maxTokenAge: "20m",
        },
      );
      return { kind: "verified", payload: result.payload };
    } catch (error) {
      if (!forceRefresh && missingJwksKey(error)) {
        if (
          lastForcedRefreshAtMs !== null
          && nowMs - lastForcedRefreshAtMs < jwksRefreshCooldownMs
        ) {
          return { kind: "invalid", reason: "signature" };
        }
        lastForcedRefreshAtMs = nowMs;
        return await verifySignature(token, nowMs, true);
      }
      return { kind: "invalid", reason: jwtFailureReason(error) };
    }
  }

  async function verify(
    bearerToken: string,
  ): Promise<SuiteBearerVerification> {
    if (!compactJwt(bearerToken)) {
      return { kind: "invalid", reason: "authorization" };
    }
    let header: ReturnType<typeof decodeProtectedHeader>;
    try {
      header = decodeProtectedHeader(bearerToken);
    } catch {
      return { kind: "invalid", reason: "authorization" };
    }
    if (
      header.alg !== "ES256"
      || !boundedString(header.kid, 1, 128)
    ) {
      return { kind: "invalid", reason: "signature" };
    }
    const nowMs = now();
    if (!safeInteger(nowMs)) return { kind: "invalid", reason: "time" };
    const signed = await verifySignature(bearerToken, nowMs);
    if (signed.kind !== "verified") return signed;

    const parsed = await verifySuiteEntitlementToken(bearerToken, {
      expectedAudience: provider.resource,
      expectedIssuer: provider.issuer,
      nowMs,
      verify: () => Promise.resolve(signed.payload),
    });
    if (parsed.kind !== "verified") {
      return {
        kind: "invalid",
        reason: parsed.reason === "issuer" || parsed.reason === "signature"
          ? "claims"
          : parsed.reason,
      };
    }
    if (!exactAudience(signed.payload.aud, configuration.audiences)) {
      return { kind: "invalid", reason: "audience" };
    }
    if (
      signed.payload["azp"] !== configuration.clientId
      || signed.payload["suite_client_id"] !== configuration.clientId
    ) {
      return { kind: "invalid", reason: "client" };
    }
    return {
      claims: parsed.claims,
      entitlements: parsed.entitlements,
      kind: "verified",
    };
  }

  return Object.freeze({ configuration, verify });
}
