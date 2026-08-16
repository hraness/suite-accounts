import {
  createSuiteOidcRelyingParty,
  type SuiteOidcRelyingParty,
  type SuiteOidcServerAccountSession,
  type SuiteOidcServerSession,
  type SuiteOidcServerVerifiedEmail,
} from "./oidc-rp.js";
import {
  getSuiteAccountsCurrentConsumerEnvironment,
  isSuiteAccountsLinkedOidcConsumerId,
  type SuiteAccountsOidcConsumerId,
  type SuiteAccountsRemoteEnvironment,
} from "./registry.js";

export type SuiteOidcSurfaceEnvironment = Readonly<{
  NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN?: string | undefined;
  NEXT_PUBLIC_SITE_URL?: string | undefined;
  SUITE_IDENTITY_RECEIPT_KEY_VERSION?: string | undefined;
  SUITE_OIDC_COOKIE_SECRET?: string | undefined;
}>;

export function suiteEnvironmentForConsumerOrigin(
  consumer: SuiteAccountsOidcConsumerId,
  siteUrl: string | undefined,
): SuiteAccountsRemoteEnvironment | null {
  if (siteUrl === undefined) return null;
  return getSuiteAccountsCurrentConsumerEnvironment(
    consumer,
    "production",
  )?.siteUrl === siteUrl
    ? "production"
    : null;
}

function processEnvironment(): SuiteOidcSurfaceEnvironment {
  return {
    NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN:
      process.env.NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    SUITE_IDENTITY_RECEIPT_KEY_VERSION:
      process.env.SUITE_IDENTITY_RECEIPT_KEY_VERSION,
    SUITE_OIDC_COOKIE_SECRET: process.env.SUITE_OIDC_COOKIE_SECRET,
  };
}

export function createSurfaceSuiteRelyingParty(
  consumer: SuiteAccountsOidcConsumerId,
  injectedEnvironment: SuiteOidcSurfaceEnvironment = processEnvironment(),
): SuiteOidcRelyingParty | null {
  const environment = suiteEnvironmentForConsumerOrigin(
    consumer,
    injectedEnvironment.NEXT_PUBLIC_SITE_URL,
  );
  const cookieSecret = injectedEnvironment.SUITE_OIDC_COOKIE_SECRET;
  const receiptKeyVersion = isSuiteAccountsLinkedOidcConsumerId(consumer)
    ? injectedEnvironment.SUITE_IDENTITY_RECEIPT_KEY_VERSION
    : "identity-v1";
  if (
    injectedEnvironment.NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN !== undefined
    ||
    environment === null
    || cookieSecret === undefined
    || receiptKeyVersion === undefined
  ) {
    return null;
  }
  try {
    return createSuiteOidcRelyingParty({
      consumer,
      cookieSecret,
      environment,
      receiptKeyVersion,
    });
  } catch {
    return null;
  }
}

function unavailable(): Response {
  return Response.json(
    {
      error: {
        code: "SUITE_OIDC_UNAVAILABLE",
        message: "Suite sign-in is not configured for this surface.",
        retryable: false,
      },
      schemaVersion: 1,
    },
    { headers: { "cache-control": "no-store" }, status: 503 },
  );
}

export function suiteOidcSurfaceHandler(
  consumer: SuiteAccountsOidcConsumerId,
  options: Readonly<{
    createRelyingParty?: (
      request: Request,
    ) => Pick<SuiteOidcRelyingParty, "handle"> | null;
  }> = {},
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    if (process.env.NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN !== undefined) {
      return unavailable();
    }
    const relyingParty = options.createRelyingParty?.(request)
      ?? createSurfaceSuiteRelyingParty(consumer);
    return relyingParty === null
      ? unavailable()
      : await relyingParty.handle(request);
  };
}

export async function suiteOidcSurfaceServerSession(
  consumer: SuiteAccountsOidcConsumerId,
  request: Request,
  injectedEnvironment?: SuiteOidcSurfaceEnvironment,
): Promise<SuiteOidcServerSession | null> {
  const relyingParty = createSurfaceSuiteRelyingParty(
    consumer,
    injectedEnvironment,
  );
  return relyingParty === null ? null : await relyingParty.serverSession(request);
}

/**
 * Returns the verified server-held account bearer before username onboarding
 * completes. Product surfaces that require a permanent username must continue
 * to use `suiteOidcSurfaceServerSession`.
 */
export async function suiteOidcSurfaceServerAccountSession(
  consumer: SuiteAccountsOidcConsumerId,
  request: Request,
  injectedEnvironment?: SuiteOidcSurfaceEnvironment,
): Promise<SuiteOidcServerAccountSession | null> {
  const relyingParty = createSurfaceSuiteRelyingParty(
    consumer,
    injectedEnvironment,
  );
  return relyingParty === null
    ? null
    : await relyingParty.serverAccountSession(request);
}

/**
 * Returns the live verified email together with the Suite account it belongs
 * to. The email remains a server-only projection and is never copied into the
 * browser session or relying-party cookie.
 */
export async function suiteOidcSurfaceServerVerifiedEmail(
  consumer: SuiteAccountsOidcConsumerId,
  request: Request,
  injectedEnvironment?: SuiteOidcSurfaceEnvironment,
  options: Readonly<{
    createRelyingParty?: (
      request: Request,
    ) => Pick<SuiteOidcRelyingParty, "serverVerifiedEmail"> | null;
  }> = {},
): Promise<SuiteOidcServerVerifiedEmail | null> {
  const relyingParty = options.createRelyingParty?.(request)
    ?? createSurfaceSuiteRelyingParty(consumer, injectedEnvironment);
  return relyingParty === null
    ? null
    : await relyingParty.serverVerifiedEmail(request);
}
