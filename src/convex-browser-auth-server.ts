import {
  createECDH,
  createPrivateKey,
  createPublicKey,
  type JsonWebKey,
  type KeyObject,
} from "node:crypto";

import {
  parseSuiteAccountId,
  type SuiteAccountId,
} from "./identity/identifiers.js";
import {
  parseSuiteUsername,
  type SuiteUsername,
} from "./identity/usernames.js";
import { SignJWT } from "jose";

import {
  SUITE_CONVEX_BROWSER_PARENT_REFRESH_WINDOW_MS,
  SUITE_CONVEX_BROWSER_TOKEN_TTL_MS,
  SUITE_CONVEX_BROWSER_TOKEN_USE,
  suiteConvexBrowserConfiguration,
  type SuiteConvexBrowserConfiguration,
} from "./convex-browser-auth.js";
import { deepFreeze } from "./immutable.js";
import type { SuiteOidcServerSession } from "./oidc-rp.js";

const KEYRING_VERSION = "suite-convex-browser-keyring-v1" as const;
const TOKEN_RESPONSE_VERSION =
  "suite-convex-browser-token-response-v1" as const;
const MAXIMUM_KEY_COUNT = 4;

export type SuiteConvexBrowserPublicJwk = Readonly<{
  alg: "ES256";
  crv: "P-256";
  kid: string;
  kty: "EC";
  use: "sig";
  x: string;
  y: string;
}>;

export type SuiteConvexBrowserKeyring = Readonly<{
  activeKid: string;
  consumer: SuiteConvexBrowserConfiguration["consumer"];
  environment: SuiteConvexBrowserConfiguration["environment"];
  jwks: Readonly<{ keys: readonly SuiteConvexBrowserPublicJwk[] }>;
  version: typeof KEYRING_VERSION;
}>;

export type SuiteConvexBrowserParentSession = Readonly<{
  accessTokenExpiresAtMs: number;
  suiteAccountId: SuiteAccountId;
  username: SuiteUsername;
}>;

export type SuiteConvexBrowserTokenResult =
  | Readonly<{ kind: "refresh_required" }>
  | Readonly<{
      expiresAtMs: number;
      kind: "token";
      token: string;
      version: typeof TOKEN_RESPONSE_VERSION;
    }>;

export type SuiteConvexBrowserTokenSigner = Readonly<{
  sign(
    session: SuiteConvexBrowserParentSession,
  ): Promise<SuiteConvexBrowserTokenResult>;
}>;

export type SuiteConvexBrowserAuthHandlers = Readonly<{
  jwks(request: Request): Promise<Response>;
  token(request: Request): Promise<Response>;
}>;

export type CreateSuiteConvexBrowserAuthHandlersOptions = Readonly<{
  configuration: SuiteConvexBrowserConfiguration;
  keyring: SuiteConvexBrowserKeyring;
  now?: () => number;
  serverSession(request: Request): Promise<SuiteOidcServerSession | null>;
}>;

const activePrivateKeys = new WeakMap<SuiteConvexBrowserKeyring, KeyObject>();

const CONFIGURATION_KEYS = deepFreeze([
  "audience",
  "clientId",
  "consumer",
  "environment",
  "issuer",
  "jwksEndpoint",
  "siteUrl",
  "suiteIssuer",
  "tokenEndpoint",
] as const satisfies readonly (keyof SuiteConvexBrowserConfiguration)[]);

function authoritativeConfiguration(
  configuration: SuiteConvexBrowserConfiguration,
): SuiteConvexBrowserConfiguration {
  const expected = suiteConvexBrowserConfiguration(
    configuration.consumer,
    configuration.environment,
  );
  if (
    Object.keys(configuration).length !== CONFIGURATION_KEYS.length
    || CONFIGURATION_KEYS.some(key => configuration[key] !== expected[key])
  ) {
    throw new Error("The Convex browser configuration does not match the registry.");
  }
  return expected;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const keys = Object.keys(value);
  const accepted = new Set([...required, ...optional]);
  return required.every(key => Object.hasOwn(value, key))
    && keys.every(key => accepted.has(key));
}

function canonicalCoordinate(value: unknown): value is string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43}$/u.test(value)) {
    return false;
  }
  try {
    const bytes = Buffer.from(value, "base64url");
    return bytes.byteLength === 32 && bytes.toString("base64url") === value;
  } catch {
    return false;
  }
}

function canonicalKid(value: unknown): value is string {
  return typeof value === "string"
    && /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,63})$/u.test(value);
}

function publicJwk(
  value: Record<string, unknown>,
): SuiteConvexBrowserPublicJwk | null {
  if (
    !exactKeys(
      value,
      ["alg", "crv", "kid", "kty", "use", "x", "y"],
      ["d"],
    )
    || value["alg"] !== "ES256"
    || value["crv"] !== "P-256"
    || !canonicalKid(value["kid"])
    || value["kty"] !== "EC"
    || value["use"] !== "sig"
    || !canonicalCoordinate(value["x"])
    || !canonicalCoordinate(value["y"])
    || (value["d"] !== undefined && !canonicalCoordinate(value["d"]))
  ) {
    return null;
  }
  return {
    alg: "ES256",
    crv: "P-256",
    kid: value["kid"],
    kty: "EC",
    use: "sig",
    x: value["x"],
    y: value["y"],
  };
}

function nodeJwk(
  key: SuiteConvexBrowserPublicJwk,
  privateCoordinate?: string,
): JsonWebKey {
  return {
    alg: key.alg,
    crv: key.crv,
    ...(privateCoordinate === undefined ? {} : { d: privateCoordinate }),
    key_ops: privateCoordinate === undefined ? ["verify"] : ["sign"],
    kid: key.kid,
    kty: key.kty,
    use: key.use,
    x: key.x,
    y: key.y,
  };
}

function validPublicKey(key: SuiteConvexBrowserPublicJwk): boolean {
  try {
    const imported = createPublicKey({ format: "jwk", key: nodeJwk(key) });
    return imported.asymmetricKeyType === "ec"
      && imported.asymmetricKeyDetails?.namedCurve === "prime256v1";
  } catch {
    return false;
  }
}

function activePrivateKey(
  key: SuiteConvexBrowserPublicJwk,
  privateCoordinate: string,
): KeyObject | null {
  try {
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(privateCoordinate, "base64url"));
    const derivedPoint = ecdh.getPublicKey(undefined, "uncompressed");
    if (
      derivedPoint.byteLength !== 65
      || derivedPoint[0] !== 4
      || derivedPoint.subarray(1, 33).toString("base64url") !== key.x
      || derivedPoint.subarray(33, 65).toString("base64url") !== key.y
    ) {
      return null;
    }
    const imported = createPrivateKey({
      format: "jwk",
      key: nodeJwk(key, privateCoordinate),
    });
    if (
      imported.asymmetricKeyType !== "ec"
      || imported.asymmetricKeyDetails?.namedCurve !== "prime256v1"
    ) {
      return null;
    }
    const derived = createPublicKey(imported).export({ format: "jwk" });
    return derived.kty === "EC"
        && derived.crv === "P-256"
        && derived.x === key.x
        && derived.y === key.y
      ? imported
      : null;
  } catch {
    return null;
  }
}

/**
 * Parse an environment-bound keyring without retaining private JWK material in
 * the returned serializable object. Retiring entries may be public-only; the
 * active entry must carry a matching private coordinate.
 */
export function parseSuiteConvexBrowserKeyring(
  value: unknown,
  configuration: SuiteConvexBrowserConfiguration,
): SuiteConvexBrowserKeyring | null {
  const authoritative = authoritativeConfiguration(configuration);
  if (
    !isRecord(value)
    || !exactKeys(
      value,
      ["activeKid", "consumer", "environment", "keys", "version"],
    )
    || value["version"] !== KEYRING_VERSION
    || value["consumer"] !== authoritative.consumer
    || value["environment"] !== authoritative.environment
    || !canonicalKid(value["activeKid"])
    || !Array.isArray(value["keys"])
    || value["keys"].length < 1
    || value["keys"].length > MAXIMUM_KEY_COUNT
  ) {
    return null;
  }
  const seen = new Set<string>();
  const parsed: Array<Readonly<{
    privateCoordinate: string | null;
    publicKey: SuiteConvexBrowserPublicJwk;
  }>> = [];
  for (const candidate of value["keys"]) {
    if (!isRecord(candidate)) return null;
    const publicKey = publicJwk(candidate);
    if (
      publicKey === null
      || seen.has(publicKey.kid)
      || !validPublicKey(publicKey)
    ) {
      return null;
    }
    seen.add(publicKey.kid);
    parsed.push({
      privateCoordinate: typeof candidate["d"] === "string"
        ? candidate["d"]
        : null,
      publicKey,
    });
  }
  const active = parsed.find(key => key.publicKey.kid === value["activeKid"]);
  if (active?.privateCoordinate === null || active === undefined) return null;
  const privateKey = activePrivateKey(
    active.publicKey,
    active.privateCoordinate,
  );
  if (privateKey === null) return null;
  const ordered = parsed
    .map(key => key.publicKey)
    .sort((left, right) => {
      if (left.kid === value["activeKid"]) return -1;
      if (right.kid === value["activeKid"]) return 1;
      return left.kid.localeCompare(right.kid);
    });
  const keyring: SuiteConvexBrowserKeyring = deepFreeze({
    activeKid: value["activeKid"],
    consumer: authoritative.consumer,
    environment: authoritative.environment,
    jwks: { keys: ordered },
    version: KEYRING_VERSION,
  });
  activePrivateKeys.set(keyring, privateKey);
  return keyring;
}

function safeTimestamp(value: unknown): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= 0;
}

export function createSuiteConvexBrowserTokenSigner(
  configuration: SuiteConvexBrowserConfiguration,
  keyring: SuiteConvexBrowserKeyring,
  now: () => number = Date.now,
): SuiteConvexBrowserTokenSigner {
  const authoritative = authoritativeConfiguration(configuration);
  if (
    keyring.consumer !== authoritative.consumer
    || keyring.environment !== authoritative.environment
  ) {
    throw new Error("The Convex browser keyring environment does not match.");
  }
  const privateKey = activePrivateKeys.get(keyring);
  if (privateKey === undefined) {
    throw new Error("The Convex browser keyring was not parsed by this module.");
  }
  return Object.freeze({
    async sign(session) {
      const nowMs = now();
      const suiteAccountId = parseSuiteAccountId(session.suiteAccountId);
      const username = parseSuiteUsername(session.username);
      if (
        !safeTimestamp(nowMs)
        || !safeTimestamp(session.accessTokenExpiresAtMs)
        || !suiteAccountId.ok
        || !username.ok
      ) {
        throw new Error("The parent suite session is invalid.");
      }
      if (
        session.accessTokenExpiresAtMs - nowMs
          < SUITE_CONVEX_BROWSER_PARENT_REFRESH_WINDOW_MS
      ) {
        return { kind: "refresh_required" };
      }
      const issuedAtSeconds = Math.floor(nowMs / 1_000);
      const expiresAtSeconds = Math.min(
        issuedAtSeconds + Math.floor(SUITE_CONVEX_BROWSER_TOKEN_TTL_MS / 1_000),
        Math.floor(session.accessTokenExpiresAtMs / 1_000),
      );
      if (expiresAtSeconds <= issuedAtSeconds) {
        return { kind: "refresh_required" };
      }
      const token = await new SignJWT({
        profile_complete: true,
        profile_revision: "username-v1",
        suite_account_id: suiteAccountId.value,
        suite_client_id: authoritative.clientId,
        suite_issuer: authoritative.suiteIssuer,
        token_use: SUITE_CONVEX_BROWSER_TOKEN_USE,
        username: username.value,
      })
        .setProtectedHeader({ alg: "ES256", kid: keyring.activeKid, typ: "JWT" })
        .setIssuer(authoritative.issuer)
        .setAudience(authoritative.audience)
        .setSubject(suiteAccountId.value)
        .setIssuedAt(issuedAtSeconds)
        .setNotBefore(issuedAtSeconds)
        .setExpirationTime(expiresAtSeconds)
        .sign(privateKey);
      return {
        expiresAtMs: expiresAtSeconds * 1_000,
        kind: "token",
        token,
        version: TOKEN_RESPONSE_VERSION,
      };
    },
  });
}

function noStoreJson(value: unknown, status = 200): Response {
  return Response.json(value, {
    headers: {
      "cache-control": "no-store",
      "content-security-policy": "default-src 'none'",
      pragma: "no-cache",
      "x-content-type-options": "nosniff",
    },
    status,
  });
}

function exactEndpointRequest(
  request: Request,
  endpoint: string,
  method: "GET" | "POST",
): boolean {
  let incoming: URL;
  let expected: URL;
  try {
    incoming = new URL(request.url);
    expected = new URL(endpoint);
  } catch {
    return false;
  }
  return request.method === method
    && incoming.origin === expected.origin
    && incoming.pathname === expected.pathname
    && incoming.search === ""
    && incoming.username === ""
    && incoming.password === ""
    && request.body === null;
}

function exactTokenRequest(
  request: Request,
  configuration: SuiteConvexBrowserConfiguration,
): boolean {
  if (!exactEndpointRequest(request, configuration.tokenEndpoint, "POST")) {
    return false;
  }
  const contentLength = request.headers.get("content-length");
  const fetchDestination = request.headers.get("sec-fetch-dest");
  const fetchMode = request.headers.get("sec-fetch-mode");
  const fetchSite = request.headers.get("sec-fetch-site");
  return request.headers.get("origin") === configuration.siteUrl
    && (contentLength === null || contentLength === "0")
    && request.headers.get("content-type") === null
    && (fetchDestination === null || fetchDestination === "empty")
    && (fetchMode === null || fetchMode === "cors" || fetchMode === "same-origin")
    && (fetchSite === null || fetchSite === "same-origin")
    && request.headers.get("sec-fetch-user") === null;
}

/** Create exact product token and public-key route handlers. */
export function createSuiteConvexBrowserAuthHandlers(
  options: CreateSuiteConvexBrowserAuthHandlersOptions,
): SuiteConvexBrowserAuthHandlers {
  const configuration = authoritativeConfiguration(options.configuration);
  const keyring = options.keyring;
  const serverSession = options.serverSession;
  const signer = createSuiteConvexBrowserTokenSigner(
    configuration,
    keyring,
    options.now,
  );
  return Object.freeze({
    jwks: request => Promise.resolve(
      exactEndpointRequest(
        request,
        configuration.jwksEndpoint,
        "GET",
      )
        ? noStoreJson(keyring.jwks)
        : noStoreJson({ kind: "request_rejected" }, 403),
    ),
    token: async request => {
      if (!exactTokenRequest(request, configuration)) {
        return noStoreJson({ kind: "request_rejected" }, 403);
      }
      const session = await serverSession(request);
      if (session === null) {
        return noStoreJson({ kind: "signed_out" }, 401);
      }
      let result: SuiteConvexBrowserTokenResult;
      try {
        result = await signer.sign({
          accessTokenExpiresAtMs: session.accessTokenExpiresAtMs,
          suiteAccountId: session.suiteAccountId,
          username: session.username,
        });
      } catch {
        return noStoreJson({ kind: "signed_out" }, 401);
      }
      return result.kind === "refresh_required"
        ? noStoreJson(result, 409)
        : noStoreJson(result);
    },
  });
}
