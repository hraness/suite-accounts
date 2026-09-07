import { readFile, rm, writeFile } from "node:fs/promises";
import {
  STYLEX_PACKAGE_MANIFEST_SCHEMA_VERSION,
  artifactForFile,
  canonicalJson,
  compilerContract,
  compilerSha256,
  serializeStylexPackageRules,
  stylexRulesSha256,
  validateStylexPackageManifest,
} from "@hraness/ui/stylex-build";
import { profileStylexTransform } from "./stylex-transform.js";

const entrypoints = [
  "src/index.ts",
  "src/auth-client.ts",
  "src/auth-proxy.ts",
  "src/bearer-verifier.ts",
  "src/browser-session.ts",
  "src/client-configuration.ts",
  "src/convex-browser-auth.ts",
  "src/convex-browser-auth-browser.ts",
  "src/convex-browser-auth-server.ts",
  "src/entitlements.ts",
  "src/identity/functions.ts",
  "src/identity/index.ts",
  "src/identity/return-targets.ts",
  "src/oidc-rp.ts",
  "src/oidc-session-policy.ts",
  "src/oidc-surface-server.ts",
  "src/profile-form.tsx",
  "src/public-config.ts",
  "src/react.tsx",
  "src/receipt-verifier.ts",
  "src/registry.ts",
  "src/urls.ts",
];

// Bun 1.3.14 selects the automatic production JSX transform when the process
// starts. Re-exec once so the build never depends on the caller's environment.
if (process.env["NODE_ENV"] !== "production") {
  const buildScript = process.argv[1];
  if (buildScript === undefined) throw new Error("Missing build script path.");
  const productionBuild = Bun.spawnSync({
    cmd: [process.execPath, buildScript],
    env: { ...process.env, NODE_ENV: "production" },
    stderr: "inherit",
    stdout: "inherit",
  });
  process.exit(productionBuild.exitCode);
}

await rm("dist", { force: true, recursive: true });
const { collector, plugin } = profileStylexTransform(process.cwd());
const result = await Bun.build({
  entrypoints,
  format: "esm",
  jsx: {
    development: false,
    importSource: "react",
    runtime: "automatic",
  },
  minify: false,
  outdir: "dist",
  packages: "external",
  plugins: [plugin],
  root: "src",
  splitting: false,
  target: "node",
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

await writeFile(
  "dist/profile.js",
  [
    "export {",
    "  SUITE_COMMUNITY_APPLICATION_STATUSES,",
    "  SUITE_PROFILE_BIO_MAX_LENGTH,",
    "  SUITE_PROFILE_NAME_MAX_LENGTH,",
    "  SUITE_PROFILE_URL_MAX_LENGTH,",
    "  normalizeSuiteProfileLink,",
    "  parseSuiteCommunityProfileView,",
    "  parseSuiteProfileUpdateRequest,",
    "  parseSuiteProfileView,",
    '} from "./identity/index.js";',
    "",
  ].join("\n"),
);

for (const path of [
  "dist/auth-client.js",
  "dist/profile-form.js",
  "dist/react.js",
]) {
  const source = await readFile(path, "utf8");
  if (source.includes("jsx-dev-runtime") || source.includes("jsxDEV")) {
    throw new Error(`${path} contains a development JSX runtime.`);
  }
  const directive = '"use client";';
  const body = source
    .split(/\r?\n/u)
    .filter(line => line !== directive);
  const clientModule = [directive, ...body].join("\n");
  const directives = clientModule
    .split("\n")
    .filter(line => line === directive);
  if (!clientModule.startsWith(`${directive}\n`) || directives.length !== 1) {
    throw new Error(`${path} must contain one top-level client directive.`);
  }
  await writeFile(path, clientModule);
}

const rules = collector.seal();
if (rules.length === 0) throw new Error("Profile build collected no StyleX rules.");
const standaloneSerializer = {
  before: ["components.hraness-suite-accounts.legacy"],
  prefix: "components.hraness-suite-accounts",
} as const;
await writeFile("dist/stylex.css", serializeStylexPackageRules(rules, standaloneSerializer));
const packageData: unknown = JSON.parse(await readFile("package.json", "utf8"));
if (typeof packageData !== "object" || packageData === null || !("version" in packageData)
  || typeof packageData.version !== "string") throw new Error("Missing package version.");
const manifest = validateStylexPackageManifest({
  buildTools: [],
  compiler: compilerContract,
  compilerFoundation: "compiler-foundation.css",
  compilerSha256,
  kind: "hraness-stylex-package-manifest",
  package: { name: "@hraness/suite-accounts", version: packageData.version },
  rules,
  rulesSha256: stylexRulesSha256(rules),
  runtime: [await artifactForFile(process.cwd(), "dist/profile-form.js")],
  schemaVersion: STYLEX_PACKAGE_MANIFEST_SCHEMA_VERSION,
  standaloneCss: await artifactForFile(process.cwd(), "dist/stylex.css"),
  standaloneSerializer,
  stylesheets: await Promise.all(["compiler-foundation.css", "src/profile-form.css"].map(path => artifactForFile(process.cwd(), path))),
});
await writeFile("dist/stylex-manifest.json", `${canonicalJson(manifest)}\n`);
