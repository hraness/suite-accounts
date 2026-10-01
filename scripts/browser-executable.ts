// Browser verification policy adapted from hraness/design-kit v0.35.2.
import { execFile } from "node:child_process";
import { constants, readFileSync } from "node:fs";
import { access, realpath } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join } from "node:path";
import { promisify } from "node:util";
import { chromium, type LaunchOptions } from "playwright-core";

const execute = promisify(execFile);
const require = createRequire(import.meta.url);
const installation = "Run bun run browser:install to provision the Chromium revision pinned by playwright-core.";

export interface BrowserSelectionOptions {
  readonly environment?: Readonly<Record<string, string | undefined>>;
  readonly managedPath?: string;
  readonly resolveExecutable?: (path: string) => Promise<string>;
  readonly readVersion?: (path: string) => Promise<string>;
  readonly report?: (message: string) => void;
}

async function resolveExecutable(path: string): Promise<string> {
  const resolved = await realpath(path);
  await access(resolved, constants.X_OK);
  return resolved;
}

/** Select a provisioned test browser; never discover the user's installed browser. */
export async function provisionedBrowserExecutable(options: BrowserSelectionOptions = {}): Promise<string> {
  const environment = options.environment ?? process.env;
  const configured = environment.CHROMIUM_EXECUTABLE_PATH ?? environment.CHROME_PATH;
  const managedPath = options.managedPath ?? chromium.executablePath();
  const candidate = configured ?? managedPath;
  if (!isAbsolute(candidate)) throw new Error(`Browser executable must be an absolute path. ${installation}`);
  const resolve = options.resolveExecutable ?? resolveExecutable;
  let executable: string;
  try {
    executable = await resolve(candidate);
  } catch (cause) {
    throw new Error(`Browser executable is unavailable: ${candidate}. ${installation}`, { cause });
  }
  // Check the resolved target as well, so a symlink cannot restore system Chrome.
  if (/Google Chrome(?: Beta| Dev| Canary)?\.app\//u.test(executable)
    || /^\/(?:usr|opt)\/(?:.*\/)?(?:google-chrome(?:-stable|-beta|-unstable)?|chromium(?:-browser)?)$/u.test(executable)) {
    throw new Error(`System browser is not allowed for automated verification: ${executable}. ${installation}`);
  }
  const managed = configured === undefined || executable === await resolve(managedPath).catch(() => undefined);
  const readVersion = options.readVersion ?? (async (path: string) => {
    const { stdout } = await execute(path, ["--version"], { timeout: 5_000, maxBuffer: 4_096 });
    return stdout.trim();
  });
  const version = (await readVersion(executable)).trim();
  if (!/^(?:Google Chrome for Testing|Chromium) \d+\.\d+\.\d+\.\d+(?:\s|$)/u.test(version)
    || (!managed && !/^Google Chrome for Testing /u.test(version))) {
    throw new Error(`Browser must be the pinned Playwright browser or an explicitly provisioned Chrome for Testing: ${executable} (${version}). ${installation}`);
  }
  (options.report ?? console.log)(`Verification browser: ${version}; executable: ${executable}; source: ${managed ? "pinned Playwright" : "explicit Chrome for Testing"}`);
  return executable;
}

/** Merge required quiet, clone-free automation flags without discarding caller features. */
export function verificationBrowserArguments(arguments_: readonly string[] = []): string[] {
  if (arguments_.includes("--disable-features")) throw new Error("Use --disable-features=value for Chromium features.");
  const disabled = new Set(["PaintHolding", "MacAppCodeSignClone"]);
  const preserved: string[] = [];
  for (const argument of arguments_) {
    if (argument.startsWith("--disable-features=")) {
      for (const feature of argument.slice("--disable-features=".length).split(",")) {
        if (feature !== "") disabled.add(feature);
      }
    } else if (argument !== "--mute-audio") preserved.push(argument);
  }
  return [...preserved, "--mute-audio", `--disable-features=${[...disabled].join(",")}`];
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Cannot reconcile the pinned Playwright definition.");
  return value as Record<string, unknown>;
}

/** Read the exact installed package's defaults instead of replacing them. */
function pinnedChromiumDefaults(): readonly string[] {
  const coreRoot = dirname(require.resolve("playwright-core/package.json"));
  const installed = record(JSON.parse(readFileSync(join(coreRoot, "package.json"), "utf8")));
  const authored = record(JSON.parse(readFileSync(join(import.meta.dir, "../package.json"), "utf8")));
  if (installed.version !== record(authored.devDependencies)["playwright-core"]) {
    throw new Error("Install the repository's pinned playwright-core before browser verification.");
  }
  // The private formatter is admitted only through the exact authored pin.
  const core = record(require(join(coreRoot, "lib/coreBundle.js")));
  const factory = record(core.server).createPlaywright;
  if (typeof factory !== "function") throw new Error("Cannot reconcile the pinned Playwright formatter.");
  const createRuntime = factory as (options: { sdkLanguage: string }) => unknown;
  const runtime = createRuntime({ sdkLanguage: "javascript" });
  const browser = record(record(runtime).chromium);
  const formatter = browser._innerDefaultArgs;
  if (typeof formatter !== "function") throw new Error("Cannot reconcile the pinned Chromium formatter.");
  const formatDefaults = formatter as (this: Record<string, unknown>, options: { headless: boolean }) => unknown;
  const arguments_ = formatDefaults.call(browser, { headless: true });
  if (!Array.isArray(arguments_) || !arguments_.every((argument): argument is string => typeof argument === "string")) {
    throw new Error("Cannot reconcile the pinned Chromium switches.");
  }
  return arguments_;
}

/** Keep Playwright's defaults and produce one physical disabled-features switch. */
export function verificationBrowserLaunchOptions(
  arguments_: readonly string[] = [],
  defaults: readonly string[] = pinnedChromiumDefaults(),
): Pick<LaunchOptions, "args" | "ignoreDefaultArgs"> {
  const disabled = defaults.filter((argument) => argument.startsWith("--disable-features="));
  if (disabled.length !== 1) throw new Error("Pinned Chromium must supply exactly one disabled-features switch.");
  const merged = verificationBrowserArguments([...disabled, ...arguments_])
    .filter((argument) => argument !== "--mute-audio" || !defaults.includes("--mute-audio"));
  const useDefault = merged.find((argument) => argument.startsWith("--disable-features=")) === disabled[0];
  return {
    // Playwright filters supplied arguments too; an identical replacement
    // would disappear along with the ignored default.
    ignoreDefaultArgs: useDefault ? [] : disabled,
    args: useDefault ? merged.filter((argument) => !argument.startsWith("--disable-features=")) : merged,
  };
}
