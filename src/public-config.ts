import { parseConvexDeployment } from "./convex-url.js";
import { deepFreeze } from "./immutable.js";

import {
  getSuiteAccountsConsumer,
  getSuiteAccountsConsumerEnvironment,
  getSuiteAccountsDeployment,
  type SuiteAccountsConsumerId,
  type SuiteAccountsEnvironment,
} from "./registry.js";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "[::1]", "localhost"]);

export const SUITE_ACCOUNTS_PUBLIC_ENVIRONMENT_KEYS = deepFreeze([
  "NEXT_PUBLIC_ACCOUNTS_CONVEX_URL",
  "NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL",
  "NEXT_PUBLIC_SITE_URL",
] as const);

export type SuiteAccountsPublicEnvironmentKey =
  (typeof SUITE_ACCOUNTS_PUBLIC_ENVIRONMENT_KEYS)[number];

export type SuiteAccountsPublicEnvironment = Readonly<{
  NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN?: string | undefined;
  NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL?: string | undefined;
  NEXT_PUBLIC_ACCOUNTS_CONVEX_URL?: string | undefined;
  NEXT_PUBLIC_SITE_URL?: string | undefined;
}>;

type ReadySuiteAccountsPublicConfigBase = Readonly<{
  canonicalProductOrigin: string;
  consumer: SuiteAccountsConsumerId;
  convexSiteUrl: string;
  convexUrl: string;
  environment: SuiteAccountsEnvironment;
  kind: "ready";
  siteUrl: string;
  surfaceOrigin: string;
}>;

export type ReadySuiteAccountsAuthConfiguration =
    | Readonly<{
        authBasePath: "/api/auth";
        authMode: "authority" | "proxy";
      }>
    | Readonly<{
        authBasePath: "/api/suite-auth";
        authMode: "oidc-rp";
      }>;

export type ReadySuiteAccountsPublicConfig =
  ReadySuiteAccountsPublicConfigBase
  & ReadySuiteAccountsAuthConfiguration;

export type SuiteAccountsPublicConfig =
  | ReadySuiteAccountsPublicConfig
  | Readonly<{ kind: "invalid"; message: string }>
  | Readonly<{
      kind: "missing";
      missing: readonly SuiteAccountsPublicEnvironmentKey[];
    }>
  | Readonly<{
      canonicalProductOrigin: string;
      environment: "production";
      kind: "unavailable";
      message: string;
      surfaceOrigin: string;
    }>;

function parseOrigin(
  value: string,
  field: SuiteAccountsPublicEnvironmentKey | "NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN",
): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${field} must be an absolute URL.`);
  }
  const loopback = LOOPBACK_HOSTS.has(url.hostname);
  if (url.protocol !== "https:" && !(loopback && url.protocol === "http:")) {
    throw new Error(
      `${field} must use HTTPS (HTTP is allowed only on loopback).`,
    );
  }
  if (
    url.username !== ""
    || url.password !== ""
    || url.search !== ""
    || url.hash !== ""
    || (url.pathname !== "" && url.pathname !== "/")
  ) {
    throw new Error(`${field} must be a credential-free origin.`);
  }
  return new URL(url.origin);
}

function readyRemoteConfig(
  consumer: SuiteAccountsConsumerId,
  siteUrl: string,
  convexUrl: string,
  convexSiteUrl: string,
): ReadySuiteAccountsPublicConfig | null {
  const registration = getSuiteAccountsConsumer(consumer);
  const environment = "production" as const;
  const consumerEnvironment = getSuiteAccountsConsumerEnvironment(
    consumer,
    environment,
  );
  const deployment = getSuiteAccountsDeployment(environment);
  if (
    consumerEnvironment?.siteUrl === siteUrl
    && deployment.convexUrl === convexUrl
    && deployment.convexSiteUrl === convexSiteUrl
  ) {
    return deepFreeze({
      ...publicAuthConfiguration(registration.auth),
      canonicalProductOrigin: siteUrl,
      consumer,
      convexSiteUrl,
      convexUrl,
      environment,
      kind: "ready",
      siteUrl,
      surfaceOrigin: siteUrl,
    });
  }
  return null;
}

function publicAuthConfiguration(
  auth: ReturnType<typeof getSuiteAccountsConsumer>["auth"],
): ReadySuiteAccountsAuthConfiguration {
  switch (auth.kind) {
    case "authority":
      return { authBasePath: auth.basePath, authMode: auth.kind };
    case "oidc-rp":
      return { authBasePath: auth.basePath, authMode: auth.kind };
    case "proxy":
      return { authBasePath: auth.basePath, authMode: auth.kind };
  }
}

export function parseSuiteAccountsPublicConfig(
  consumer: SuiteAccountsConsumerId,
  environment: SuiteAccountsPublicEnvironment,
): Exclude<SuiteAccountsPublicConfig, { kind: "invalid" }> {
  const missing = SUITE_ACCOUNTS_PUBLIC_ENVIRONMENT_KEYS.filter((name) => {
    const value = environment[name];
    return typeof value !== "string" || value.trim() === "";
  });
  if (missing.length > 0) return deepFreeze({ kind: "missing", missing });

  const site = parseOrigin(
    environment.NEXT_PUBLIC_SITE_URL!,
    "NEXT_PUBLIC_SITE_URL",
  );
  const convexSite = parseOrigin(
    environment.NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL!,
    "NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL",
  );
  const deployment = parseConvexDeployment(
    environment.NEXT_PUBLIC_ACCOUNTS_CONVEX_URL,
  );
  if (deployment.kind !== "ready") {
    throw new Error(
      deployment.kind === "invalid"
        ? `NEXT_PUBLIC_ACCOUNTS_CONVEX_URL is invalid: ${deployment.message}`
        : "NEXT_PUBLIC_ACCOUNTS_CONVEX_URL is required.",
    );
  }
  const convex = parseOrigin(
    deployment.url,
    "NEXT_PUBLIC_ACCOUNTS_CONVEX_URL",
  );
  const loopback = [site, convex, convexSite].map(url =>
    LOOPBACK_HOSTS.has(url.hostname)
  );
  if (loopback.every(Boolean)) {
    if (
      deployment.transport !== "local"
      || site.hostname !== convex.hostname
      || site.hostname !== convexSite.hostname
    ) {
      throw new Error(
        "Local consumer and Accounts endpoints must use the same loopback host.",
      );
    }
    const registration = getSuiteAccountsConsumer(consumer);
    return deepFreeze({
      ...publicAuthConfiguration(registration.auth),
      canonicalProductOrigin: site.origin,
      consumer,
      convexSiteUrl: convexSite.origin,
      convexUrl: convex.origin,
      environment: "local",
      kind: "ready",
      siteUrl: site.origin,
      surfaceOrigin: site.origin,
    });
  }
  if (loopback.some(Boolean)) {
    throw new Error(
      "Consumer and Accounts endpoints cannot mix local and remote environments.",
    );
  }
  const previewSurfaceValue = environment.NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN;
  if (previewSurfaceValue !== undefined) {
    const previewSurface = parseOrigin(
      previewSurfaceValue,
      "NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN",
    );
    if (!previewSurface.hostname.endsWith(".vercel.app")) {
      throw new Error(
        "NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN must use a generated .vercel.app origin.",
      );
    }
    const production = readyRemoteConfig(
      consumer,
      site.origin,
      convex.origin,
      convexSite.origin,
    );
    if (production === null) {
      throw new Error(
        `${getSuiteAccountsConsumer(consumer).displayName} and Accounts endpoints `
          + "do not match the production deployment.",
      );
    }
    return deepFreeze({
      canonicalProductOrigin: site.origin,
      environment: "production",
      kind: "unavailable",
      message: "Suite authentication is unavailable on generated Vercel Preview origins.",
      surfaceOrigin: previewSurface.origin,
    });
  }
  const remote = readyRemoteConfig(
    consumer,
    site.origin,
    convex.origin,
    convexSite.origin,
  );
  if (remote !== null) return remote;
  throw new Error(
    `${getSuiteAccountsConsumer(consumer).displayName} and Accounts endpoints `
      + "do not match an owned deployment environment.",
  );
}

export function suiteAccountsPublicConfigFromEnvironment(
  consumer: SuiteAccountsConsumerId,
  environment: SuiteAccountsPublicEnvironment = {
    NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN:
      process.env.NEXT_PUBLIC_VERCEL_SURFACE_ORIGIN,
    NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL:
      process.env.NEXT_PUBLIC_ACCOUNTS_CONVEX_SITE_URL,
    NEXT_PUBLIC_ACCOUNTS_CONVEX_URL:
      process.env.NEXT_PUBLIC_ACCOUNTS_CONVEX_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
): SuiteAccountsPublicConfig {
  try {
    return parseSuiteAccountsPublicConfig(consumer, environment);
  } catch (error) {
    return deepFreeze({
      kind: "invalid",
      message: error instanceof Error
        ? error.message
        : "Suite Accounts configuration is invalid.",
    });
  }
}
