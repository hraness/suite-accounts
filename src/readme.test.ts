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

const changelog = readFileSync(join(import.meta.dir, "..", "CHANGELOG.md"), "utf8");

describe("README facts", () => {
  test("names the installable package and records the current release", () => {
    expect(readme.startsWith("# @hraness/suite-accounts\n")).toBe(true);
    expect(changelog).toContain(`## v${packageManifest.version}\n`);
  });

  test("keeps release history out of the README", () => {
    expect(readme).not.toMatch(/^Version \d+\.\d+\.\d+ (adds|builds|binds)/mu);
    expect(readme).not.toMatch(/^\| `v\d+\.\d+\.\d+` \|/mu);
  });

  test("uses no em dashes", () => {
    expect(readme).not.toContain("\u2014");
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
      callbackUrl: "https://sound.fish/api/suite-auth/callback",
      clientId: "hraness:soundfish:production:v1",
      consumer: "soundfish",
      environment: "production",
      origin: "https://sound.fish",
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
