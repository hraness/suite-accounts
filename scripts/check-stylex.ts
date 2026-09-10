import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  canonicalJson,
  createStylexTransformCollector,
  readStylexPackageManifest,
  serializeStylexPackageRules,
} from "@hraness/ui/stylex-build";
import { checkNonProfileRuntimeBoundary } from "./check-runtime-boundary.js";

const repository = process.cwd();
const manifest = await readStylexPackageManifest(resolve("dist/stylex-manifest.json"), repository);
const packageData: unknown = JSON.parse(await readFile("package.json", "utf8"));
assert.ok(typeof packageData === "object" && packageData !== null && "version" in packageData);
assert.deepEqual(manifest.package, { name: "@hraness/suite-accounts", version: packageData.version });
assert.equal(manifest.compiler.transform.propertyValidationMode, "throw");
assert.equal(manifest.compilerSha256, "9ac2c8448ec8f198047e824ce27a97657e05025918c01c204aa0399f94641049");
const collector = createStylexTransformCollector(repository);
const recipe = resolve("src/profile-form.stylex.ts");
await collector.transform(await readFile(recipe, "utf8"), recipe);
assert.equal(canonicalJson(manifest.rules), canonicalJson(collector.seal()), "Manifest must contain the complete source recipe.");
assert.equal(await readFile("dist/stylex.css", "utf8"), serializeStylexPackageRules(manifest.rules, manifest.standaloneSerializer));
assert.deepEqual(manifest.runtime.map(artifact => artifact.path), ["dist/profile-form.js"]);
assert.equal(await readFile("src/profile-form.css", "utf8"), '@import "../dist/stylex.css";\n');
assert.ok((await readFile("compiler-foundation.css", "utf8")).replace(/\/\*[\s\S]*?\*\//gu, "").trim() === "");
const runtime = await readFile("dist/profile-form.js", "utf8");
assert.ok(!runtime.includes("stylex.create(") && !runtime.includes("stylex.inject(") && !runtime.includes("@hraness/ui"));
await checkNonProfileRuntimeBoundary(resolve("dist"));
for (const variable of ["input-background", "line", "focus", "muted", "button-background", "button-foreground", "error"]) {
  assert.ok((await readFile("dist/stylex.css", "utf8")).includes(`--suite-profile-${variable}`), `Lost public variable ${variable}.`);
}
console.log(`Verified ${manifest.rules.length} canonical profile rules, one runtime, three stylesheets, and non-React boundaries.`);
