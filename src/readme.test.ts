import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createSuiteAccountsClientConfiguration } from "./client-configuration.js";

const readme = readFileSync(join(import.meta.dir, "..", "README.md"), "utf8");
const normalizedReadme = readme.replace(/\s+/g, " ");
const packageManifest = JSON.parse(
  readFileSync(join(import.meta.dir, "..", "package.json"), "utf8"),
) as {
  readonly exports: Readonly<Record<string, unknown>>;
  readonly version: string;
};

describe("README product contract", () => {
  test("moves from result through proof, model, interfaces, and trust", () => {
    const result = readme.indexOf("Give a Hraness product one registered sign-in");
    const proof = readme.indexOf("## First proof: bind one registered client");
    const model = readme.indexOf("## Follow the trust path");
    const interfaces = readme.indexOf("## Interface map");
    const trust = readme.indexOf("## Trust boundary");
    const questions = readme.indexOf("## Questions before integration");

    expect(result).toBeGreaterThan(-1);
    expect(proof).toBeGreaterThan(result);
    expect(model).toBeGreaterThan(proof);
    expect(interfaces).toBeGreaterThan(model);
    expect(trust).toBeGreaterThan(interfaces);
    expect(questions).toBeGreaterThan(trust);
  });

  test("keeps the immutable install aligned with the package version", () => {
    expect(readme).toContain(
      `"@hraness/suite-accounts": "github:hraness/suite-accounts#v${packageManifest.version}"`,
    );
    expect(readme).toContain(`immutable \`v${packageManifest.version}\` release`);
    expect(normalizedReadme).toContain(
      `Install them only when using \`@hraness/suite-accounts/react\` or`,
    );
  });

  test("derives the documented first proof from current authority", () => {
    const configuration = createSuiteAccountsClientConfiguration({
      authMode: "oidc-rp",
      callbackUrl: "https://oompa.app/api/suite-auth/callback",
      clientId: "hraness:hra:production:v1",
      consumer: "hra",
      environment: "production",
      origin: "https://oompa.app",
    });

    expect(configuration.ok).toBe(true);
    if (!configuration.ok) return;

    for (const value of [
      configuration.value.authBasePath,
      configuration.value.configurationVersion,
      configuration.value.provider.issuer,
      configuration.value.provider.resource,
      configuration.value.wireVersion,
    ]) {
      expect(readme).toContain(`"${value}"`);
    }
  });

  test("states authority and bearer-custody limits", () => {
    for (const boundary of [
      "browser receives bounded session JSON, never an OAuth bearer",
      "Accounts service | Account records, client registration, identity links, entitlements",
      "Browser session JSON never exposes bearer tokens",
      "The validated factory can confirm that binding, but it cannot create or widen it",
      "Prices, provider keys, events, credentials, and product policy stay with their authoritative services",
    ]) {
      expect(normalizedReadme).toContain(boundary);
    }
  });

  test("documents every public export", () => {
    for (const exportName of Object.keys(packageManifest.exports)) {
      if (exportName === ".") {
        expect(readme).toContain("| `.` | Dependency-light configuration");
        continue;
      }

      expect(readme).toContain(`| \`${exportName}\` |`);
    }
  });
});
