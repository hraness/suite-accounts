import assert from "node:assert/strict";
import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { provisionedBrowserExecutable, verificationBrowserArguments, verificationBrowserLaunchOptions } from "../scripts/browser-executable.js";

const managedPath = "/cache/chromium-1234/chrome";
const base = {
  environment: {},
  managedPath,
  resolveExecutable: (path: string) => Promise.resolve(path),
  readVersion: () => Promise.resolve("Chromium 151.0.7922.34"),
  report: () => undefined,
};

describe("provisioned verification browser", () => {
  test("merges required launch flags with caller features and switches", () => {
    expect(verificationBrowserArguments(["--no-sandbox", "--disable-features=Existing,PaintHolding", "--mute-audio", "--disable-features=Other"]))
      .toEqual(["--no-sandbox", "--mute-audio", "--disable-features=PaintHolding,MacAppCodeSignClone,Existing,Other"]);
    expect(verificationBrowserArguments()).toEqual(["--mute-audio", "--disable-features=PaintHolding,MacAppCodeSignClone"]);
  });

  test("retains pinned browser defaults with one physical feature switch", () => {
    for (const features of ["Existing", "PaintHolding,MacAppCodeSignClone"]) {
      for (const audio of [[], ["--mute-audio"]]) {
        const defaults = ["--enable-automation", ...audio, `--disable-features=${features}`];
        const options = verificationBrowserLaunchOptions(["--no-sandbox"], defaults);
        const ignored = options.ignoreDefaultArgs as readonly string[];
        // Playwright filters both its defaults and supplied arguments.
        const physical = [...defaults, ...options.args ?? []].filter((argument) => !ignored.includes(argument));
        const disabled = physical.filter((argument) => argument.startsWith("--disable-features="));
        expect(disabled).toHaveLength(1);
        const merged = disabled[0]?.slice("--disable-features=".length).split(",") ?? [];
        expect(merged).toContain("PaintHolding");
        expect(merged).toContain("MacAppCodeSignClone");
        for (const feature of features.split(",")) expect(merged).toContain(feature);
        expect(physical.filter((argument) => argument === "--mute-audio")).toHaveLength(1);
        expect(physical).toContain("--enable-automation");
        expect(physical).toContain("--no-sandbox");
      }
    }
  });

  test("fails closed when pinned feature defaults cannot be reconciled", () => {
    expect(() => verificationBrowserLaunchOptions([], [])).toThrow("exactly one");
    expect(() => verificationBrowserLaunchOptions([], ["--disable-features=One", "--disable-features=Two"])).toThrow("exactly one");
    expect(() => verificationBrowserLaunchOptions(["--disable-features"], ["--disable-features=One"])).toThrow("--disable-features=value");
  });

  test("reads the installed exact pin's complete Chromium defaults", () => {
    const options = verificationBrowserLaunchOptions(["--disable-features=CallerFeature"]);
    const replacement = options.args?.find((argument) => argument.startsWith("--disable-features="));
    expect(replacement).toContain("CallerFeature");
    expect(replacement).toContain("PaintHolding");
    expect(replacement).toContain("MacAppCodeSignClone");
    expect(options.ignoreDefaultArgs).toHaveLength(1);
  });

  test("uses the pinned managed executable and reports its identity", async () => {
    const reports: string[] = [];
    expect(await provisionedBrowserExecutable({ ...base, report: (message) => { reports.push(message); } })).toBe(managedPath);
    expect(reports[0]).toContain("Chromium 151.0.7922.34");
    expect(reports[0]).toContain(managedPath);
  });

  test("accepts explicit Chrome for Testing and the managed executable", async () => {
    expect(await provisionedBrowserExecutable({ ...base, environment: { CHROME_PATH: "/cache/cft/152/chrome" }, readVersion: () => Promise.resolve("Google Chrome for Testing 151.0.7922.34") })).toBe("/cache/cft/152/chrome");
    expect(await provisionedBrowserExecutable({ ...base, environment: { CHROMIUM_EXECUTABLE_PATH: managedPath } })).toBe(managedPath);
  });

  test("does not fall back when the chosen override is missing", async () => {
    const resolved: string[] = [];
    await assert.rejects(provisionedBrowserExecutable({ ...base, environment: { CHROMIUM_EXECUTABLE_PATH: "/missing", CHROME_PATH: managedPath }, resolveExecutable: (path) => { resolved.push(path); return Promise.reject(new Error("absent")); } }), /browser:install/u);
    expect(resolved).toEqual(["/missing"]);
  });

  test("fails with provisioning guidance when the managed browser is absent", async () => {
    await assert.rejects(provisionedBrowserExecutable({ ...base, resolveExecutable: () => Promise.reject(new Error("absent")) }), /browser:install/u);
  });

  test("rejects system Chrome directly and through a symlink before executing it", async () => {
    for (const path of ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary", "/usr/bin/google-chrome"]) {
      for (const candidate of [path, "/tmp/browser-link"]) {
        await assert.rejects(provisionedBrowserExecutable({ ...base, environment: { CHROME_PATH: candidate }, resolveExecutable: () => Promise.resolve(path), readVersion: () => Promise.reject(new Error("must not execute")) }), /System browser/u);
      }
    }
  });

  test("rejects relative paths and arbitrary explicit Chromium or regular Chrome", async () => {
    await assert.rejects(provisionedBrowserExecutable({ ...base, environment: { CHROME_PATH: "chrome" } }), /absolute path/u);
    for (const version of ["Google Chrome 151.0.7922.34", "Chromium 151.0.7922.34", "Google Chrome for Testing unknown"]) {
      await assert.rejects(provisionedBrowserExecutable({ ...base, environment: { CHROME_PATH: "/other/chrome" }, readVersion: () => Promise.resolve(version) }), /explicitly provisioned Chrome for Testing/u);
    }
  });

  test("every browser launcher uses the shared selection policy", async () => {
    const directory = new URL("../scripts/", import.meta.url);
    const files = (await readdir(directory)).filter((name) => name.endsWith("-browser.ts"));
    let launches = 0;
    for (const name of files) {
      const source = await readFile(new URL(name, directory), "utf8");
      if (!source.includes("chromium.launch(")) continue;
      launches += 1;
      expect(source).toContain('from "./browser-executable.js"');
      expect(source).toContain("...verificationBrowserLaunchOptions(");
      expect(source).not.toContain("chromium.executablePath()");
      expect(source).not.toContain("/Applications/Google Chrome.app");
      expect(source).not.toContain("process.env.CHROME_PATH");
      expect(source).not.toContain("process.env.CHROMIUM_EXECUTABLE_PATH");
    }
    expect(launches).toBe(3);
  });
});
