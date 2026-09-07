import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createStylexTransformCollector } from "@hraness/ui/stylex-build";

/** Extraction, rule ordering, and compiler identity belong to the public tool. */
export function profileStylexTransform(repository: string) {
  const collector = createStylexTransformCollector(repository);
  const recipe = resolve(repository, "src/profile-form.stylex.ts");
  const plugin: Bun.BunPlugin = {
    name: "suite-accounts-profile-stylex",
    setup(build) {
      build.onLoad({ filter: /profile-form\.stylex\.ts$/u }, async ({ path }) => {
        if (resolve(path) !== recipe) throw new Error("Unexpected profile recipe path.");
        const { code } = await collector.transform(await readFile(path, "utf8"), path);
        return { contents: code, loader: "ts" };
      });
    },
  };
  return { collector, plugin };
}
