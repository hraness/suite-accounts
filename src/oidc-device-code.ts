import { deepFreeze } from "./immutable.js";

/**
 * OAuth 2.0 Device Authorization Grant (RFC 8628) client-side protocol support.
 *
 * This module owns only the request/response shapes, parsing, and polling
 * semantics used by suite CLI clients. The issuer-side device_authorization
 * endpoint and device_code grant handler live in the Accounts authority.
 */

export const SUITE_OIDC_DEVICE_CODE_GRANT_TYPE =
  "urn:ietf:params:oauth:grant-type:device_code" as const;

const MIN_DEVICE_CODE_INTERVAL_MS = 1_000;
const MAX_DEVICE_CODE_INTERVAL_MS = 600_000;
const MAX_USER_CODE_LENGTH = 256;
const MAX_DEVICE_CODE_LENGTH = 2_048;
const MAX_VERIFICATION_URI_LENGTH = 4_096;

export type SuiteOidcDeviceAuthorizationRequest = Readonly<{
  /** Registered OIDC client id, e.g. `hraness:wrench:production:v1`. */
  clientId: string;
  /** Optional space-delimited scope list; suite resource is implied by the client. */
  scopes?: readonly string[];
}>;

export type SuiteOidcDeviceAuthorizationResponse = Readonly<{
  /** Opaque device-bound code used by the CLI when polling the token endpoint. */
  deviceCode: string;
  /** Short human-readable code the user types or confirms in the browser. */
  userCode: string;
  /** Absolute browser URL for approving the device request. */
  verificationUri: string;
  /** Optional pre-formatted URI containing the user code. */
  verificationUriComplete: string | null;
  /** Absolute monotonic deadline after which the device code is expired. */
  expiresAtMs: number;
  /** Minimum polling interval in milliseconds. */
  intervalMs: number;
}>;

export type SuiteOidcDeviceTokenRequest = Readonly<{
  clientId: string;
  deviceCode: string;
}>;

export type SuiteOidcDeviceTokenSuccess = Readonly<{
  kind: "token";
  accessToken: string;
  tokenType: string;
  expiresAtMs: number;
  refreshToken: string | null;
  idToken: string | null;
  scope: string | null;
}>;

export type SuiteOidcDevicePollOutcome =
  | SuiteOidcDeviceTokenSuccess
  | Readonly<{ kind: "authorization_pending"; intervalMs: number }>
  | Readonly<{ kind: "slow_down"; intervalMs: number }>
  | Readonly<{ kind: "access_denied" }>
  | Readonly<{ kind: "expired_token" }>
  | Readonly<{ kind: "error"; error: string; errorDescription: string | null }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedString(
  value: unknown,
  minimum: number,
  maximum: number,
): value is string {
  return typeof value === "string"
    && value.length >= minimum
    && value.length <= maximum
    && !value.includes("\u0000");
}

function safeInteger(value: unknown): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= 0;
}

function containsControlCharacter(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? -1;
    if (codePoint <= 0x1F || codePoint === 0x7F) return true;
  }
  return false;
}

function normalizeScope(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 4_096 || containsControlCharacter(trimmed)) return null;
  return trimmed;
}

function absoluteHttpsUri(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0
    || value.length > MAX_VERIFICATION_URI_LENGTH) {
    return null;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username !== "" || url.password !== "") return null;
    if (url.hash !== "") return null;
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Parse a device authorization endpoint response. Fails closed on any
 * unsupported or malformed field.
 */
export function parseDeviceAuthorizationResponse(
  value: unknown,
  nowMs: number,
): SuiteOidcDeviceAuthorizationResponse | null {
  if (!isRecord(value)) return null;
  const deviceCode = value["device_code"];
  const userCode = value["user_code"];
  const verificationUri = value["verification_uri"];
  const verificationUriComplete = value["verification_uri_complete"];
  const expiresIn = value["expires_in"];
  const interval = value["interval"];
  if (
    !boundedString(deviceCode, 1, MAX_DEVICE_CODE_LENGTH)
    || !boundedString(userCode, 1, MAX_USER_CODE_LENGTH)
    || !boundedString(verificationUri, 1, MAX_VERIFICATION_URI_LENGTH)
    || !safeInteger(expiresIn)
    || expiresIn <= 0
    || expiresIn > 86_400
    || !safeInteger(interval)
    || interval < 1
    || interval > MAX_DEVICE_CODE_INTERVAL_MS / 1_000
  ) {
    return null;
  }
  const verificationUriCompleteValue =
    verificationUriComplete === undefined || verificationUriComplete === null
      ? null
      : absoluteHttpsUri(verificationUriComplete);
  if (
    verificationUriComplete !== undefined
    && verificationUriComplete !== null
    && verificationUriCompleteValue === null
  ) {
    return null;
  }
  const intervalMs = Math.max(
    MIN_DEVICE_CODE_INTERVAL_MS,
    interval * 1_000,
  );
  return deepFreeze({
    deviceCode,
    userCode,
    verificationUri,
    verificationUriComplete: verificationUriCompleteValue,
    expiresAtMs: nowMs + expiresIn * 1_000,
    intervalMs,
  });
}

/**
 * Parse a token endpoint response for the device_code grant. Returns a stable
 * outcome for both success and RFC 8628 / OAuth 2.0 error responses.
 */
export function parseDeviceTokenResponse(
  value: unknown,
  nowMs: number,
): SuiteOidcDevicePollOutcome | null {
  if (!isRecord(value)) return null;
  const error = value["error"];
  const errorDescription = value["error_description"];
  if (error !== undefined) {
    if (typeof error !== "string" || error.length === 0 || error.length > 256) {
      return null;
    }
    const normalizedError = normalizeScope(error);
    if (normalizedError === null || normalizedError !== error) return null;
    const normalizedDescription =
      errorDescription === undefined || errorDescription === null
        ? null
        : normalizeScope(errorDescription);
    if (
      errorDescription !== undefined
      && errorDescription !== null
      && normalizedDescription === null
    ) {
      return null;
    }
    switch (normalizedError) {
      case "authorization_pending":
        return deepFreeze({ kind: "authorization_pending", intervalMs: 5_000 });
      case "slow_down":
        return deepFreeze({ kind: "slow_down", intervalMs: 10_000 });
      case "access_denied":
        return deepFreeze({ kind: "access_denied" });
      case "expired_token":
        return deepFreeze({ kind: "expired_token" });
      default:
        return deepFreeze({
          kind: "error",
          error: normalizedError,
          errorDescription: normalizedDescription,
        });
    }
  }
  const accessToken = value["access_token"];
  const tokenType = value["token_type"];
  const expiresIn = value["expires_in"];
  const refreshToken = value["refresh_token"];
  const idToken = value["id_token"];
  const scope = value["scope"];
  if (
    !boundedString(accessToken, 1, 16_384)
    || !boundedString(tokenType, 1, 64)
    || !safeInteger(expiresIn)
    || expiresIn <= 0
    || expiresIn > 86_400
  ) {
    return null;
  }
  const normalizedRefreshToken =
    refreshToken === undefined || refreshToken === null
      ? null
      : boundedString(refreshToken, 1, 16_384)
        ? refreshToken
        : null;
  if (
    refreshToken !== undefined
    && refreshToken !== null
    && normalizedRefreshToken === null
  ) {
    return null;
  }
  const normalizedIdToken =
    idToken === undefined || idToken === null
      ? null
      : boundedString(idToken, 1, 16_384) ? idToken : null;
  if (
    idToken !== undefined
    && idToken !== null
    && normalizedIdToken === null
  ) {
    return null;
  }
  const normalizedScope = normalizeScope(scope);
  if (scope !== undefined && scope !== null && normalizedScope === null) {
    return null;
  }
  return deepFreeze({
    kind: "token",
    accessToken,
    tokenType: tokenType.toLowerCase(),
    expiresAtMs: nowMs + expiresIn * 1_000,
    refreshToken: normalizedRefreshToken,
    idToken: normalizedIdToken,
    scope: normalizedScope,
  });
}

export type SuiteOidcDeviceFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type SuiteOidcDeviceDependencies = Readonly<{
  fetch?: SuiteOidcDeviceFetch;
  now?: () => Date;
}>;

function deviceAuthorizationBody(
  request: SuiteOidcDeviceAuthorizationRequest,
): string {
  const params = new URLSearchParams();
  params.set("client_id", request.clientId);
  if (request.scopes !== undefined && request.scopes.length > 0) {
    for (const scope of request.scopes) {
      if (typeof scope !== "string" || scope.length === 0 || scope.length > 256
        || /\s/u.test(scope) || containsControlCharacter(scope)) {
        throw new Error("Invalid device authorization scope.");
      }
    }
    params.set("scope", request.scopes.join(" "));
  }
  return params.toString();
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const contentType = response.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    throw new Error("The device-code response was not application/json.");
  }
  const text = await response.text();
  if (text.length > 64 * 1_024) {
    throw new Error("The device-code response body was too large.");
  }
  return JSON.parse(text) as unknown;
}

/**
 * Initiate a device authorization request against the configured issuer
 * endpoint. Returns the parsed response and a bound polling function.
 */
export async function initiateSuiteOidcDeviceAuthorization(
  configuration: Readonly<{
    deviceAuthorizationEndpoint: string;
    tokenEndpoint: string;
  }>,
  request: SuiteOidcDeviceAuthorizationRequest,
  dependencies: SuiteOidcDeviceDependencies = {},
): Promise<
  Readonly<{
    poll: () => Promise<SuiteOidcDevicePollOutcome>;
    response: SuiteOidcDeviceAuthorizationResponse;
  }>
> {
  const fetcher = dependencies.fetch ?? globalThis.fetch;
  const now = dependencies.now?.().getTime() ?? Date.now();
  const response = await fetcher(configuration.deviceAuthorizationEndpoint, {
    body: deviceAuthorizationBody(request),
    headers: {
      "accept": "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
    redirect: "error",
  });
  const body = await readBoundedJson(response);
  if (!response.ok) {
    throw new Error("The device authorization request failed.");
  }
  const parsed = parseDeviceAuthorizationResponse(body, now);
  if (parsed === null) {
    throw new Error("The device authorization response was invalid.");
  }
  const tokenRequest: SuiteOidcDeviceTokenRequest = {
    clientId: request.clientId,
    deviceCode: parsed.deviceCode,
  };
  return {
    poll: () =>
      pollSuiteOidcDeviceToken(configuration.tokenEndpoint, tokenRequest, {
        ...(dependencies.now === undefined
          ? {}
          : { now: dependencies.now }),
        fetch: fetcher,
      }),
    response: parsed,
  };
}

function tokenRequestBody(request: SuiteOidcDeviceTokenRequest): string {
  const params = new URLSearchParams();
  params.set("grant_type", SUITE_OIDC_DEVICE_CODE_GRANT_TYPE);
  params.set("client_id", request.clientId);
  params.set("device_code", request.deviceCode);
  return params.toString();
}

/**
 * Poll the token endpoint for a device_code grant outcome. Callers are expected
 * to honor `intervalMs` from the previous `authorization_pending` or
 * `slow_down` outcome, or from the initial device authorization response.
 */
export async function pollSuiteOidcDeviceToken(
  tokenEndpoint: string,
  request: SuiteOidcDeviceTokenRequest,
  dependencies: SuiteOidcDeviceDependencies = {},
): Promise<SuiteOidcDevicePollOutcome> {
  const fetcher = dependencies.fetch ?? globalThis.fetch;
  const now = dependencies.now?.().getTime() ?? Date.now();
  const response = await fetcher(tokenEndpoint, {
    body: tokenRequestBody(request),
    headers: {
      "accept": "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
    redirect: "error",
  });
  const body = await readBoundedJson(response);
  const parsed = parseDeviceTokenResponse(body, now);
  if (parsed === null) {
    throw new Error("The device token response was invalid.");
  }
  return parsed;
}
