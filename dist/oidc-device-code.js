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

// src/oidc-device-code.ts
var SUITE_OIDC_DEVICE_CODE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";
var MIN_DEVICE_CODE_INTERVAL_MS = 1000;
var MAX_DEVICE_CODE_INTERVAL_MS = 600000;
var MAX_USER_CODE_LENGTH = 256;
var MAX_DEVICE_CODE_LENGTH = 2048;
var MAX_VERIFICATION_URI_LENGTH = 4096;
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function boundedString(value, minimum, maximum) {
  return typeof value === "string" && value.length >= minimum && value.length <= maximum && !value.includes("\x00");
}
function safeInteger(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function containsControlCharacter(value) {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? -1;
    if (codePoint <= 31 || codePoint === 127)
      return true;
  }
  return false;
}
function normalizeScope(value) {
  if (value === undefined || value === null)
    return null;
  if (typeof value !== "string")
    return null;
  const trimmed = value.trim();
  if (trimmed.length === 0)
    return null;
  if (trimmed.length > 4096 || containsControlCharacter(trimmed))
    return null;
  return trimmed;
}
function absoluteHttpsUri(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_VERIFICATION_URI_LENGTH) {
    return null;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:")
      return null;
    if (url.username !== "" || url.password !== "")
      return null;
    if (url.hash !== "")
      return null;
    return url.href;
  } catch {
    return null;
  }
}
function parseDeviceAuthorizationResponse(value, nowMs) {
  if (!isRecord(value))
    return null;
  const deviceCode = value["device_code"];
  const userCode = value["user_code"];
  const verificationUri = value["verification_uri"];
  const verificationUriComplete = value["verification_uri_complete"];
  const expiresIn = value["expires_in"];
  const interval = value["interval"];
  if (!boundedString(deviceCode, 1, MAX_DEVICE_CODE_LENGTH) || !boundedString(userCode, 1, MAX_USER_CODE_LENGTH) || !boundedString(verificationUri, 1, MAX_VERIFICATION_URI_LENGTH) || !safeInteger(expiresIn) || expiresIn <= 0 || expiresIn > 86400 || !safeInteger(interval) || interval < 1 || interval > MAX_DEVICE_CODE_INTERVAL_MS / 1000) {
    return null;
  }
  const verificationUriCompleteValue = verificationUriComplete === undefined || verificationUriComplete === null ? null : absoluteHttpsUri(verificationUriComplete);
  if (verificationUriComplete !== undefined && verificationUriComplete !== null && verificationUriCompleteValue === null) {
    return null;
  }
  const intervalMs = Math.max(MIN_DEVICE_CODE_INTERVAL_MS, interval * 1000);
  return deepFreeze({
    deviceCode,
    userCode,
    verificationUri,
    verificationUriComplete: verificationUriCompleteValue,
    expiresAtMs: nowMs + expiresIn * 1000,
    intervalMs
  });
}
function parseDeviceTokenResponse(value, nowMs) {
  if (!isRecord(value))
    return null;
  const error = value["error"];
  const errorDescription = value["error_description"];
  if (error !== undefined) {
    if (typeof error !== "string" || error.length === 0 || error.length > 256) {
      return null;
    }
    const normalizedError = normalizeScope(error);
    if (normalizedError === null || normalizedError !== error)
      return null;
    const normalizedDescription = errorDescription === undefined || errorDescription === null ? null : normalizeScope(errorDescription);
    if (errorDescription !== undefined && errorDescription !== null && normalizedDescription === null) {
      return null;
    }
    switch (normalizedError) {
      case "authorization_pending":
        return deepFreeze({ kind: "authorization_pending", intervalMs: 5000 });
      case "slow_down":
        return deepFreeze({ kind: "slow_down", intervalMs: 1e4 });
      case "access_denied":
        return deepFreeze({ kind: "access_denied" });
      case "expired_token":
        return deepFreeze({ kind: "expired_token" });
      default:
        return deepFreeze({
          kind: "error",
          error: normalizedError,
          errorDescription: normalizedDescription
        });
    }
  }
  const accessToken = value["access_token"];
  const tokenType = value["token_type"];
  const expiresIn = value["expires_in"];
  const refreshToken = value["refresh_token"];
  const idToken = value["id_token"];
  const scope = value["scope"];
  if (!boundedString(accessToken, 1, 16384) || !boundedString(tokenType, 1, 64) || !safeInteger(expiresIn) || expiresIn <= 0 || expiresIn > 86400) {
    return null;
  }
  const normalizedRefreshToken = refreshToken === undefined || refreshToken === null ? null : boundedString(refreshToken, 1, 16384) ? refreshToken : null;
  if (refreshToken !== undefined && refreshToken !== null && normalizedRefreshToken === null) {
    return null;
  }
  const normalizedIdToken = idToken === undefined || idToken === null ? null : boundedString(idToken, 1, 16384) ? idToken : null;
  if (idToken !== undefined && idToken !== null && normalizedIdToken === null) {
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
    expiresAtMs: nowMs + expiresIn * 1000,
    refreshToken: normalizedRefreshToken,
    idToken: normalizedIdToken,
    scope: normalizedScope
  });
}
function deviceAuthorizationBody(request) {
  const params = new URLSearchParams;
  params.set("client_id", request.clientId);
  if (request.scopes !== undefined && request.scopes.length > 0) {
    for (const scope of request.scopes) {
      if (typeof scope !== "string" || scope.length === 0 || scope.length > 256 || /\s/u.test(scope) || containsControlCharacter(scope)) {
        throw new Error("Invalid device authorization scope.");
      }
    }
    params.set("scope", request.scopes.join(" "));
  }
  return params.toString();
}
async function readBoundedJson(response) {
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new Error("The device-code response was not application/json.");
  }
  const text = await response.text();
  if (text.length > 64 * 1024) {
    throw new Error("The device-code response body was too large.");
  }
  return JSON.parse(text);
}
async function initiateSuiteOidcDeviceAuthorization(configuration, request, dependencies = {}) {
  const fetcher = dependencies.fetch ?? globalThis.fetch;
  const now = dependencies.now?.().getTime() ?? Date.now();
  const response = await fetcher(configuration.deviceAuthorizationEndpoint, {
    body: deviceAuthorizationBody(request),
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded"
    },
    method: "POST",
    redirect: "error"
  });
  const body = await readBoundedJson(response);
  if (!response.ok) {
    throw new Error("The device authorization request failed.");
  }
  const parsed = parseDeviceAuthorizationResponse(body, now);
  if (parsed === null) {
    throw new Error("The device authorization response was invalid.");
  }
  const tokenRequest = {
    clientId: request.clientId,
    deviceCode: parsed.deviceCode
  };
  return {
    poll: () => pollSuiteOidcDeviceToken(configuration.deviceTokenEndpoint, tokenRequest, {
      ...dependencies.now === undefined ? {} : { now: dependencies.now },
      fetch: fetcher
    }),
    response: parsed
  };
}
function tokenRequestBody(request) {
  const params = new URLSearchParams;
  params.set("grant_type", SUITE_OIDC_DEVICE_CODE_GRANT_TYPE);
  params.set("client_id", request.clientId);
  params.set("device_code", request.deviceCode);
  return params.toString();
}
async function pollSuiteOidcDeviceToken(tokenEndpoint, request, dependencies = {}) {
  const fetcher = dependencies.fetch ?? globalThis.fetch;
  const now = dependencies.now?.().getTime() ?? Date.now();
  const response = await fetcher(tokenEndpoint, {
    body: tokenRequestBody(request),
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded"
    },
    method: "POST",
    redirect: "error"
  });
  const body = await readBoundedJson(response);
  const parsed = parseDeviceTokenResponse(body, now);
  if (parsed === null) {
    throw new Error("The device token response was invalid.");
  }
  return parsed;
}
export {
  pollSuiteOidcDeviceToken,
  parseDeviceTokenResponse,
  parseDeviceAuthorizationResponse,
  initiateSuiteOidcDeviceAuthorization,
  SUITE_OIDC_DEVICE_CODE_GRANT_TYPE
};
