"use client";
// src/auth-client.ts
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
function createSuiteAccountsAuthClient(options = {}) {
  return createAuthClient({
    basePath: options.basePath ?? "/api/auth",
    plugins: [convexClient(), emailOTPClient()]
  });
}
var suiteAccountsAuthClient = createSuiteAccountsAuthClient();
export {
  suiteAccountsAuthClient,
  createSuiteAccountsAuthClient
};
