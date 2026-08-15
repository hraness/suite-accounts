import { describe, expect, test } from "bun:test";
import {
  ConvexProvider,
  ConvexReactClient,
  useConvex,
} from "convex/react";
import { renderToString } from "react-dom/server";

import type { ReadySuiteAccountsPublicConfig } from "./public-config";
import {
  SuiteAccountsProvider,
  useSuiteAccountsClient,
} from "./react";

const config = {
  authBasePath: "/api/auth",
  authMode: "proxy",
  canonicalProductOrigin: "https://draw.money",
  consumer: "draw-money",
  convexSiteUrl: "https://qualified-marmot-22.convex.site",
  convexUrl: "https://qualified-marmot-22.convex.cloud",
  environment: "production",
  kind: "ready",
  siteUrl: "https://draw.money",
  surfaceOrigin: "https://draw.money",
} as const satisfies ReadySuiteAccountsPublicConfig;

describe("isolated suite Accounts React provider", () => {
  test("retargets Convex hooks only inside the suite subtree", async () => {
    const productClient = new ConvexReactClient(
      "https://happy-animal-123.convex.cloud",
    );
    let productObserved: ConvexReactClient | undefined;
    let suiteObserved: ConvexReactClient | undefined;
    let packageObserved: ConvexReactClient | null | undefined;

    function ProductProbe() {
      productObserved = useConvex();
      return null;
    }
    function SuiteProbe() {
      suiteObserved = useConvex();
      packageObserved = useSuiteAccountsClient();
      return null;
    }

    try {
      renderToString(
        <ConvexProvider client={productClient}>
          <ProductProbe />
          <SuiteAccountsProvider config={config}>
            <SuiteProbe />
          </SuiteAccountsProvider>
        </ConvexProvider>,
      );
      expect(productObserved).toBe(productClient);
      expect(suiteObserved).not.toBe(productClient);
      expect(packageObserved).toBe(suiteObserved ?? null);
    } finally {
      await productClient.close();
      await suiteObserved?.close();
    }
  });

  test("does not mount a Convex authority for missing configuration", () => {
    let observed: ConvexReactClient | null | undefined;
    function Probe() {
      observed = useSuiteAccountsClient();
      return null;
    }
    renderToString(
      <SuiteAccountsProvider
        config={{ kind: "missing", missing: ["NEXT_PUBLIC_SITE_URL"] }}
      >
        <Probe />
      </SuiteAccountsProvider>,
    );
    expect(observed).toBeNull();
  });

  test("does not mount a Better Auth client for an OAuth RP consumer", () => {
    const oauthConfig = {
      ...config,
      authBasePath: "/api/suite-auth",
      authMode: "oidc-rp",
      canonicalProductOrigin: "https://gnrte.com",
      consumer: "gnrte",
      siteUrl: "https://gnrte.com",
      surfaceOrigin: "https://gnrte.com",
    } as const satisfies ReadySuiteAccountsPublicConfig;
    let observed: ReturnType<typeof useSuiteAccountsClient> | undefined;
    function Probe() {
      observed = useSuiteAccountsClient();
      return null;
    }
    renderToString(
      <SuiteAccountsProvider config={oauthConfig}>
        <Probe />
      </SuiteAccountsProvider>,
    );
    expect(observed).toBeNull();
  });
});
