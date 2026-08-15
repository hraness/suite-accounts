"use client";

import {
  ConvexProviderWithAuth,
  ConvexReactClient,
  useConvexAuth,
} from "convex/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

import {
  createSuiteAccountsAuthClient,
  type SuiteAccountsAuthClient,
} from "./auth-client.js";
import type {
  ReadySuiteAccountsPublicConfig,
  SuiteAccountsPublicConfig,
} from "./public-config.js";

export type SuiteAccountsAuthentication =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "signed_in" }>
  | Readonly<{ kind: "signed_out" }>
  | Readonly<{ kind: "unavailable"; message: string }>;

export type SuiteAccountsReactContext = Readonly<{
  authClient: SuiteAccountsAuthClient | null;
  authentication: SuiteAccountsAuthentication;
  client: ConvexReactClient | null;
  config: SuiteAccountsPublicConfig;
}>;

const SuiteAccountsContext =
  createContext<SuiteAccountsReactContext | undefined>(undefined);

function unavailableMessage(config: SuiteAccountsPublicConfig): string {
  if (config.kind === "invalid") return config.message;
  if (config.kind === "unavailable") return config.message;
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
  config,
}: Readonly<{
  authClient: SuiteAccountsAuthClient;
  children: ReactNode;
  client: ConvexReactClient;
  config: ReadySuiteAccountsPublicConfig;
}>) {
  const convexAuth = useConvexAuth();
  const authentication: SuiteAccountsAuthentication = convexAuth.isLoading
    ? { kind: "loading" }
    : convexAuth.isAuthenticated
      ? { kind: "signed_in" }
      : { kind: "signed_out" };
  const value = useMemo(
    () => ({ authClient, authentication, client, config }),
    [authClient, authentication, client, config],
  );
  return (
    <SuiteAccountsContext.Provider value={value}>
      {children}
    </SuiteAccountsContext.Provider>
  );
}

function ReadySuiteAccountsProvider({
  children,
  config,
}: Readonly<{
  children: ReactNode;
  config: Extract<
    ReadySuiteAccountsPublicConfig,
    { authMode: "authority" | "proxy" }
  >;
}>) {
  const authClient = useMemo(
    () => createSuiteAccountsAuthClient({ basePath: config.authBasePath }),
    [config.authBasePath],
  );
  const client = useMemo(
    () => new ConvexReactClient(config.convexUrl),
    [config.convexUrl],
  );
  const { data: session, isPending } = authClient.useSession();
  const sessionId = session?.session.id;
  const fetchAccessToken = useCallback(async () => {
    try {
      const result = await authClient.convex.token({
        fetchOptions: { throw: false },
      });
      return result.data?.token ?? null;
    } catch {
      return null;
    }
  }, [authClient]);
  const useSuiteAuth = useCallback(
    () => ({
      fetchAccessToken,
      isAuthenticated: sessionId !== undefined,
      isLoading: isPending,
    }),
    [fetchAccessToken, isPending, sessionId],
  );

  useEffect(() => {
    return () => {
      void client.close();
    };
  }, [client]);

  return (
    <ConvexProviderWithAuth client={client} useAuth={useSuiteAuth}>
      <SuiteAccountsContextBridge
        authClient={authClient}
        client={client}
        config={config}
      >
        {children}
      </SuiteAccountsContextBridge>
    </ConvexProviderWithAuth>
  );
}

/**
 * Mount this provider only around the suite-owned route or component subtree.
 *
 * Descendant Convex hooks intentionally use the central Accounts deployment.
 * Product-local hooks and providers must remain outside this subtree.
 */
export function SuiteAccountsProvider({
  children,
  config,
}: Readonly<{
  children: ReactNode;
  config: SuiteAccountsPublicConfig;
}>) {
  if (
    config.kind === "ready"
    && (config.authMode === "authority" || config.authMode === "proxy")
  ) {
    return (
      <ReadySuiteAccountsProvider config={config}>
        {children}
      </ReadySuiteAccountsProvider>
    );
  }
  const value: SuiteAccountsReactContext = {
    authClient: null,
    authentication: {
      kind: "unavailable",
      message: unavailableMessage(config),
    },
    client: null,
    config,
  };
  return (
    <SuiteAccountsContext.Provider value={value}>
      {children}
    </SuiteAccountsContext.Provider>
  );
}

export function useSuiteAccounts(): SuiteAccountsReactContext {
  const value = useContext(SuiteAccountsContext);
  if (value === undefined) {
    throw new Error(
      "useSuiteAccounts must be used inside SuiteAccountsProvider.",
    );
  }
  return value;
}

export function useSuiteAccountsClient(): ConvexReactClient | null {
  return useSuiteAccounts().client;
}

export function useSuiteAccountsAuthentication():
SuiteAccountsAuthentication {
  return useSuiteAccounts().authentication;
}
