import { test } from "bun:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkPrivateBoundary } from "../scripts/check-private-boundary.js";

test("the complete public scan rejects opaque files and symlinks", async () => {
  const root = await mkdtemp(join(tmpdir(), "suite-public-scan-"));
  try {
    await writeFile(join(root, "public.txt"), "Public package content.\n");
    await assert.doesNotReject(checkPrivateBoundary(root));
    await writeFile(join(root, "opaque.bin"), new Uint8Array([0xff, 0xfe, 0x80]));
    await assert.rejects(checkPrivateBoundary(root), /cannot be completely inspected/u);
    await rm(join(root, "opaque.bin"));
    await symlink(join(root, "public.txt"), join(root, "linked.txt"));
    await assert.rejects(checkPrivateBoundary(root), /Symlinks are not allowed/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
