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

// src/react.tsx
import {
  ConvexProviderWithAuth,
  ConvexReactClient,
  useConvexAuth
} from "convex/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo
} from "react";
import { jsx } from "react/jsx-runtime";
var SuiteAccountsContext = createContext(undefined);
function unavailableMessage(config) {
  if (config.kind === "invalid")
    return config.message;
  if (config.kind === "unavailable")
    return config.message;
  if (config.kind === "missing") {
    return `Missing suite Accounts configuration: ${config.missing.join(", ")}.`;
  }
  if (config.authMode === "oidc-rp") {
    return "This product uses the suite OAuth relying-party session.";
  }
  return "Suite Accounts are unavailable.";
}
function SuiteAccountsContextBridge({
  authClient,
  children,
  client,
  config
}) {
  const convexAuth = useConvexAuth();
  const authentication = convexAuth.isLoading ? { kind: "loading" } : convexAuth.isAuthenticated ? { kind: "signed_in" } : { kind: "signed_out" };
  const value = useMemo(() => ({ authClient, authentication, client, config }), [authClient, authentication, client, config]);
  return /* @__PURE__ */ jsx(SuiteAccountsContext.Provider, {
    value,
    children
  });
}
function ReadySuiteAccountsProvider({
  children,
  config
}) {
  const authClient = useMemo(() => createSuiteAccountsAuthClient({ basePath: config.authBasePath }), [config.authBasePath]);
  const client = useMemo(() => new ConvexReactClient(config.convexUrl), [config.convexUrl]);
  const { data: session, isPending } = authClient.useSession();
  const sessionId = session?.session.id;
  const fetchAccessToken = useCallback(async () => {
    try {
      const result = await authClient.convex.token({
        fetchOptions: { throw: false }
      });
      return result.data?.token ?? null;
    } catch {
      return null;
    }
  }, [authClient]);
  const useSuiteAuth = useCallback(() => ({
    fetchAccessToken,
    isAuthenticated: sessionId !== undefined,
    isLoading: isPending
  }), [fetchAccessToken, isPending, sessionId]);
  useEffect(() => {
    return () => {
      client.close();
    };
  }, [client]);
  return /* @__PURE__ */ jsx(ConvexProviderWithAuth, {
    client,
    useAuth: useSuiteAuth,
    children: /* @__PURE__ */ jsx(SuiteAccountsContextBridge, {
      authClient,
      client,
      config,
      children
    })
  });
}
function SuiteAccountsProvider({
  children,
  config
}) {
  if (config.kind === "ready" && (config.authMode === "authority" || config.authMode === "proxy")) {
    return /* @__PURE__ */ jsx(ReadySuiteAccountsProvider, {
      config,
      children
    });
  }
  const value = {
    authClient: null,
    authentication: {
      kind: "unavailable",
      message: unavailableMessage(config)
    },
    client: null,
    config
  };
  return /* @__PURE__ */ jsx(SuiteAccountsContext.Provider, {
    value,
    children
  });
}
function useSuiteAccounts() {
  const value = useContext(SuiteAccountsContext);
  if (value === undefined) {
    throw new Error("useSuiteAccounts must be used inside SuiteAccountsProvider.");
  }
  return value;
}
function useSuiteAccountsClient() {
  return useSuiteAccounts().client;
}
function useSuiteAccountsAuthentication() {
  return useSuiteAccounts().authentication;
}
export {
  useSuiteAccountsClient,
  useSuiteAccountsAuthentication,
  useSuiteAccounts,
  SuiteAccountsProvider
};
