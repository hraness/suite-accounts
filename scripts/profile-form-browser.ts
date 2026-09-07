import assert from "node:assert/strict";
import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser } from "playwright-core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SuiteProfileFormProps } from "../src/profile-form.js";
import type { SuiteProfileUpdateRequest, SuiteProfileView } from "../src/identity/profiles.js";
import { parseSuiteProfileUpdateRequest } from "../src/identity/profiles.js";

const initialProfile: SuiteProfileView = {
  bio: "A profile biography.", email: "reader@example.com", name: "Reader", revision: 0,
  links: { bluesky: null, instagram: null, linkedin: null, telegram: null, website: null, x: null },
};
const imported: unknown = await import(pathToFileURL(resolve("dist/profile-form.js")).href);
assert.ok(typeof imported === "object" && imported !== null && "SuiteProfileForm" in imported
  && typeof imported.SuiteProfileForm === "function", "Missing built profile form.");
const ProfileForm = imported.SuiteProfileForm as (props: SuiteProfileFormProps) => ReturnType<typeof createElement>;
const markup = renderToStaticMarkup(createElement(ProfileForm, {
  className: "caller", initialProfile, onSave: () => Promise.reject(new Error("SSR cannot save.")), submitLabel: "Save profile",
}));
const fixtureSource = `import { hydrateRoot } from "react-dom/client";
import { createElement } from "react";
import { SuiteProfileForm } from ${JSON.stringify(resolve("dist/profile-form.js"))};
hydrateRoot(document.getElementById("root"), createElement(SuiteProfileForm, {
  className: "caller", initialProfile: ${JSON.stringify(initialProfile)}, submitLabel: "Save profile",
  onSave: async (request) => {
    const response = await fetch("/save", {method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(request)});
    if (!response.ok) throw new Error("Synthetic save failure");
    return response.json();
  },
  onSaved: (profile) => { document.getElementById("saved").textContent = String(profile.revision); }
}));
document.documentElement.dataset.hydrated = "true";
`;
const built = await Bun.build({
  entrypoints: ["suite-profile-browser-fixture"],
  plugins: [{
    name: "suite-profile-browser-fixture",
    setup(build) {
      build.onResolve({ filter: /^suite-profile-browser-fixture$/u }, () => ({ path: "fixture.ts", namespace: "profile-fixture" }));
      build.onLoad({ filter: /.*/u, namespace: "profile-fixture" }, () => ({ contents: fixtureSource, loader: "ts", resolveDir: process.cwd() }));
    },
  }],
  target: "browser", format: "esm", minify: true,
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
});
assert.ok(built.success, built.logs.map(String).join("\n"));
assert.equal(built.outputs.length, 1);
const javascript = await built.outputs[0]?.text();
assert.ok(javascript !== undefined);
const css = await readFile("dist/stylex.css", "utf8");
const fixtureCss = `*{box-sizing:border-box}body{margin:0;padding:24px;font:16px/1.5 sans-serif;background:white;color:rgb(20,30,40)}
main{max-width:560px;margin:auto}form.caller{gap:24px;font-language-override:"ENG"}
:root{--suite-profile-input-background:rgb(240,245,250);--suite-profile-line:rgb(80,90,100);--suite-profile-focus:rgb(30,100,210);--suite-profile-muted:rgb(90,100,110);--suite-profile-button-background:rgb(30,50,80);--suite-profile-button-foreground:rgb(250,250,250);--suite-profile-error:rgb(190,40,50)}
:root[data-theme="dark"]{color-scheme:dark;--suite-profile-input-background:rgb(25,30,35);--suite-profile-line:rgb(120,130,140);--suite-profile-focus:rgb(140,190,255);--suite-profile-muted:rgb(170,180,190);--suite-profile-button-background:rgb(210,220,230);--suite-profile-button-foreground:rgb(20,30,40);--suite-profile-error:rgb(255,140,150)}
:root[data-theme="dark"] body{background:rgb(10,15,20);color:rgb(235,240,245)}
@layer components.hraness-suite-accounts.legacy{input,textarea,button{background-image:linear-gradient(red,blue);background-repeat:no-repeat;background-size:7px 8px;background-position:9px 10px;background-origin:content-box;background-clip:padding-box;background-attachment:fixed;border-image:linear-gradient(red,blue) 4 / 3 / 2 repeat;font:italic small-caps 900 10px/3 serif;font-language-override:"TRK";font-palette:light}}
.vertical form{writing-mode:vertical-rl}
`;
const requests: SuiteProfileUpdateRequest[] = [];
let releasePending: (() => void) | undefined;
const pending = new Promise<void>((resolvePending) => { releasePending = resolvePending; });
const executable = process.env["CHROMIUM_EXECUTABLE_PATH"] ?? (
  process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "/usr/bin/google-chrome"
);
await access(executable);
const evidence = await mkdtemp(join(tmpdir(), "suite-profile-browser-evidence-"));
const server = Bun.serve({
  hostname: "127.0.0.1", port: 0,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/favicon.ico") return new Response(null, { status: 204 });
    if (url.pathname === "/fixture.js") return new Response(javascript, { headers: { "content-type": "text/javascript" } });
    if (url.pathname === "/stylex.css") return new Response(css, { headers: { "content-type": "text/css" } });
    if (url.pathname === "/fixture.css") return new Response(fixtureCss, { headers: { "content-type": "text/css" } });
    if (url.pathname === "/save" && request.method === "POST") {
      const parsed = parseSuiteProfileUpdateRequest(await request.json());
      if (!parsed.ok) return new Response("Invalid request", { status: 400 });
      requests.push(parsed.value);
      if (requests.length === 1) {
        await pending;
        return Response.json({ profile: { ...initialProfile, name: "Remote reader", revision: 2 }, status: "conflict" });
      }
      if (requests.length === 2) {
        return Response.json({ profile: { ...initialProfile, bio: parsed.value.bio, links: parsed.value.links, name: parsed.value.name, revision: 3 }, status: "saved" });
      }
      return new Response("Synthetic save failure", { status: 503 });
    }
    if (url.pathname !== "/") return new Response("Not found", { status: 404 });
    const theme = url.searchParams.get("theme") === "dark" ? "dark" : "light";
    const hydrate = url.searchParams.get("hydrate") !== "0";
    return new Response(`<!doctype html><html lang="en" data-theme="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/stylex.css"><link rel="stylesheet" href="/fixture.css"><title>Profile form verification</title></head><body><main class="${url.searchParams.get("writing") === "vertical" ? "vertical" : "horizontal"}"><div id="root">${markup}</div><output id="saved"></output></main>${hydrate ? '<script type="module" src="/fixture.js"></script>' : ""}</body></html>`, {
      headers: { "content-type": "text/html", "content-security-policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'self'" },
    });
  },
});
let browser: Browser | undefined;
const errors: string[] = [];
const consoleErrors: Array<Readonly<{ text: string; url: string }>> = [];
const failedResponses: Array<Readonly<{ method: string; status: number; url: string }>> = [];
const checks: string[] = [];
let verificationPassed = false;
try {
  browser = await chromium.launch({ executablePath: executable, headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() !== "error") return;
    const error = { text: message.text(), url: message.location().url };
    consoleErrors.push(error);
    console.error(`Browser console error at ${error.url}: ${error.text}`);
  });
  page.on("response", response => {
    if (response.status() >= 400) failedResponses.push({ method: response.request().method(), status: response.status(), url: response.url() });
  });
  page.on("requestfailed", request => {
    errors.push(`Failed browser request ${request.method()} ${request.url()}: ${request.failure()?.errorText ?? "unknown failure"}`);
  });
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"]) {
      await page.goto(`${server.url.href}?hydrate=0&theme=${theme}`);
      const style = await page.getByLabel("Name", { exact: true }).evaluate(element => {
        const value = getComputedStyle(element);
        return { background: value.backgroundColor, image: value.backgroundImage, position: value.backgroundPosition, size: value.backgroundSize, repeat: value.backgroundRepeat, attachment: value.backgroundAttachment, clip: value.backgroundClip, origin: value.backgroundOrigin, borderImage: value.borderImageSource, fontWeight: value.fontWeight, fontStyle: value.fontStyle, lineHeight: value.lineHeight, paddingTop: value.paddingTop, paddingLeft: value.paddingLeft };
      });
      assert.equal(style.background, theme === "light" ? "rgb(240, 245, 250)" : "rgb(25, 30, 35)");
      assert.equal(style.image, "none");
      assert.match(style.position, /^(?:0%|0px) (?:0%|0px)$/u);
      assert.ok(style.size === "auto" || style.size === "auto auto");
      assert.equal(style.repeat, "repeat");
      assert.equal(style.attachment, "scroll");
      assert.equal(style.clip, "border-box");
      assert.equal(style.origin, "padding-box");
      assert.equal(style.borderImage, "none");
      assert.equal(style.fontWeight, "400");
      assert.equal(style.fontStyle, "normal");
      assert.equal(style.lineHeight, "22.4px");
      assert.equal(style.paddingTop, "11.2px");
      assert.equal(style.paddingLeft, "12px");
      const fontBoundary = await page.locator("input,textarea,button").evaluateAll(elements => elements.map(element => {
        const value = getComputedStyle(element);
        return { language: value.getPropertyValue("font-language-override"), palette: value.getPropertyValue("font-palette") };
      }));
      assert.equal(fontBoundary.length, 10);
      for (const value of fontBoundary) {
        assert.equal(value.language, '"ENG"', "font: inherit includes its reset-only language override");
        assert.equal(value.palette, "light", "font: inherit must not reset the independently cascaded palette");
      }
      assert.equal(await page.locator("form").evaluate(element => getComputedStyle(element).gap), "24px");
      assert.equal(await page.getByLabel("Email", { exact: true }).getAttribute("readonly"), "");
      assert.equal(await page.getByLabel("Email", { exact: true }).evaluate(element => getComputedStyle(element).opacity), "0.72");
      assert.equal(await page.getByLabel("Email", { exact: true }).evaluate(element => getComputedStyle(element).color), theme === "light" ? "rgb(90, 100, 110)" : "rgb(170, 180, 190)");
      assert.equal(await page.getByLabel("Name", { exact: true }).evaluate(element => getComputedStyle(element).borderTopColor), theme === "light" ? "rgb(80, 90, 100)" : "rgb(120, 130, 140)");
      assert.equal(await page.getByRole("button").evaluate(element => getComputedStyle(element).backgroundColor), theme === "light" ? "rgb(30, 50, 80)" : "rgb(210, 220, 230)");
      assert.equal(await page.getByRole("button").evaluate(element => getComputedStyle(element).color), theme === "light" ? "rgb(250, 250, 250)" : "rgb(20, 30, 40)");
      assert.equal(await page.locator("[style]").count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      await page.keyboard.press("Tab");
      assert.equal(await page.getByLabel("Name", { exact: true }).evaluate(element => element.matches(":focus-visible") && getComputedStyle(element).outlineWidth === "2px" && getComputedStyle(element).outlineOffset === "2px"), true);
      assert.equal(await page.getByLabel("Name", { exact: true }).evaluate(element => getComputedStyle(element).outlineColor), theme === "light" ? "rgb(30, 100, 210)" : "rgb(140, 190, 255)");
      await page.screenshot({ path: join(evidence, `ssr-${width}-${theme}.png`), fullPage: true });
      checks.push(`SSR native controls, resets, caller override, focus, and ${theme} theme at ${width}px`);
    }
  }
  await page.goto(`${server.url.href}?hydrate=0&writing=vertical`);
  const vertical = await page.getByLabel("Name", { exact: true }).evaluate(element => {
    const style = getComputedStyle(element);
    return { writing: style.writingMode, paddingTop: style.paddingTop, paddingLeft: style.paddingLeft, minWidth: style.minWidth, minInlineSize: style.minInlineSize };
  });
  assert.deepEqual(vertical, { writing: "vertical-rl", paddingTop: "11.2px", paddingLeft: "12px", minWidth: "0px", minInlineSize: "auto" });
  checks.push("Vertical writing preserves physical width, minimum width, and padding");
  await page.goto(server.url.href);
  await page.waitForFunction(() => document.documentElement.dataset["hydrated"] === "true");
  await page.getByLabel("Name", { exact: true }).fill("Updated reader");
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.waitForFunction(() => document.querySelector("form")?.getAttribute("aria-busy") === "true");
  assert.equal(await page.locator("input:disabled,textarea:disabled").count(), 8);
  assert.equal(await page.getByRole("button").evaluate(element => getComputedStyle(element).cursor), "wait");
  assert.equal(await page.getByRole("button").evaluate(element => getComputedStyle(element).opacity), "0.6");
  assert.equal(Number(requests.length), 1);
  assert.equal(requests[0]?.expectedRevision, 0);
  assert.equal(requests[0]?.name, "Updated reader");
  assert.ok(!("email" in (requests[0] ?? {})));
  releasePending?.();
  await page.getByRole("alert").filter({ hasText: "changed elsewhere" }).waitFor();
  assert.equal(await page.getByLabel("Name", { exact: true }).inputValue(), "Remote reader");
  assert.equal(await page.locator("#saved").textContent(), "");
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.waitForFunction(() => document.querySelector("#saved")?.textContent === "3");
  assert.equal(requests[1]?.expectedRevision, 2);
  const websiteId = await page.getByLabel("Personal Website", { exact: true }).getAttribute("id");
  assert.ok(websiteId !== null && websiteId.endsWith("-website"));
  // The existing native label also contains its conditional field error. Bind
  // the already label-verified control before that text changes its name.
  const website = page.locator(`input[id=${JSON.stringify(websiteId)}]`);
  await website.fill("http://invalid.example");
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.getByRole("alert").filter({ hasText: "complete HTTPS URL" }).waitFor();
  assert.equal(await page.getByRole("alert").evaluate(element => getComputedStyle(element).color), "rgb(190, 40, 50)");
  assert.equal(Number(requests.length), 2);
  assert.equal(await website.getAttribute("aria-invalid"), "true");
  assert.equal(await website.getAttribute("aria-describedby"), `${websiteId}-error`);
  assert.equal(await page.getByRole("alert").getAttribute("id"), `${websiteId}-error`);
  await website.fill("https://reader.example");
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.getByRole("alert").filter({ hasText: "could not be saved" }).waitFor();
  assert.equal(requests[2]?.expectedRevision, 3);
  await page.screenshot({ path: join(evidence, "hydrated-error.png"), fullPage: true });
  checks.push("Hydration, native pending/disabled, conflict revision replay, saved callback, field validation, and transport failure");
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.getByLabel("Name", { exact: true }).focus();
  assert.equal(await page.getByLabel("Name", { exact: true }).evaluate(element => getComputedStyle(element).forcedColorAdjust), "auto");
  checks.push("Forced-color and reduced-motion controls preserve native user-agent behavior");
  assert.deepEqual(errors, []);
  const saveUrl = new URL("/save", server.url).href;
  assert.deepEqual(failedResponses, [{ method: "POST", status: 503, url: saveUrl }]);
  const expectedNetworkError = "Failed to load resource: the server responded with a status of 503 (Service Unavailable)";
  const allowedErrors = consoleErrors.filter(error => error.url === saveUrl && error.text === expectedNetworkError);
  assert.ok(allowedErrors.length <= 1, "Only the single intentional failed save may log its exact HTTP 503 error.");
  assert.deepEqual(consoleErrors.filter(error => !allowedErrors.includes(error)), [], "Unexpected browser console errors.");
  verificationPassed = true;
  console.log(`Profile browser verification passed: ${checks.length} scenarios, ${requests.length} native submissions. Evidence: ${evidence}`);
} finally {
  try {
    await writeFile(join(evidence, "receipt.json"), `${JSON.stringify({ browser: browser?.version(), checks, consoleErrors, errors, failedResponses, passed: verificationPassed, requests: requests.length }, null, 2)}\n`);
  } finally {
    releasePending?.();
    try { await browser?.close(); } finally { await server.stop(true); }
  }
}
