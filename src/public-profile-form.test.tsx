import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { parseSuiteProfileEditorV2, type SuiteProfileEditorV2 } from "./identity/profiles-v2.js";
import { SuitePublicProfileForm } from "./profile-form.js";

function profile(overrides: Record<string, unknown> = {}): SuiteProfileEditorV2 {
  const parsed = parseSuiteProfileEditorV2({
    schemaVersion: 2, accountId: "acct_11111111111111111111111111111111",
    username: "reader", name: "Reader", bio: "A short biography.", revision: 1,
    links: { x: null, github: null, linkedin: null, website: null, bluesky: null, instagram: null, telegram: null },
    avatarRef: null, publication: "private", ...overrides,
  });
  if (!parsed.ok) throw new Error("Invalid synthetic editor fixture.");
  return parsed.value;
}

function render(initialProfile = profile()) {
  return renderToStaticMarkup(<SuitePublicProfileForm initialProfile={initialProfile}
    onSave={() => Promise.reject(new Error("SSR must never save."))} />);
}

test("public editor uses native labeled fields without sign-in or avatar controls", () => {
  const html = render();
  for (const label of ["Public-facing name", "Bio", "X", "GitHub", "LinkedIn", "Website", "Bluesky", "Instagram", "Telegram"]) {
    expect(html).toContain(`>${label}</label>`);
  }
  expect(html).toContain("Profile visibility</legend>");
  expect(html).toContain("Save private profile</button>");
  expect(html).not.toContain('type="email"');
  expect(html).not.toContain('type="file"');
  expect(html).not.toContain("acct_1111");
  expect(html).not.toContain("style=");
  expect(html).toContain("suite-public-profile-form");
});

test("SSR is hydration-closed and has no native private-field submission names", () => {
  const html = render(profile({ name: "PRIVATE_DRAFT_CANARY", bio: "PRIVATE_BIO_CANARY" }));
  expect(html).toContain('method="post"');
  expect(html).toContain('aria-busy="true"');
  expect(html).toContain("<noscript>");
  expect(html).toContain("Enable JavaScript");
  for (const field of ["name", "bio", "x", "github", "linkedin", "website", "bluesky", "instagram", "telegram"]) {
    expect(html).not.toContain(`name="${field}"`);
  }
  const textControls = html.match(/<(?:input|textarea)\b[^>]*(?:type="text"|rows="4")[^>]*>/gu) ?? [];
  expect(textControls).toHaveLength(9);
  for (const control of textControls) expect(control).toContain("disabled");
  expect(html).toMatch(/<fieldset[^>]*disabled/u);
  expect(html).toMatch(/<button[^>]*disabled/u);
});

test("initial private and published state have distinct committing actions", () => {
  const privateHtml = render();
  const publicHtml = render(profile({ publication: "published" }));
  expect(privateHtml).toContain("The saved profile is private.");
  expect(publicHtml).toContain("The saved profile for @reader is public.");
  expect(publicHtml).toContain("Save public profile</button>");
  expect(publicHtml).toMatch(/checked=""[^>]*value="publish"/u);
});

test("missing username and zero-revision defaults never acquire a public identity", () => {
  const html = render(profile({ username: null, name: "", bio: "", revision: 0 }));
  expect(html).toContain("Choose a username in account settings before publishing.");
  expect(html).toContain("You can still save privately.");
  expect(html).not.toContain("@null");
  expect(html).not.toContain('value="Reader"');
  expect(html).toMatch(/disabled=""[^>]*value="publish"/u);
});

test("malformed initial values render a fixed error without evaluating getters", () => {
  let reads = 0;
  const malformed = { ...profile(), get name() { reads++; return "PRIVATE_INVALID_CANARY"; } };
  const html = render(malformed);
  expect(reads).toBe(0);
  expect(html).toContain("The profile is unavailable.");
  expect(html).not.toContain("PRIVATE_INVALID_CANARY");
  expect(html).not.toContain("<form");
});

test("avatar references remain outside the DOM and social text is escaped", () => {
  const ref = `avref_${"2".repeat(64)}`;
  const html = render(profile({ name: "<script>private</script>", avatarRef: ref }));
  expect(html).not.toContain(ref);
  expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;script&gt;private&lt;/script&gt;");
});
