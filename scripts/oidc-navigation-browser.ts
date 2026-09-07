import assert from "node:assert/strict";
import {
  access,
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWK,
} from "jose";
import {
  chromium,
  type Browser,
} from "playwright-core";
import type {
  SuiteOidcRelyingParty,
  SuiteOidcRelyingPartyOptions,
} from "../src/oidc-rp.js";
import { suiteAccountsOidcProviderConfiguration } from "../src/urls.js";

type NavigationEvidence = Readonly<{
  destination: string | null;
  method: string;
  mode: string | null;
  referrer: string | null;
  site: string | null;
}>;

const nowMs = 1_800_000_300_000;
const nowSeconds = Math.floor(nowMs / 1_000);
const accountId = "acct_018f1f7a7a367ccdbd5d706d4dc5c018";
const clientId = "hraness:soundfish:production:v1";
const siteUrl = "https://sound.fish";
const provider = suiteAccountsOidcProviderConfiguration("production");

function navigationEvidence(request: Request): NavigationEvidence {
  return {
    destination: request.headers.get("sec-fetch-dest"),
    method: request.method,
    mode: request.headers.get("sec-fetch-mode"),
    referrer: request.headers.get("referer"),
    site: request.headers.get("sec-fetch-site"),
  };
}

function getSetCookies(response: Response): readonly string[] {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  return headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""];
}

function fetchUrl(input: RequestInfo | URL): string {
  return input instanceof URL
    ? input.href
    : typeof input === "string"
      ? input
      : input.url;
}

function randomSource() {
  let counter = 0;
  return (length: number): Uint8Array => {
    counter += 1;
    return Uint8Array.from(
      { length },
      (_, index) => (counter * 31 + index * 17) % 256,
    );
  };
}

const { privateKey, publicKey } = await generateKeyPair("ES256");
const publicJwk = await exportJWK(publicKey);
const kid = "accounts-es256-browser-1";
const jwk: JWK = { ...publicJwk, alg: "ES256", kid };
let authorizationNonce = "";
let issuedAccessToken = "";
let tokenExchangeCount = 0;
async function idToken(): Promise<string> {
  return await new SignJWT({
    nonce: authorizationNonce,
    profile_complete: true,
    profile_revision: "username-v1",
    suite_account_id: accountId,
    username: "reader",
  })
    .setProtectedHeader({ alg: "ES256", kid })
    .setIssuer(provider.issuer)
    .setAudience(clientId)
    .setSubject("better-auth-browser-user-17")
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + 10 * 60)
    .sign(privateKey);
}

async function accessToken(): Promise<string> {
  return await new SignJWT({
    azp: clientId,
    profile_complete: true,
    profile_revision: "username-v1",
    suite_account_id: accountId,
    suite_client_id: clientId,
    suite_entitlements: {
      catalogRevision: "cclrte-suite-v3",
      expiresAtMs: nowMs + 8 * 60_000,
      features: ["suite.paid", "suite.believer"],
      observedAtMs: nowMs - 1_000,
      projectionRevision: 7,
      version: "suite-entitlements-v1",
    },
    username: "reader",
  })
    .setProtectedHeader({ alg: "ES256", kid })
    .setIssuer(provider.issuer)
    .setAudience([provider.resource, provider.userInfoAudience])
    .setSubject("better-auth-browser-user-17")
    .setIssuedAt(nowSeconds)
    .setNotBefore(nowSeconds)
    .setExpirationTime(nowSeconds + 10 * 60)
    .sign(privateKey);
}

const imported: unknown = await import(pathToFileURL(
  resolve("dist/oidc-rp.js"),
).href);
if (
  typeof imported !== "object"
  || imported === null
  || !("createSuiteOidcRelyingParty" in imported)
  || typeof imported.createSuiteOidcRelyingParty !== "function"
) {
  throw new Error("Missing built OIDC relying party.");
}
const createSuiteOidcRelyingParty = imported.createSuiteOidcRelyingParty as (
  options: SuiteOidcRelyingPartyOptions,
) => SuiteOidcRelyingParty;
const relyingParty = createSuiteOidcRelyingParty({
  consumer: "soundfish",
  cookieSecret: "browser-secret-that-is-at-least-thirty-two-bytes",
  environment: "production",
  fetch: async (input) => {
    const url = fetchUrl(input);
    if (url === provider.discoveryEndpoint) {
      return Response.json({
        authorization_endpoint: provider.authorizationEndpoint,
        code_challenge_methods_supported: ["S256"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        id_token_signing_alg_values_supported: ["ES256"],
        issuer: provider.issuer,
        jwks_uri: provider.jwksEndpoint,
        response_types_supported: ["code"],
        revocation_endpoint: provider.revocationEndpoint,
        token_endpoint: provider.tokenEndpoint,
        token_endpoint_auth_methods_supported: ["none"],
      });
    }
    if (url === provider.jwksEndpoint) return Response.json({ keys: [jwk] });
    if (url === provider.tokenEndpoint) {
      tokenExchangeCount += 1;
      issuedAccessToken = await accessToken();
      return Response.json({
        access_token: issuedAccessToken,
        id_token: await idToken(),
        refresh_token: "browser-refresh-token-value-0001",
        token_type: "Bearer",
      });
    }
    if (url === provider.entitlementReceiptEndpoint) {
      return Response.json({
        entitlements: {
          catalogRevision: "cclrte-suite-v3",
          expiresAtMs: nowMs + 8 * 60_000,
          features: ["suite.paid", "suite.believer"],
          observedAtMs: nowMs - 1_000,
          projectionRevision: 7,
          version: "suite-entitlements-v1",
        },
        environment: "production",
        expiresAtMs: nowMs + 4 * 60_000,
        issuedAtMs: nowMs,
        keyVersion: "v1",
        product: "soundfish",
        signature: "R".repeat(43),
        suiteAccountId: accountId,
        version: "suite-entitlement-receipt-v1",
      });
    }
    if (url === provider.userInfoAudience) {
      return Response.json({
        email: "reader@example.com",
        email_verified: true,
        profile_complete: true,
        profile_revision: "username-v1",
        sub: "better-auth-browser-user-17",
        suite_account_id: accountId,
        suite_client_id: clientId,
        username: "reader",
      });
    }
    throw new Error(`Unexpected provider URL: ${url}`);
  },
  now: () => nowMs,
  randomBytes: randomSource(),
  receiptKeyVersion: "v1",
});

type BrowserTransaction = Readonly<{
  callbackUrl: string;
  nonce: string;
  setCookie: string;
}>;

async function createBrowserTransaction(
  returnTo: string,
  code: string,
): Promise<BrowserTransaction> {
  const started = await relyingParty.start(new Request(
    `${siteUrl}/api/suite-auth/start?return_to=${encodeURIComponent(returnTo)}`,
    { headers: { "sec-fetch-site": "same-origin" } },
  ));
  assert.equal(started.status, 302);
  const authorization = new URL(started.headers.get("location") ?? "");
  const nonce = authorization.searchParams.get("nonce");
  const state = authorization.searchParams.get("state");
  const setCookie = getSetCookies(started)[0];
  assert.ok(nonce !== null && nonce.length > 0);
  assert.ok(state !== null && state.length > 0);
  assert.ok(setCookie !== undefined);
  assert.match(
    setCookie,
    /^__Host-hraness-suite-oidc-transaction=[A-Za-z0-9._-]+; Max-Age=600; Path=\/; HttpOnly; Secure; SameSite=Lax$/u,
  );
  const callbackUrl = new URL(relyingParty.configuration.callbackUrl);
  callbackUrl.searchParams.set("code", code);
  callbackUrl.searchParams.set("state", state);
  return { callbackUrl: callbackUrl.href, nonce, setCookie };
}

const successTransaction = await createBrowserTransaction(
  "/settings?from=oidc",
  "browser-one-time-code",
);
authorizationNonce = successTransaction.nonce;
const providerPage = `${provider.issuer}/suite-accounts-browser-provider`;
const failureProviderPage = `${provider.issuer}/suite-accounts-browser-provider-failure`;

const executable = process.env["CHROMIUM_EXECUTABLE_PATH"] ?? (
  process.platform === "darwin"
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : "/usr/bin/google-chrome"
);
await access(executable);

type CallbackEvidence = Readonly<{
  body: string;
  headers: Readonly<Record<string, string>>;
  navigation: NavigationEvidence;
  status: number;
}>;

const temporary = await mkdtemp(join(tmpdir(), "suite-oidc-navigation-"));
const certificatePath = join(temporary, "certificate.pem");
const keyPath = join(temporary, "key.pem");
const installCookies = new Map<string, string>([
  ["/__suite-oidc-browser/install-success", successTransaction.setCookie],
]);
const callbackEvidence: CallbackEvidence[] = [];
let continuationEvidence: NavigationEvidence | undefined;
let resolvedSession:
  | Awaited<ReturnType<typeof relyingParty.serverSession>>
  | undefined;
let browser: Browser | undefined;
let server: ReturnType<typeof Bun.serve> | undefined;
let lastUrl = "";
const errors: string[] = [];

try {
  const certificate = Bun.spawnSync({
    cmd: [
      process.env["OPENSSL_EXECUTABLE_PATH"] ?? "openssl",
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      keyPath,
      "-out",
      certificatePath,
      "-days",
      "1",
      "-subj",
      "/CN=sound.fish",
      "-addext",
      "subjectAltName=DNS:sound.fish",
    ],
    stderr: "pipe",
    stdout: "ignore",
  });
  if (certificate.exitCode !== 0) {
    throw new Error(
      `Could not create the ephemeral browser certificate: ${
        new TextDecoder().decode(certificate.stderr).trim()
      }`,
    );
  }

  server = Bun.serve({
    fetch: async request => {
      try {
        const url = new URL(request.url);
        const installCookie = installCookies.get(url.pathname);
        if (installCookie !== undefined) {
          return new Response("<!doctype html><p>Transaction installed</p>", {
            headers: {
              "content-security-policy": "default-src 'none'",
              "content-type": "text/html; charset=utf-8",
              "set-cookie": installCookie,
            },
          });
        }
        if (url.pathname === "/api/suite-auth/callback") {
          const response = await relyingParty.callback(request);
          const responseCookies = getSetCookies(response);
          assert.ok(responseCookies.some(cookie =>
            cookie.startsWith("__Host-hraness-suite-oidc-transaction=")
              && cookie.includes("Max-Age=0")
          ));
          assert.equal(
            responseCookies.some(cookie =>
              cookie.startsWith("__Host-hraness-suite-oidc-session=")
            ),
            response.status === 200,
          );
          const responseHeaders = Object.fromEntries(response.headers);
          delete responseHeaders["set-cookie"];
          callbackEvidence.push({
            body: await response.clone().text(),
            headers: responseHeaders,
            navigation: navigationEvidence(request),
            status: response.status,
          });
          return response;
        }
        if (url.pathname === "/settings") {
          continuationEvidence = navigationEvidence(request);
          resolvedSession = await relyingParty.serverSession(request);
          return new Response(
            resolvedSession === null
              ? "<!doctype html><p>Session rejected</p>"
              : "<!doctype html><p>Session resolved</p>",
            {
              headers: { "content-type": "text/html; charset=utf-8" },
              status: resolvedSession === null ? 401 : 200,
            },
          );
        }
        return new Response("Not found", { status: 404 });
      } catch (error) {
        errors.push(error instanceof Error ? error.stack ?? error.message : String(error));
        return new Response("Harness failure", { status: 500 });
      }
    },
    hostname: "127.0.0.1",
    port: 0,
    tls: {
      cert: await readFile(certificatePath),
      key: await readFile(keyPath),
    },
  });

  browser = await chromium.launch({
    args: [
      `--host-resolver-rules=MAP sound.fish 127.0.0.1:${server.port},EXCLUDE 127.0.0.1`,
    ],
    executablePath: executable,
    headless: true,
  });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  page.on("framenavigated", frame => {
    if (frame === page.mainFrame()) lastUrl = frame.url();
  });
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", error => errors.push(error.message));
  page.on("requestfailed", request => {
    errors.push(
      `${request.method()} ${request.url()}: ${
        request.failure()?.errorText ?? "unknown failure"
      }`,
    );
  });
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin !== provider.issuer) {
      await route.continue();
      return;
    }
    if (url.href === providerPage) {
      await route.fulfill({
        body: `<!doctype html><a href="${successTransaction.callbackUrl.replaceAll("&", "&amp;")}">Approve</a>`,
        contentType: "text/html; charset=utf-8",
        status: 200,
      });
      return;
    }
    await route.fulfill({ body: "Not found", status: 404 });
  });

  await page.goto(`${siteUrl}/__suite-oidc-browser/install-success`);
  const installedCookies = await context.cookies(siteUrl);
  assert.deepEqual(
    installedCookies.map(cookie => ({
      httpOnly: cookie.httpOnly,
      name: cookie.name,
      path: cookie.path,
      sameSite: cookie.sameSite,
      secure: cookie.secure,
    })),
    [{
      httpOnly: true,
      name: "__Host-hraness-suite-oidc-transaction",
      path: "/",
      sameSite: "Lax",
      secure: true,
    }],
  );
  await page.goto(providerPage);
  await page.getByRole("link", { name: "Approve" }).click();
  await page.waitForURL(`${siteUrl}/settings?from=oidc`);
  await page.getByText("Session resolved", { exact: true }).waitFor();

  const successCallback = callbackEvidence[0];
  assert.ok(successCallback !== undefined);
  assert.deepEqual(successCallback.navigation, {
    destination: "document",
    method: "GET",
    mode: "navigate",
    referrer: `${provider.issuer}/`,
    site: "cross-site",
  });
  assert.equal(successCallback.status, 200);
  assert.equal(successCallback.headers["cache-control"], "no-store");
  assert.equal(successCallback.headers["referrer-policy"], "no-referrer");
  const continuationNonce = successCallback.headers["content-security-policy"]
    ?.match(/script-src 'nonce-([A-Za-z0-9_-]{32})'$/u)?.[1];
  assert.equal(continuationNonce?.length, 32);
  assert.ok(successCallback.body.includes(
    `<script nonce="${continuationNonce}">location.replace("/settings?from=oidc");</script>`,
  ));
  assert.deepEqual(continuationEvidence, {
    destination: "document",
    method: "GET",
    mode: "navigate",
    referrer: null,
    site: "same-origin",
  });
  assert.deepEqual(resolvedSession, {
    accessToken: issuedAccessToken,
    accessTokenExpiresAtMs: nowMs + 10 * 60_000,
    suiteAccountId: accountId,
    username: "reader",
  });
  const sessionCookies = await context.cookies(siteUrl);
  assert.equal(
    sessionCookies.some(cookie =>
      cookie.name === "__Host-hraness-suite-oidc-transaction"
    ),
    false,
  );
  assert.ok(sessionCookies.some(cookie =>
    cookie.name === "__Host-hraness-suite-oidc-session"
      && cookie.httpOnly
      && cookie.secure
      && cookie.sameSite === "Lax"
  ));
  const previous = await page.goBack();
  assert.ok(previous !== null);
  assert.equal(page.url(), providerPage);

  const failureTransaction = await createBrowserTransaction(
    "/settings?from=failure",
    "browser-code-that-must-not-be-exchanged",
  );
  const invalidCallback = new URL(failureTransaction.callbackUrl);
  invalidCallback.searchParams.set("state", "wrong-state");
  installCookies.set(
    "/__suite-oidc-browser/install-failure",
    failureTransaction.setCookie,
  );
  const failureContext = await browser.newContext({ ignoreHTTPSErrors: true });
  const failurePage = await failureContext.newPage();
  await failurePage.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin !== provider.issuer) {
      await route.continue();
      return;
    }
    if (url.href === failureProviderPage) {
      await route.fulfill({
        body: `<!doctype html><a href="${invalidCallback.href.replaceAll("&", "&amp;")}">Approve invalid callback</a>`,
        contentType: "text/html; charset=utf-8",
        status: 200,
      });
      return;
    }
    await route.fulfill({ body: "Not found", status: 404 });
  });
  await failurePage.goto(`${siteUrl}/__suite-oidc-browser/install-failure`);
  await failurePage.goto(failureProviderPage);
  const failedResponse = failurePage.waitForResponse(response =>
    response.url() === invalidCallback.href
  );
  await failurePage.getByRole("link", { name: "Approve invalid callback" }).click();
  assert.equal((await failedResponse).status(), 400);
  const failedCallback = callbackEvidence[1];
  assert.ok(failedCallback !== undefined);
  assert.deepEqual(failedCallback.navigation, {
    destination: "document",
    method: "GET",
    mode: "navigate",
    referrer: `${provider.issuer}/`,
    site: "cross-site",
  });
  assert.equal(failedCallback.headers["content-security-policy"], undefined);
  assert.equal(failedCallback.headers["content-type"], "application/json; charset=utf-8");
  assert.equal(failedCallback.headers["location"], undefined);
  assert.deepEqual(JSON.parse(failedCallback.body), {
    error: {
      code: "OIDC_CALLBACK_INVALID",
      retryable: false,
    },
    schemaVersion: 1,
  });
  assert.deepEqual(await failureContext.cookies(siteUrl), []);
  await failureContext.close();

  assert.equal(callbackEvidence.length, 2);
  assert.equal(tokenExchangeCount, 1);
  assert.deepEqual(errors, []);
  console.log(
    "OIDC navigation browser verification passed: real cross-site callback, nonce continuation, same-origin session resolution, history replacement, and fail-closed callback.",
  );
} catch (error) {
  console.error(JSON.stringify({
    callbackEvidence: callbackEvidence.map(evidence => ({
      headerNames: Object.keys(evidence.headers).toSorted(),
      navigation: evidence.navigation,
      status: evidence.status,
    })),
    continuationEvidence,
    errors,
    lastUrl,
  }, null, 2));
  throw error;
} finally {
  await browser?.close();
  await server?.stop(true);
  await rm(temporary, { force: true, recursive: true });
}
