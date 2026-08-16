import { readdir, readFile, lstat } from "node:fs/promises";
import { join, relative } from "node:path";

const repository = process.cwd();
const ignoredDirectories = new Set([".git", "node_modules"]);
const privateNamespace = String.fromCharCode(
  64, 106, 117, 110, 103, 108, 101, 47,
);
const privateName = String.fromCharCode(74, 117, 110, 103, 108, 101);
const retiredPreviewKey = [
  "NEXT_PUBLIC",
  privateName.toUpperCase(),
  "VERCEL_SURFACE_ORIGIN",
].join("_");
const legacyBrowserIdentifiers = [
  `${privateName.toLowerCase()}-suite-accounts:oidc-refresh:v1`,
  `${privateName.toLowerCase()}-suite-accounts:oidc-session:v1`,
];
const legacyBrowserIdentifierFiles = new Set([
  "dist/browser-session.js",
  "dist/convex-browser-auth-browser.js",
  "src/browser-session.test.ts",
  "src/browser-session.ts",
]);

const forbiddenText = [
  privateNamespace,
  privateName,
  privateName.toLowerCase(),
  retiredPreviewKey,
  ["VERCEL", "OWNER", "ID"].join("_"),
  ["VERCEL", "PROJECT", "ID"].join("_"),
  ["BEGIN", "PRIVATE", "KEY"].join(" "),
];
// Match dependency-like literals without rejecting public KB metadata or ordinary prose.
const privateDependencyProtocol = /["'`](?:workspace|catalog):[^"'`\s]*["'`]/u;

async function files(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const found: string[] = [];
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Symlinks are not allowed in the public tree: ${relative(repository, path)}`);
    }
    if (entry.isDirectory()) found.push(...await files(path));
    if (entry.isFile()) found.push(path);
  }
  return found;
}

const failures: string[] = [];
for (const path of await files(repository)) {
  const relativePath = relative(repository, path);
  if ((await lstat(path)).size > 2 * 1_024 * 1_024) {
    failures.push(`${relativePath} exceeds the public scan limit.`);
    continue;
  }
  let value = await readFile(path, "utf8");
  if (legacyBrowserIdentifierFiles.has(relativePath)) {
    for (const identifier of legacyBrowserIdentifiers) {
      value = value.replaceAll(identifier, "");
    }
  }
  for (const marker of forbiddenText) {
    if (value.includes(marker)) {
      failures.push(`${relativePath} contains a private marker.`);
    }
  }
  if (privateDependencyProtocol.test(value)) {
    failures.push(`${relativePath} contains a private dependency protocol.`);
  }
  if (/gh[opsu]_[A-Za-z0-9]{20,}|sk_(?:live|test)_[A-Za-z0-9]{16,}/u.test(value)) {
    failures.push(`${relativePath} contains a credential-shaped value.`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
