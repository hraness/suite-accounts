"use client";

import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export type SuiteAccountsAuthClientOptions = Readonly<{
  basePath?: "/api/auth" | "/api/suite-auth";
}>;

/**
 * Construct the frozen Better Auth compatibility client used by the Accounts
 * authority and its registered proxy.
 *
 * @deprecated New OAuth consumers use the validated client configuration and
 * the OIDC relying-party boundary. Do not add another provider plugin here.
 */
export function createSuiteAccountsAuthClient(
  options: SuiteAccountsAuthClientOptions = {},
) {
  return createAuthClient({
    basePath: options.basePath ?? "/api/auth",
    plugins: [convexClient(), emailOTPClient()],
  });
}

export type SuiteAccountsAuthClient =
  ReturnType<typeof createSuiteAccountsAuthClient>;

/**
 * The default same-origin `/api/auth` client used by Accounts and registered proxies.
 *
 * Products that retain a local `/api/auth` authority create one client with
 * `createSuiteAccountsAuthClient({ basePath: "/api/suite-auth" })`.
 */
/** @deprecated Retained for the frozen authority and proxy React surface. */
export const suiteAccountsAuthClient = createSuiteAccountsAuthClient();
