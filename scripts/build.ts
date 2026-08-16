import { readFile, rm, writeFile } from "node:fs/promises";

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
