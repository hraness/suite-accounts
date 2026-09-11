import assert from "node:assert/strict";
import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type Page } from "playwright-core";
import { Activity, createElement } from "react";
import { renderToString } from "react-dom/server";
import {
  parseSuiteProfileEditorV2, parseSuiteProfileUpdateV2,
  type SuiteProfileEditorV2, type SuiteProfileUpdateV2,
} from "../src/identity/profiles-v2.js";
import type { SuitePublicProfileFormProps } from "../src/public-profile-form.js";

// Only public synthetic values. No session, credential, provider, or source files.
const privateCanaries = ["PRIVATE_FORM_NAME_CANARY", "PRIVATE_FORM_BIO_CANARY", "private-form-link-canary"];
const errorCanary = "UNTRUSTED_TRANSPORT_ERROR_CANARY";
function checkedProfile(value: unknown): SuiteProfileEditorV2 {
  const parsed = parseSuiteProfileEditorV2(value);
  assert.ok(parsed.ok, "Invalid synthetic editor fixture");
  return parsed.value;
}
const profileA = checkedProfile({
  schemaVersion: 2, accountId: `acct_${"a".repeat(32)}`, username: "alexmorgan",
  name: "Alex Morgan", bio: "Building thoughtful AI tools.", revision: 1,
  publication: "private", avatarRef: `avref_${"a".repeat(64)}`,
  links: { x: null, github: "https://github.com/alexmorgan", linkedin: null,
    website: "https://alex.example/", bluesky: null, instagram: null, telegram: null },
});
const profileB = checkedProfile({
  ...profileA, accountId: `acct_${"b".repeat(32)}`, username: "briarvale",
  name: "Briar Vale", bio: "A separate account and private draft.", revision: 4,
});
function initialProfile(scenario: string): SuiteProfileEditorV2 {
  if (scenario === "missing") return checkedProfile({ ...profileA, username: null });
  if (scenario === "privacy") return checkedProfile({
    ...profileA, name: privateCanaries[0], bio: privateCanaries[1],
    links: { ...profileA.links, website: `https://${privateCanaries[2]}.example/` },
  });
  return profileA;
}

type RecordedRequest = Readonly<{ transport: string; request: SuiteProfileUpdateV2 }>;
type Callback = Readonly<{ transport: string; accountId: string; revision: number }>;
type FixtureSnapshot = Readonly<{
  requests: readonly RecordedRequest[];
  callbacks: readonly Callback[];
  commits: readonly string[];
  mounted: boolean;
}>;
declare global {
  interface Window {
    publicProfileFixture: {
      dispatch: (action: string, payload: unknown) => void;
      snapshot: () => FixtureSnapshot;
    };
  }
}

const imported: unknown = await import(pathToFileURL(resolve("dist/profile-form.js")).href);
assert.ok(typeof imported === "object" && imported !== null
  && "SuitePublicProfileForm" in imported && typeof imported.SuitePublicProfileForm === "function",
"Missing built public profile form");
const PublicProfileForm = imported.SuitePublicProfileForm as
  (props: SuitePublicProfileFormProps) => ReturnType<typeof createElement>;

// The host supplies props/lifetime and a deferred external transport only. Every
// input, submit, validation, conflict, visibility and recovery path is production.
const fixtureSource = `
import { Activity, createElement, startTransition, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { hydrateRoot } from "react-dom/client";
import { SuitePublicProfileForm } from ${JSON.stringify(resolve("dist/profile-form.js"))};
const scenario = new URL(location.href).searchParams.get("scenario") || "standard";
const a = ${JSON.stringify(profileA)};
const b = ${JSON.stringify(profileB)};
const privacy = ${JSON.stringify(initialProfile("privacy"))};
const missing = ${JSON.stringify(initialProfile("missing"))};
const first = scenario === "privacy" ? privacy : scenario === "missing" ? missing : a;
const requests = [], callbacks = [], commits = [], deferred = [];
let replace, activity, mounted = false;
function settle(index, outcome) {
  const item = deferred[index];
  if (!item || item.settled) throw new Error("Invalid synthetic settlement");
  item.settled = true;
  if (outcome === "throw") { item.reject(new Error(${JSON.stringify(errorCanary)})); return; }
  if (["unauthorized", "username_required", "invalid_avatar"].includes(outcome)) {
    item.resolve({status:outcome}); return;
  }
  const request = item.request;
  if (outcome === "conflict") {
    item.resolve({status:"conflict", profile:{...item.profile, name:"Updated elsewhere",
      bio:"The saved version changed in another editor.", revision:request.expectedRevision+2,
      publication:"published", links:{...item.profile.links,website:"https://remote.example/"}}});
    return;
  }
  const profile = {...item.profile, name:request.name, bio:request.bio, links:request.links,
    avatarRef:request.avatarRef, revision:request.expectedRevision+1,
    publication:request.publication === "publish" ? "published" : "private"};
  item.resolve(outcome === "malformed" ? {status:"saved",profile,email:${JSON.stringify(errorCanary)}}
    : {status:"saved",profile});
}
window.publicProfileFixture = {
  dispatch(action, payload) {
    if (action === "settle") settle(payload.index, payload.outcome);
    else if (action === "replace") replace(payload);
    else if (action === "activity") activity(payload);
    else throw new Error("Unknown synthetic host action");
  },
  snapshot: () => ({requests,callbacks,commits,mounted}),
};
function Host() {
  const [state, setState] = useState({account:"a", replacement:false, mode:"visible"});
  const commitResolution = useRef(null);
  useLayoutEffect(() => {
    mounted = true;
    commits.push(state.account + ":" + state.mode + ":" + state.replacement);
    replace = (next) => {
      commitResolution.current = next.resolveDuringCommit ?? null;
      const update = () => setState(current => ({...current,account:next.account,replacement:next.replacement ?? false}));
      if (next.transition) startTransition(update); else flushSync(update);
    };
    activity = (mode) => flushSync(() => setState(current => ({...current,mode})));
    if (commitResolution.current !== null) {
      const index = commitResolution.current;
      commitResolution.current = null;
      settle(index,"saved");
    }
  }, [state]);
  const original = state.account === "a" ? first : b;
  const profile = state.replacement ? {...original,name:"Replacement snapshot",revision:99} : original;
  const transport = state.account + (state.replacement ? ":replacement" : ":original");
  return createElement(Activity, {mode:state.mode}, createElement(SuitePublicProfileForm, {
    className:"caller", initialProfile:profile,
    onSave(request) {
      requests.push({transport,request});
      return new Promise((resolve,reject) => deferred.push({resolve,reject,request,profile,settled:false}));
    },
    onSaved(saved) {
      callbacks.push({transport,accountId:saved.accountId,revision:saved.revision});
      if (scenario === "observer") throw new Error(${JSON.stringify(errorCanary)});
    },
  }));
}
hydrateRoot(document.getElementById("root"), createElement(Host), {
  onRecoverableError(error) { throw error; },
});
`;
const built = await Bun.build({
  entrypoints: ["public-profile-browser-fixture"],
  plugins: [{ name: "public-profile-browser-fixture", setup(build) {
    build.onResolve({ filter: /^public-profile-browser-fixture$/u }, () => ({ path: "fixture.js", namespace: "public-profile-fixture" }));
    build.onLoad({ filter: /.*/u, namespace: "public-profile-fixture" }, () => ({
      contents: fixtureSource, loader: "js", resolveDir: process.cwd(),
    }));
  } }],
  target: "browser", format: "esm", minify: true,
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
});
assert.ok(built.success, built.logs.map(String).join("\n"));
assert.equal(built.outputs.length, 1);
const javascript = await built.outputs[0]?.text();
assert.ok(javascript !== undefined);
const css = await readFile("dist/stylex.css", "utf8");
const fixtureCss = `*{box-sizing:border-box}body{margin:0;padding:24px;font:16px/1.5 sans-serif;background:white;color:rgb(20,30,40)}
main{max-width:560px;margin:auto}form.caller{gap:20px}h1{font-size:24px;line-height:1.2;margin:0 0 24px}
:root{--suite-profile-input-background:rgb(240,245,250);--suite-profile-line:rgb(80,90,100);--suite-profile-focus:rgb(30,100,210);--suite-profile-muted:rgb(90,100,110);--suite-profile-button-background:rgb(30,50,80);--suite-profile-button-foreground:rgb(250,250,250);--suite-profile-error:rgb(190,40,50)}
:root[data-theme="dark"]{color-scheme:dark;--suite-profile-input-background:rgb(25,30,35);--suite-profile-line:rgb(120,130,140);--suite-profile-focus:rgb(140,190,255);--suite-profile-muted:rgb(170,180,190);--suite-profile-button-background:rgb(210,220,230);--suite-profile-button-foreground:rgb(20,30,40);--suite-profile-error:rgb(255,140,150)}
:root[data-theme="dark"] body{background:rgb(10,15,20);color:rgb(235,240,245)}
`;
const evidence = await mkdtemp(join(tmpdir(), "suite-public-profile-browser-evidence-"));
console.log(`Public profile browser evidence: ${evidence}`);
const network: Array<Readonly<{ method: string; url: string; body: string }>> = [];
const checks: string[] = [];
const screenshots: string[] = [];
const errors: string[] = [];
const server = Bun.serve({ hostname: "127.0.0.1", port: 0, async fetch(request) {
  const url = new URL(request.url);
  network.push({ method: request.method, url: request.url, body: await request.text() });
  if (url.pathname === "/favicon.ico") return new Response(null, { status: 204 });
  if (url.pathname === "/fixture.js") return new Response(javascript, { headers: { "content-type": "text/javascript" } });
  if (url.pathname === "/stylex.css") return new Response(css, { headers: { "content-type": "text/css" } });
  if (url.pathname === "/fixture.css") return new Response(fixtureCss, { headers: { "content-type": "text/css" } });
  if (url.pathname !== "/" || request.method !== "GET") return new Response("Unexpected fixture request", { status: 400 });
  const scenario = url.searchParams.get("scenario") ?? "standard";
  const markup = renderToString(createElement(Activity, { mode: "visible", children: createElement(PublicProfileForm, {
    className: "caller", initialProfile: initialProfile(scenario),
    onSave: () => Promise.reject(new Error("SSR cannot save")),
  }) }));
  const theme = url.searchParams.get("theme") === "dark" ? "dark" : "light";
  const hydrate = url.searchParams.get("hydrate") !== "0";
  return new Response(`<!doctype html><html lang="en" data-theme="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/stylex.css"><link rel="stylesheet" href="/fixture.css"><title>Public profile verification</title></head><body><main><h1>Your shared profile</h1><div id="root">${markup}</div></main>${hydrate ? '<script type="module" src="/fixture.js"></script>' : ""}</body></html>`, {
    headers: { "content-type": "text/html", "cache-control": "no-store",
      "content-security-policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'none'; base-uri 'none'; form-action 'self'" },
  });
} });

let browser: Browser | undefined;
let lastPage: Page | undefined;
let passed = false;
let releaseHydration: (() => void) | undefined;
async function dispatch(page: Page, action: string, payload: unknown): Promise<void> {
  await page.evaluate(({ action, payload }) => window.publicProfileFixture.dispatch(action, payload), { action, payload });
}
async function snapshot(page: Page): Promise<FixtureSnapshot> {
  return page.evaluate(() => window.publicProfileFixture.snapshot());
}
async function requestAt(page: Page, index: number): Promise<RecordedRequest> {
  await page.waitForFunction(index => window.publicProfileFixture.snapshot().requests.length > index, index);
  const record = (await snapshot(page)).requests[index];
  assert.ok(record !== undefined);
  const parsed = parseSuiteProfileUpdateV2(record.request);
  assert.ok(parsed.ok);
  assert.deepEqual(Object.keys(record.request).sort(), ["avatarRef", "bio", "expectedRevision", "links", "name", "publication", "schemaVersion"]);
  assert.deepEqual(Object.keys(parsed.value.links).sort(), ["bluesky", "github", "instagram", "linkedin", "telegram", "website", "x"]);
  assert.equal(parsed.value.avatarRef, profileA.avatarRef, "Uneditable authority avatar is retained");
  return record;
}
async function settle(page: Page, index: number, outcome = "saved"): Promise<void> {
  await dispatch(page, "settle", { index, outcome });
  await page.waitForFunction(() => document.querySelector("form")?.getAttribute("aria-busy") === "false");
}
async function open(page: Page, scenario = "standard", query = ""): Promise<void> {
  await page.goto(`${server.url.href}?scenario=${scenario}${query}`);
  await page.waitForFunction(() => window.publicProfileFixture?.snapshot().mounted === true
    && document.querySelector("form")?.getAttribute("aria-busy") === "false");
}
async function noDraftLeak(page: Page): Promise<void> {
  assert.equal(await page.locator('input:not([type="radio"])[name],textarea[name]').count(), 0);
  assert.equal(await page.locator("input,textarea,button").count(), await page.locator("input:disabled,textarea:disabled,button:disabled").count());
  assert.deepEqual(await page.locator("form").evaluate(form => [...new FormData(form as HTMLFormElement).entries()]), []);
  assert.equal(await page.locator("form").getAttribute("method"), "post");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  assert.ok(!privateCanaries.some(value => page.url().includes(value)));
  assert.equal(network.some(request => request.method !== "GET" || privateCanaries.some(value => `${request.url}${request.body}`.includes(value))), false);
}
function observe(page: Page): void {
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("requestfailed", request => errors.push(`Failed request ${request.method()} ${request.url()}`));
  page.on("response", response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
}
async function screen(page: Page, name: string): Promise<void> {
  const path = join(evidence, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  screenshots.push(path);
}

try {
  const executable = process.env["CHROMIUM_EXECUTABLE_PATH"] ?? (process.platform === "darwin"
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "/usr/bin/google-chrome");
  await access(executable);
  browser = await chromium.launch({ executablePath: executable, headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  lastPage = page;
  observe(page);

  const noJsContext = await browser.newContext({ javaScriptEnabled: false });
  const noJs = await noJsContext.newPage();
  observe(noJs);
  await noJs.goto(`${server.url.href}?scenario=privacy&hydrate=0`);
  await noDraftLeak(noJs);
  assert.ok((await noJs.locator("noscript").textContent())?.includes("Enable JavaScript"));
  await noJsContext.close();
  checks.push("No-JavaScript SSR disables submission and has no named private fields or request/URL leakage");

  const hydrationGate = new Promise<void>(resolveGate => { releaseHydration = resolveGate; });
  await page.route("**/fixture.js", async route => { await hydrationGate; await route.continue(); });
  const hydrationRequest = page.waitForRequest(request => new URL(request.url()).pathname === "/fixture.js");
  await page.goto(`${server.url.href}?scenario=privacy`, { waitUntil: "commit" });
  await hydrationRequest;
  await page.locator("form").waitFor();
  await noDraftLeak(page);
  releaseHydration?.();
  await page.waitForFunction(() => document.querySelector("form")?.getAttribute("aria-busy") === "false");
  assert.equal((await snapshot(page)).requests.length, 0);
  assert.equal(await page.getByLabel("Public-facing name", { exact: true }).inputValue(), privateCanaries[0]);
  await page.unroute("**/fixture.js");
  checks.push("Delayed hydration retains the safe SSR boundary and enables editing without an implicit save");

  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await open(page, "standard", `&theme=${theme}`);
      for (const label of ["Public-facing name", "Bio", "X", "GitHub", "LinkedIn", "Website", "Bluesky", "Instagram", "Telegram"]) {
        assert.equal(await page.getByLabel(label, { exact: true }).count(), 1);
      }
      assert.equal(await page.getByLabel("Email", { exact: true }).count(), 0);
      assert.equal(await page.locator('input[type="file"],input[name="avatarRef"],img').count(), 0);
      assert.equal(await page.getByRole("group", { name: "Profile visibility" }).count(), 1);
      assert.equal(await page.getByRole("radio", { name: "Keep private", exact: true }).isChecked(), true);
      const style = await page.getByLabel("Public-facing name", { exact: true }).evaluate(element => {
        const value = getComputedStyle(element);
        return { background: value.backgroundColor, border: value.borderTopColor, width: value.minWidth };
      });
      assert.deepEqual(style, { background: theme === "light" ? "rgb(240, 245, 250)" : "rgb(25, 30, 35)",
        border: theme === "light" ? "rgb(80, 90, 100)" : "rgb(120, 130, 140)", width: "0px" });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      assert.equal(await page.locator("[style]").count(), 0);
      await page.keyboard.press("Tab");
      assert.equal(await page.getByLabel("Public-facing name", { exact: true }).evaluate(element => element.matches(":focus-visible") && getComputedStyle(element).outlineWidth === "2px"), true);
      await screen(page, `editor-${width}-${theme}`);
      checks.push(`Built native controls, seven links, token theme, keyboard focus and no overflow at ${width}px ${theme}`);
    }
  }

  await open(page);
  const name = page.getByLabel("Public-facing name", { exact: true });
  await name.fill("Published by keyboard");
  await page.getByRole("radio", { name: "Keep private", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.getByRole("radio", { name: "Publish profile", exact: true }).isChecked(), true);
  await page.getByRole("button", { name: "Publish profile", exact: true }).focus();
  await page.keyboard.press("Enter");
  assert.equal((await requestAt(page, 0)).request.publication, "publish");
  await settle(page, 0);
  assert.equal(await page.getByRole("status").textContent(), "Public profile saved.");
  assert.equal((await snapshot(page)).callbacks.length, 1);
  await page.getByRole("radio", { name: "Publish profile", exact: true }).focus();
  await page.keyboard.press("ArrowLeft");
  await page.getByRole("button", { name: "Make profile private", exact: true }).click();
  assert.equal((await requestAt(page, 1)).request.publication, "private");
  assert.equal((await requestAt(page, 1)).request.expectedRevision, 2);
  await settle(page, 1);
  assert.equal(await page.getByRole("status").textContent(), "Private profile saved.");
  checks.push("Native keyboard publication and explicit withdrawal send revision-bound seven-field requests");

  await open(page, "missing");
  assert.equal(await page.getByRole("radio", { name: "Publish profile", exact: true }).isDisabled(), true);
  assert.equal(await page.getByRole("radio", { name: "Keep private", exact: true }).isEnabled(), true);
  await page.getByRole("button", { name: "Save private profile" }).click();
  assert.equal((await requestAt(page, 0)).request.publication, "private");
  await settle(page, 0);
  assert.equal(await page.getByRole("status").textContent(), "Private profile saved.");
  checks.push("A missing username blocks publication without blocking a private save");

  await open(page);
  await name.fill("One dispatch only");
  await page.locator("form").evaluate(form => {
    const native = form as HTMLFormElement;
    native.requestSubmit(); native.requestSubmit();
  });
  await requestAt(page, 0);
  assert.equal((await snapshot(page)).requests.length, 1);
  assert.equal(await page.locator("input,textarea,button").count(), await page.locator("input:disabled,textarea:disabled,button:disabled").count());
  await settle(page, 0);
  checks.push("Two native same-tick submissions dispatch once before React paints pending state");

  await open(page);
  const github = page.getByLabel("GitHub", { exact: true });
  await github.fill("https://github.com/alexmorgan/private-repository");
  await page.getByRole("button", { name: "Save private profile" }).click();
  await page.getByRole("alert").filter({ hasText: "Enter a GitHub profile URL" }).waitFor();
  assert.equal((await snapshot(page)).requests.length, 0);
  assert.equal(await github.getAttribute("aria-invalid"), "true");
  const githubId = await github.getAttribute("id");
  assert.ok(githubId !== null);
  assert.equal(await github.getAttribute("aria-describedby"), `${githubId}-error`);
  assert.equal(await page.getByRole("alert").getAttribute("id"), `${githubId}-error`);
  assert.equal(await github.evaluate(element => document.activeElement === element), true);
  await github.fill("https://github.com/CorrectedUser");
  assert.equal(await github.getAttribute("aria-invalid"), null);
  await page.getByRole("button", { name: "Save private profile" }).click();
  assert.equal((await requestAt(page, 0)).request.links.github, "https://github.com/correcteduser");
  await settle(page, 0);
  checks.push("Invalid GitHub input dispatches nothing, exposes linked field errors and receives focus; correction submits normalized data");

  await open(page);
  await name.fill("Unsaved draft remains");
  await page.getByLabel("Bio", { exact: true }).fill("Do not silently replace this draft.");
  await page.getByRole("radio", { name: "Publish profile", exact: true }).check();
  await page.getByRole("button", { name: "Publish profile", exact: true }).click();
  await requestAt(page, 0);
  await settle(page, 0, "conflict");
  assert.equal(await name.inputValue(), "Unsaved draft remains");
  assert.equal(await page.getByLabel("Bio", { exact: true }).inputValue(), "Do not silently replace this draft.");
  assert.equal(await name.isDisabled(), true);
  assert.equal(await page.locator('input[type="radio"]:checked').count(), 0);
  assert.equal((await snapshot(page)).callbacks.length, 0);
  await screen(page, "conflict-preserved-desktop");
  await page.getByRole("button", { name: "Load latest profile", exact: true }).click();
  await page.waitForFunction(() => document.activeElement?.getAttribute("id")?.endsWith("-name") === true);
  assert.equal(await name.inputValue(), "Updated elsewhere");
  assert.equal(await page.locator('input[type="radio"]:checked').count(), 0);
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  assert.equal((await snapshot(page)).requests.length, 1, "No implicit publication or withdrawal after conflict");
  await page.getByRole("radio", { name: "Keep private", exact: true }).check();
  await page.getByRole("button", { name: "Make profile private", exact: true }).click();
  assert.equal((await requestAt(page, 1)).request.expectedRevision, 3);
  assert.equal((await requestAt(page, 1)).request.name, "Updated elsewhere");
  await settle(page, 1);
  checks.push("Conflict preserves draft; explicit Load latest focuses name and requires a fresh visibility choice");

  for (const outcome of ["throw", "malformed"]) {
    await open(page, "unknown");
    await name.fill("Retained after unknown outcome");
    await page.getByRole("button", { name: "Save private profile" }).click();
    await requestAt(page, 0);
    await settle(page, 0, outcome);
    await page.getByRole("alert").filter({ hasText: "could not be confirmed" }).waitFor();
    assert.equal(await name.inputValue(), "Retained after unknown outcome");
    assert.equal((await snapshot(page)).requests.length, 1);
    assert.equal((await snapshot(page)).callbacks.length, 0);
    assert.ok(!(await page.locator("body").innerText()).includes(errorCanary));
    await page.getByRole("button", { name: "Save private profile" }).click();
    assert.deepEqual((await requestAt(page, 1)).request, (await requestAt(page, 0)).request);
    await settle(page, 1);
    assert.equal(await page.getByRole("status").textContent(), "Private profile saved.");
  }
  checks.push("Thrown/malformed unknown outcomes preserve draft and require a manual same-revision retry without error leakage");

  for (const [outcome, message] of [["unauthorized", "Sign in again"], ["username_required", "reload this profile"], ["invalid_avatar", "image is unavailable"]]) {
    assert.ok(outcome !== undefined && message !== undefined);
    await open(page, "errors");
    await name.fill("Retained fixed-error draft");
    await page.getByRole("button", { name: "Save private profile" }).click();
    await requestAt(page, 0);
    await settle(page, 0, outcome);
    await page.getByRole("alert").filter({ hasText: message }).waitFor();
    assert.equal(await name.inputValue(), "Retained fixed-error draft");
    assert.equal((await snapshot(page)).callbacks.length, 0);
  }
  checks.push("Known session/username/avatar failures render fixed guidance without losing the draft");

  await open(page, "observer");
  await page.getByRole("button", { name: "Save private profile" }).click();
  await requestAt(page, 0);
  await settle(page, 0);
  assert.equal(await page.getByRole("status").textContent(), "Private profile saved.");
  await page.getByRole("alert").filter({ hasText: "was saved, but the page could not refresh" }).waitFor();
  assert.ok(!(await page.locator("body").innerText()).includes("could not be confirmed"));
  assert.ok(!(await page.locator("body").innerText()).includes(errorCanary));
  assert.equal((await snapshot(page)).callbacks.length, 1);
  checks.push("A throwing onSaved observer does not turn a committed save into an unknown outcome");

  await open(page, "lifetime");
  await name.fill("Mount-owned draft");
  await dispatch(page, "replace", { account: "a", replacement: true });
  assert.equal(await name.inputValue(), "Mount-owned draft");
  await page.getByRole("button", { name: "Save private profile" }).click();
  const owned = await requestAt(page, 0);
  assert.equal(owned.transport, "a:original");
  assert.equal(owned.request.expectedRevision, 1);
  await settle(page, 0);
  assert.deepEqual((await snapshot(page)).callbacks, [{ transport: "a:original", accountId: profileA.accountId, revision: 2 }]);
  checks.push("Same-account initial props and callbacks do not replace a mounted draft or retarget its transport");

  await open(page, "lifetime");
  await name.fill("Retired A promise");
  await page.getByRole("button", { name: "Save private profile" }).click();
  await requestAt(page, 0);
  await dispatch(page, "replace", { account: "b", resolveDuringCommit: 0, transition: true });
  await page.waitForFunction(() => window.publicProfileFixture.snapshot().commits.includes("b:visible:false"));
  await page.waitForFunction(() => document.querySelector("form")?.getAttribute("aria-busy") === "false");
  assert.equal(await name.inputValue(), profileB.name);
  assert.equal((await snapshot(page)).callbacks.length, 0);
  assert.equal(await page.getByRole("status").textContent(), "");
  await page.getByRole("button", { name: "Save private profile" }).click();
  assert.equal((await requestAt(page, 1)).transport, "b:original");
  await dispatch(page, "replace", { account: "a", resolveDuringCommit: 1 });
  assert.equal(await name.inputValue(), profileA.name);
  assert.equal((await snapshot(page)).callbacks.length, 0);
  checks.push("Transition and synchronous replacement commits suppress old promises resolved by the replacement layout effect");

  await open(page, "lifetime");
  await name.fill("First A instance");
  await page.getByRole("button", { name: "Save private profile" }).click();
  await requestAt(page, 0);
  await dispatch(page, "replace", { account: "b" });
  assert.equal(await name.inputValue(), profileB.name);
  await dispatch(page, "replace", { account: "a" });
  await settle(page, 0);
  assert.equal(await name.inputValue(), profileA.name);
  assert.equal((await snapshot(page)).callbacks.length, 0);
  await page.getByRole("button", { name: "Save private profile" }).click();
  await requestAt(page, 1);
  await settle(page, 1);
  assert.equal((await snapshot(page)).callbacks.length, 1);
  checks.push("A→B→A mounts cannot accept a late result belonging to the first A instance");

  await open(page, "activity");
  await name.fill("Draft retained through Activity");
  await page.getByRole("button", { name: "Save private profile" }).click();
  await requestAt(page, 0);
  await dispatch(page, "activity", "hidden");
  assert.equal(await page.locator("form").isVisible(), false);
  await dispatch(page, "settle", { index: 0, outcome: "saved" });
  await dispatch(page, "activity", "visible");
  await page.getByRole("alert").filter({ hasText: "could not be confirmed" }).waitFor();
  assert.equal(await name.inputValue(), "Draft retained through Activity");
  assert.equal(await page.locator("form").getAttribute("aria-busy"), "false");
  assert.equal((await snapshot(page)).requests.length, 1);
  assert.equal((await snapshot(page)).callbacks.length, 0);
  await page.setViewportSize({ width: 390, height: 1000 });
  await screen(page, "unconfirmed-recovery-mobile");
  await page.getByRole("button", { name: "Save private profile" }).click();
  assert.deepEqual((await requestAt(page, 1)).request, (await requestAt(page, 0)).request);
  await settle(page, 1);
  assert.equal((await snapshot(page)).callbacks.length, 1);
  checks.push("React 19 Activity hide/show recovers an unconfirmed retained draft without resending or accepting a hidden reply");

  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.getByRole("radio", { name: "Keep private", exact: true }).focus();
  assert.equal(await page.getByRole("radio", { name: "Keep private", exact: true }).evaluate(element => getComputedStyle(element).forcedColorAdjust), "auto");
  checks.push("Forced-color and reduced-motion modes preserve native radio behavior");
  assert.deepEqual(errors, []);
  assert.equal(network.some(request => request.method !== "GET" || privateCanaries.some(value => `${request.url}${request.body}`.includes(value))), false);
  assert.equal(network.some(request => new URL(request.url).pathname.includes("avatar")), false);
  passed = true;
  console.log(`Public profile browser verification passed: ${checks.length} scenarios. Evidence: ${evidence}`);
} finally {
  releaseHydration?.();
  if (!passed) console.error(`Public profile browser stopped after ${checks.length} checks: ${checks.at(-1) ?? "initial SSR boundary"}`);
  const diagnostic = !passed && lastPage !== undefined && !lastPage.isClosed()
    ? await lastPage.evaluate(() => ({
      readyState: document.readyState, fixtureMounted: window.publicProfileFixture?.snapshot().mounted ?? false,
      formBusy: document.querySelector("form")?.getAttribute("aria-busy"),
      enabledControls: document.querySelectorAll("input:enabled,textarea:enabled,button:enabled").length,
      fixtureRequests: window.publicProfileFixture?.snapshot().requests.length ?? 0,
    })).catch(() => null) : null;
  if (diagnostic !== null) console.error(JSON.stringify(diagnostic));
  try {
    await writeFile(join(evidence, "receipt.json"), `${JSON.stringify({
      browser: browser?.version(), passed, checks, errors, screenshots, diagnostic,
      requests: network.map(request => ({ method: request.method, path: new URL(request.url).pathname, bodyBytes: request.body.length })),
    }, null, 2)}\n`);
  } finally {
    try { await browser?.close(); } finally { await server.stop(true); }
  }
}
