import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
    `${imports}\nvoid [${references}];\n`,
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

  await writeFile(
    join(consumer, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  await run([process.execPath, "add", archive, "--ignore-scripts"], consumer);
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
      '  callbackUrl: "https://hra.sh/api/suite-auth/callback",',
      '  clientId: "hraness:hra:production:v1",',
      '  consumer: "hra",',
      '  environment: "production",',
      '  origin: "https://hra.sh",',
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
