import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { SuiteProfileForm } from "./profile-form";

test("renders the shared profile contract without an editable email payload", () => {
  const html = renderToStaticMarkup(
    <SuiteProfileForm
      initialProfile={{
        bio: "",
        email: "reader@example.com",
        links: {
          bluesky: null,
          instagram: null,
          linkedin: null,
          telegram: null,
          website: null,
          x: null,
        },
        name: "Reader",
        revision: 0,
      }}
      onSave={() => Promise.reject(new Error("not submitted in markup test"))}
      submitLabel="Request access"
    />,
  );

  for (const label of [
    "Name",
    "Email",
    "Bio",
    "X",
    "LinkedIn",
    "BlueSky",
    "Instagram",
    "Telegram",
    "Personal Website",
  ]) {
    expect(html).toContain(`>${label}</span>`);
  }
  expect(html).toContain('placeholder="Introduce yourself"');
  expect(html).toContain('value="reader@example.com"');
  expect(html).toContain("readOnly");
  expect(html).not.toContain('name="email"');
  expect(html).toContain(">Request access</button>");
});
