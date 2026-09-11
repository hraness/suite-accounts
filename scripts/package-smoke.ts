import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkPrivateBoundary } from "./check-private-boundary.js";
import { readStylexPackageManifest } from "@hraness/ui/stylex-build";

const packageName = "@hraness/suite-accounts";
const importSpecifiers = [
  packageName,
  `${packageName}/auth-client`,
  `${packageName}/auth-proxy`,
  `${packageName}/bearer-verifier`,
  `${packageName}/browser-session`,
  `${packageName}/client-configuration`,
  `${packageName}/convex-browser-auth`,
  `${packageName}/convex-browser-auth-browser`,
  `${packageName}/convex-browser-auth-server`,
  `${packageName}/entitlements`,
  `${packageName}/identity`,
  `${packageName}/identity/functions`,
  `${packageName}/identity/return-targets`,
  `${packageName}/oidc-rp`,
  `${packageName}/oidc-session-policy`,
  `${packageName}/oidc-surface-server`,
  `${packageName}/profile`,
  `${packageName}/profile-form`,
  `${packageName}/public-config`,
  `${packageName}/react`,
  `${packageName}/receipt-verifier`,
  `${packageName}/registry`,
  `${packageName}/urls`,
] as const;
const reactVerificationLanes = [
  {
    label: "react-18",
    packages: [
      "@types/node@^24.10.1",
      "@types/react@^18.3.0",
      "@types/react-dom@^18.3.0",
      "react@18.3.1",
      "react-dom@18.3.1",
      "typescript@^6.0.3",
    ],
  },
  {
    label: "react-19",
    packages: [
      "@types/node@^24.10.1",
      "@types/react@^19.2.14",
      "@types/react-dom@^19.2.3",
      "react@19.2.3",
      "react-dom@19.2.3",
      "typescript@^6.0.3",
    ],
  },
] as const;
const repository = process.cwd();
const temporaryRoot = process.platform === "darwin" ? "/private/tmp" : tmpdir();
const work = await mkdtemp(join(temporaryRoot, "hraness-suite-accounts-smoke-"));

async function run(command: string[], cwd: string): Promise<string> {
  const child = Bun.spawn(command, {
    cwd,
    env: {
      ...process.env,
      TMPDIR: work,
    },
    stderr: "inherit",
    stdout: "pipe",
  });
  const output = await new Response(child.stdout).text();
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(
      `Command failed (${String(exitCode)}): ${command.join(" ")}\n${output}`,
    );
  }
  return output;
}

async function verifyReactLane(
  archive: string,
  label: string,
  packages: readonly string[],
): Promise<void> {
  const consumer = join(work, label);
  await mkdir(consumer);
  await writeFile(
    join(consumer, "package.json"),
    JSON.stringify({
      dependencies: {
        "@hraness/result": "github:hraness/result#v0.2.1",
        [packageName]: archive,
      },
      private: true,
      type: "module",
    }),
  );
  await run([process.execPath, "install", "--ignore-scripts"], consumer);
  await run([
    process.execPath,
    "add",
    ...packages,
    "--ignore-scripts",
  ], consumer);
  await run([
    "node",
    "--input-type=module",
    "-e",
    `await Promise.all(${JSON.stringify(importSpecifiers)}.map((specifier) => import(specifier)))`,
  ], consumer);
  await run([
    "node", "--input-type=module", "-e",
    `import {createSuiteOidcRelyingParty} from "${packageName}/oidc-rp";
const rp=createSuiteOidcRelyingParty({consumer:"aicharts",environment:"production",receiptKeyVersion:"v1",cookieSecret:"synthetic-packed-consumer-secret-at-least-32-bytes",fetch:async()=>{throw new Error("Unexpected provider access")}});
const started=await rp.startFreshAuthentication(new Request("https://aicharts.io/api/suite-auth/start",{headers:{"sec-fetch-site":"same-origin"}}),{context:"opaque-context-for-packed-consumer-test",expiresAtMs:Date.now()+60000});
if(started.status!==302||started.headers.get("location").includes("opaque-context"))throw new Error("Packed fresh start failed");
const completed=await rp.completeFreshAuthentication(new Request("https://aicharts.io/api/suite-auth/callback"));
if(completed.kind!=="rejected"||completed.response.status!==400)throw new Error("Packed fresh completion failed closed contract");`,
  ], consumer);
  await run([
    "node", "--input-type=module", "-e",
    `import {createElement} from "react"; import {renderToStaticMarkup} from "react-dom/server";
import {SuiteProfileForm} from "${packageName}/profile-form";
const html=renderToStaticMarkup(createElement(SuiteProfileForm,{initialProfile:{name:"Reader",email:"reader@example.com",bio:"",revision:0,links:{x:null,linkedin:null,bluesky:null,instagram:null,telegram:null,website:null}},onSave:async()=>{throw new Error("unused")},submitLabel:"Save profile"}));
if(!/class="suite-profile-form [^"]+"/.test(html)||html.includes('style='))throw new Error("Packed profile lost compiled classes or added inline style");`,
  ], consumer);

  const imports = importSpecifiers
    .map((specifier, index) =>
      `import * as surface${String(index)} from ${JSON.stringify(specifier)};`
    )
    .join("\n");
  const references = importSpecifiers
    .map((_, index) => `surface${String(index)}`)
    .join(", ");
  await writeFile(
    join(consumer, "index.ts"),
    `${imports}\nvoid [${references}];
import { createSuiteOidcRelyingParty, type SuiteOidcFreshAuthentication } from "${packageName}/oidc-rp";
async function useFresh(rp: ReturnType<typeof createSuiteOidcRelyingParty>, request: Request) {
  const result = await rp.completeFreshAuthentication(request);
  if (result.kind === "authenticated") { const evidence: SuiteOidcFreshAuthentication = result.authentication; void evidence.context; }
  return result.response;
}
void useFresh;
`,
  );
  const common = {
    compilerOptions: {
      exactOptionalPropertyTypes: true,
      jsx: "react-jsx",
      lib: ["ES2023", "DOM", "DOM.Iterable"],
      noEmit: true,
      skipLibCheck: true,
      strict: true,
      target: "ES2023",
      types: ["node"],
    },
    include: ["index.ts"],
  };
  await writeFile(
    join(consumer, "tsconfig.bundler.json"),
    JSON.stringify({
      ...common,
      compilerOptions: {
        ...common.compilerOptions,
        module: "Preserve",
        moduleResolution: "Bundler",
      },
    }, null, 2),
  );
  await writeFile(
    join(consumer, "tsconfig.nodenext.json"),
    JSON.stringify({
      ...common,
      compilerOptions: {
        ...common.compilerOptions,
        module: "NodeNext",
        moduleResolution: "NodeNext",
      },
    }, null, 2),
  );
  await run(
    [process.execPath, "x", "tsc", "-p", "./tsconfig.bundler.json"],
    consumer,
  );
  await run(
    [process.execPath, "x", "tsc", "-p", "./tsconfig.nodenext.json"],
    consumer,
  );
}

async function verifyNextWebpackConsumer(archive: string): Promise<void> {
  const consumer = join(work, "next-webpack");
  await mkdir(join(consumer, "app"), { recursive: true });
  await writeFile(
    join(consumer, "package.json"),
    JSON.stringify({
      private: true,
      scripts: { build: "next build --webpack" },
      type: "module",
    }),
  );
  await run([process.execPath, "add", archive, "--ignore-scripts"], consumer);
  await run([
    process.execPath,
    "add",
    "next@16.2.12",
    "react@19.2.3",
    "react-dom@19.2.3",
    "--ignore-scripts",
  ], consumer);
  await writeFile(
    join(consumer, "app", "layout.js"),
    [
      "export default function Layout({ children }) {",
      '  return <html lang="en"><body>{children}</body></html>;',
      "}",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(consumer, "app", "page.js"),
    [
      '"use client";',
      "",
      `import ${JSON.stringify(`${packageName}/profile-form.css`)};`,
      `import * as ProfileForm from ${JSON.stringify(`${packageName}/profile-form`)};`,
      `import * as SuiteReact from ${JSON.stringify(`${packageName}/react`)};`,
      "",
      "export default function Page() {",
      "  const exportCount = Object.keys(ProfileForm).length + Object.keys(SuiteReact).length;",
      '  return <main data-suite-export-count={exportCount}>Suite Accounts</main>;',
      "}",
      "",
    ].join("\n"),
  );
  await run([process.execPath, "run", "build"], consumer);
}

try {
  const archive = join(work, "package.tgz");
  const consumer = join(work, "consumer");
  await mkdir(consumer);
  await run([
    process.execPath,
    "pm",
    "pack",
    "--filename",
    archive,
    "--ignore-scripts",
    "--quiet",
  ], repository);

  const archiveListing = await run(["tar", "-tzf", archive], repository);
  if (
    archiveListing.includes(".test.")
    || archiveListing.includes("test-support")
    || archiveListing.includes("/scripts/")
  ) {
    throw new Error("The package archive contains development-only files.");
  }
  const unpacked = join(work, "unpacked");
  await mkdir(unpacked);
  await run(["tar", "-xzf", archive, "-C", unpacked], repository);
  await checkPrivateBoundary(join(unpacked, "package"));
  const manifest = await readStylexPackageManifest(join(unpacked, "package/dist/stylex-manifest.json"), join(unpacked, "package"));
  assert.deepEqual(manifest.package, { name: packageName, version: "0.6.0" });
  assert.equal(manifest.compiler.transform.propertyValidationMode, "throw");
  assert.equal(manifest.compilerSha256, "9ac2c8448ec8f198047e824ce27a97657e05025918c01c204aa0399f94641049");
  if (manifest.rules.length === 0 || manifest.runtime.length !== 1) throw new Error("Packed StyleX manifest has an incomplete profile boundary.");
  for (const required of ["dist/stylex.css", "dist/stylex-manifest.json", "compiler-foundation.css", "src/profile-form.stylex.ts"]) {
    if (!archiveListing.includes(`package/${required}\n`)) throw new Error(`The package archive omitted ${required}.`);
  }

  await writeFile(
    join(consumer, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  await run([process.execPath, "add", archive, "--ignore-scripts"], consumer);
  const publicManifestUrl = (await run([
    "node",
    "--input-type=module",
    "-e",
    `process.stdout.write(import.meta.resolve(${JSON.stringify(`${packageName}/stylex-manifest.json`)}))`,
  ], consumer)).trim();
  const installedManifest = await readStylexPackageManifest(fileURLToPath(publicManifestUrl));
  if (
    installedManifest.package.name !== manifest.package.name
    || installedManifest.package.version !== manifest.package.version
    || installedManifest.rulesSha256 !== manifest.rulesSha256
    || installedManifest.rules.length !== manifest.rules.length
  ) {
    throw new Error("The public StyleX manifest export did not resolve the packed package manifest.");
  }
  await run([
    "node",
    "--input-type=module",
    "-e",
    `await import(${JSON.stringify(packageName)})`,
  ], consumer);
  await writeFile(
    join(consumer, "bundle-entry.ts"),
    [
      `import { createSuiteAccountsClientConfiguration as fromRoot } from ${JSON.stringify(packageName)};`,
      `import { createSuiteAccountsClientConfiguration as fromSubpath } from ${JSON.stringify(`${packageName}/client-configuration`)};`,
      "const binding = {",
      '  authMode: "oidc-rp",',
      '  callbackUrl: "https://oompa.app/api/suite-auth/callback",',
      '  clientId: "hraness:hra:production:v1",',
      '  consumer: "hra",',
      '  environment: "production",',
      '  origin: "https://oompa.app",',
      "} as const;",
      "for (const createConfiguration of [fromRoot, fromSubpath]) {",
      "  const result = createConfiguration(binding);",
      "  if (!result.ok) throw new Error(result.error);",
      '  if (result.value.provider.issuer !== "https://account.hraness.com") throw new Error("wrong issuer");',
      '  if (!Object.isFrozen(result.value.provider)) throw new Error("mutable provider");',
      "}",
      "",
    ].join("\n"),
  );
  await run([
    process.execPath,
    "build",
    "./bundle-entry.ts",
    "--outdir",
    "./bundle",
    "--target",
    "bun",
    "--format",
    "esm",
  ], consumer);
  const bundledRoot = await readFile(
    join(consumer, "bundle", "bundle-entry.js"),
    "utf8",
  );
  if (
    bundledRoot.includes("convex/server")
    || bundledRoot.includes("better-auth")
    || bundledRoot.includes("@stylexjs/")
    || bundledRoot.includes("profile-form.stylex")
  ) {
    throw new Error("The root client-configuration bundle retained opt-in runtime dependencies.");
  }
  await run([process.execPath, "./bundle/bundle-entry.js"], consumer);
  for (const lane of reactVerificationLanes) {
    await verifyReactLane(archive, lane.label, lane.packages);
  }
  await verifyNextWebpackConsumer(archive);
} finally {
  await rm(work, { force: true, recursive: true });
}
