import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

/** Every built entry except the opt-in form must remain presentation-free. */
export async function checkNonProfileRuntimeBoundary(dist: string): Promise<void> {
  async function inspect(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      const logical = relative(dist, path).split(sep).join("/");
      assert.ok(!entry.isSymbolicLink(), `Generated runtime contains a symlink: ${logical}`);
      if (entry.isDirectory()) {
        await inspect(path);
        continue;
      }
      assert.ok(entry.isFile(), `Generated runtime contains a non-file: ${logical}`);
      if (!/\.(?:c|m)?js$/u.test(entry.name) || logical === "profile-form.js") continue;
      const source = await readFile(path, "utf8");
      for (const marker of ["@stylexjs/", "profile-form.stylex", "stylex.create(", "stylex.inject("]) {
        assert.ok(!source.includes(marker), `${logical} retained optional profile presentation: ${marker}`);
      }
    }
  }
  await inspect(dist);
}
