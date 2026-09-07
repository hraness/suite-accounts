import { test } from "bun:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkNonProfileRuntimeBoundary } from "../scripts/check-runtime-boundary.js";

test("every non-profile built entry rejects presentation, including nested and future entries", async () => {
  const root = await mkdtemp(join(tmpdir(), "suite-runtime-boundary-"));
  try {
    await mkdir(join(root, "identity"));
    await writeFile(join(root, "profile-form.js"), 'import "@stylexjs/stylex";');
    await writeFile(join(root, "index.js"), "export const value = 1;\n");
    await assert.doesNotReject(checkNonProfileRuntimeBoundary(root));
    for (const file of ["auth-proxy.js", "bearer-verifier.js", "react.js", "identity/future.js", "identity/future.mjs", "future.cjs"]) {
      for (const marker of ["@stylexjs/", "profile-form.stylex", "stylex.create(", "stylex.inject("]) {
        await writeFile(join(root, file), `// ${marker}\n`);
        await assert.rejects(checkNonProfileRuntimeBoundary(root), /retained optional profile presentation/u);
        await rm(join(root, file));
      }
    }
    await symlink(join(root, "index.js"), join(root, "linked.js"));
    await assert.rejects(checkNonProfileRuntimeBoundary(root), /contains a symlink/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
