import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createStylexTransformCollector } from "@hraness/ui/stylex-build";

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
