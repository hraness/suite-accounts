import { expect, test } from "bun:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isRecord } from "@hraness/result";
import { compilerContract, compilerSha256, createStylexTransformCollector } from "@hraness/ui/stylex-build";

test("profile compilation binds fail-fast validation without widening optional peers", async () => {
  const pkg: unknown = await Bun.file("package.json").json();
  assert(isRecord(pkg) && isRecord(pkg.devDependencies) && isRecord(pkg.dependencies));
  expect(pkg.version).toBe("0.5.4");
  expect(pkg.devDependencies["@hraness/ui"]).toBe("github:hraness/ui#v0.5.12");
  expect(pkg.dependencies["@hraness/ui"]).toBeUndefined();
  expect(pkg.peerDependencies).toEqual({ react: ">=18.3.1 <20", "react-dom": ">=18.3.1 <20" });
  expect(pkg.peerDependenciesMeta).toEqual({ react: { optional: true }, "react-dom": { optional: true } });
  expect(compilerContract.transform.propertyValidationMode).toBe("throw");
  expect(compilerSha256).toBe("9ac2c8448ec8f198047e824ce27a97657e05025918c01c204aa0399f94641049");
});

test("unsupported profile shorthand cannot silently disappear from the compiled form", async () => {
  const collector = createStylexTransformCollector(process.cwd());
  await assert.rejects(collector.transform(`import * as stylex from "@stylexjs/stylex";
    export const styles = stylex.create({ input: {
      color: "red", border: "1px solid currentColor",
    } });`, resolve("src/profile-validation-fixture.stylex.ts")), /not supported/u);
  expect(collector.seal()).toEqual([]);
});

test("profile recipes preserve native focus, disabled, readonly, and shorthand reset semantics", async () => {
  const path = resolve("src/profile-form.stylex.ts");
  const source = await readFile(path, "utf8");
  const collector = createStylexTransformCollector(process.cwd());
  const transformed = await collector.transform(source, path);
  const rules = collector.seal();
  expect(rules.length).toBeGreaterThan(30);
  expect(transformed.code).not.toContain("stylex.create(");
  const serialized = JSON.stringify(rules);
  for (const token of [":focus-visible", ":disabled", "resize:vertical", "min-width:0", "outline-offset:2px"]) {
    expect(serialized).toContain(token);
  }
  for (const variable of ["input-background", "line", "focus", "muted", "button-background", "button-foreground", "error"]) {
    expect(serialized).toContain(`--suite-profile-${variable}`);
  }
  for (const property of ["backgroundAttachment", "backgroundClip", "backgroundImage", "backgroundOrigin", "backgroundPosition", "backgroundRepeat", "backgroundSize", "borderImageSource", "borderImageSlice", "borderImageWidth", "borderImageOutset", "borderImageRepeat"]) {
    expect(source.match(new RegExp(`${property}:`, "gu"))?.length).toBe(2);
  }
  expect(source).toContain('outlineOffset: { default: null, ":focus-visible": "2px" }');
  expect(source).toContain('opacity: { default: null, ":disabled": 0.6 }');
  expect(source).not.toMatch(/\b(?:paddingInline|paddingBlock|inlineSize|minInlineSize)\s*:/u);
  expect(source.match(/fontLanguageOverride: "inherit"/gu)?.length).toBe(2);
  // CSS Fonts 4 excludes font-palette from the font shorthand.
  expect(source).not.toContain("fontPalette:");
});
