"use client";
// src/identity/profiles.ts
import { err, isRecord, ok } from "@hraness/result";

// src/immutable.ts
function deepFreeze(value) {
  const visited = new WeakSet;
  function freezeOwned(current) {
    if (current === null || typeof current !== "object")
      return;
    if (visited.has(current))
      return;
    visited.add(current);
    for (const key of Reflect.ownKeys(current)) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (descriptor !== undefined && "value" in descriptor) {
        freezeOwned(descriptor.value);
      }
    }
    Object.freeze(current);
  }
  freezeOwned(value);
  return value;
}

// src/identity/profiles.ts
var SUITE_PROFILE_NAME_MAX_LENGTH = 120;
var SUITE_PROFILE_BIO_MAX_LENGTH = 1000;
var SUITE_PROFILE_URL_MAX_LENGTH = 2048;
var SUITE_COMMUNITY_APPLICATION_STATUSES = deepFreeze([
  "submitted",
  "accepted",
  "declined",
  "withdrawn"
]);
var PROFILE_LINK_KEYS = [
  "bluesky",
  "instagram",
  "linkedin",
  "telegram",
  "website",
  "x"
];
function exactKeys(value, expected) {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length && actual.every((key, index) => key === sortedExpected[index]);
}
function hasInvalidSingleLineControl(value) {
  for (let index = 0;index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code >= 127 && code <= 159)
      return true;
  }
  return false;
}
function hasInvalidBioControl(value) {
  for (let index = 0;index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 && code !== 10 || code >= 127 && code <= 159) {
      return true;
    }
  }
  return false;
}
function normalizedName(value) {
  if (typeof value !== "string") {
    return err({ field: "name", reason: "required" });
  }
  if (hasInvalidSingleLineControl(value)) {
    return err({ field: "name", reason: "invalid" });
  }
  const name = value.trim().replace(/\s+/gu, " ");
  if (name.length === 0) {
    return err({ field: "name", reason: "required" });
  }
  return name.length <= SUITE_PROFILE_NAME_MAX_LENGTH ? ok(name) : err({ field: "name", reason: "too_long" });
}
function normalizedProfileViewName(value) {
  if (typeof value !== "string") {
    return err({ field: "name", reason: "invalid" });
  }
  if (hasInvalidSingleLineControl(value)) {
    return err({ field: "name", reason: "invalid" });
  }
  const name = value.trim().replace(/\s+/gu, " ");
  return name.length <= SUITE_PROFILE_NAME_MAX_LENGTH ? ok(name) : err({ field: "name", reason: "too_long" });
}
function normalizedBio(value) {
  if (typeof value !== "string") {
    return err({ field: "bio", reason: "invalid" });
  }
  const normalizedNewlines = value.replaceAll(`\r
`, `
`).replaceAll("\r", `
`);
  if (hasInvalidBioControl(normalizedNewlines)) {
    return err({ field: "bio", reason: "invalid" });
  }
  const bio = normalizedNewlines.trim();
  return bio.length <= SUITE_PROFILE_BIO_MAX_LENGTH ? ok(bio) : err({ field: "bio", reason: "too_long" });
}
function parsedHttpsUrl(value, options) {
  if (value.length === 0 || value.length > SUITE_PROFILE_URL_MAX_LENGTH || hasInvalidSingleLineControl(value) || value.trim() !== value) {
    return null;
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.hash !== "" || url.port !== "" || !options.allowQuery && url.search !== "" || options.hosts !== undefined && !options.hosts.has(url.hostname.toLowerCase())) {
    return null;
  }
  return url;
}
function simpleHandle(value, pattern) {
  const withoutAt = value.startsWith("@") ? value.slice(1) : value;
  return pattern.test(withoutAt) ? withoutAt.toLowerCase() : null;
}
function exactPathSegments(url) {
  const segments = url.pathname.split("/").filter(Boolean);
  return url.pathname === `/${segments.join("/")}` || url.pathname === `/${segments.join("/")}/` ? segments : null;
}
var X_HOSTS = new Set(["x.com", "www.x.com", "twitter.com", "www.twitter.com"]);
var INSTAGRAM_HOSTS = new Set(["instagram.com", "www.instagram.com"]);
var TELEGRAM_HOSTS = new Set([
  "t.me",
  "www.t.me",
  "telegram.me",
  "www.telegram.me"
]);
var BLUESKY_HOSTS = new Set(["bsky.app", "www.bsky.app"]);
var LINKEDIN_HOSTS = new Set(["linkedin.com", "www.linkedin.com"]);
function normalizedX(value) {
  const enteredHandle = simpleHandle(value, /^[A-Za-z0-9_]{1,15}$/u);
  if (enteredHandle !== null)
    return `https://x.com/${enteredHandle}`;
  const url = parsedHttpsUrl(value, { allowQuery: false, hosts: X_HOSTS });
  const segments = url === null ? null : exactPathSegments(url);
  const handle = segments?.length === 1 ? simpleHandle(segments[0], /^[A-Za-z0-9_]{1,15}$/u) : null;
  return handle === null ? null : `https://x.com/${handle}`;
}
function normalizedInstagram(value) {
  const pattern = /^(?!.*\.\.)[A-Za-z0-9](?:[A-Za-z0-9._]{0,28}[A-Za-z0-9_])?$/u;
  const enteredHandle = simpleHandle(value, pattern);
  if (enteredHandle !== null) {
    return `https://www.instagram.com/${enteredHandle}`;
  }
  const url = parsedHttpsUrl(value, {
    allowQuery: false,
    hosts: INSTAGRAM_HOSTS
  });
  const segments = url === null ? null : exactPathSegments(url);
  const handle = segments?.length === 1 ? simpleHandle(segments[0], pattern) : null;
  return handle === null ? null : `https://www.instagram.com/${handle}`;
}
function normalizedTelegram(value) {
  const enteredHandle = simpleHandle(value, /^[A-Za-z][A-Za-z0-9_]{4,31}$/u);
  if (enteredHandle !== null)
    return `https://t.me/${enteredHandle}`;
  const url = parsedHttpsUrl(value, {
    allowQuery: false,
    hosts: TELEGRAM_HOSTS
  });
  const segments = url === null ? null : exactPathSegments(url);
  const handle = segments?.length === 1 ? simpleHandle(segments[0], /^[A-Za-z][A-Za-z0-9_]{4,31}$/u) : null;
  return handle === null ? null : `https://t.me/${handle}`;
}
function validBlueskyHandle(value) {
  if (value.length < 3 || value.length > 253 || !value.includes(".") || value.startsWith(".") || value.endsWith(".")) {
    return false;
  }
  const labels = value.split(".");
  return labels.every((label) => label.length >= 1 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(label));
}
function normalizedBluesky(value) {
  const withoutAt = value.startsWith("@") ? value.slice(1) : value;
  const enteredHandle = withoutAt.toLowerCase();
  if (validBlueskyHandle(enteredHandle)) {
    return `https://bsky.app/profile/${enteredHandle}`;
  }
  const url = parsedHttpsUrl(value, {
    allowQuery: false,
    hosts: BLUESKY_HOSTS
  });
  const segments = url === null ? null : exactPathSegments(url);
  const handle = segments?.length === 2 && segments[0] === "profile" ? segments[1].toLowerCase() : null;
  return handle !== null && validBlueskyHandle(handle) ? `https://bsky.app/profile/${handle}` : null;
}
function normalizedLinkedIn(value) {
  const url = parsedHttpsUrl(value, {
    allowQuery: false,
    hosts: LINKEDIN_HOSTS
  });
  const segments = url === null ? null : exactPathSegments(url);
  if (segments?.length !== 2 || segments[0] !== "in" || !/^[A-Za-z0-9][A-Za-z0-9-]{1,99}$/u.test(segments[1])) {
    return null;
  }
  return `https://www.linkedin.com/in/${segments[1].toLowerCase()}`;
}
function normalizedWebsite(value) {
  const url = parsedHttpsUrl(value, { allowQuery: true });
  return url === null ? null : url.href;
}
function normalizeSuiteProfileLink(key, value) {
  if (value === null)
    return ok(null);
  if (typeof value !== "string") {
    return err({ field: key, reason: "invalid" });
  }
  const trimmed = value.trim();
  if (trimmed.length === 0)
    return ok(null);
  const normalized = (() => {
    switch (key) {
      case "x":
        return normalizedX(trimmed);
      case "linkedin":
        return normalizedLinkedIn(trimmed);
      case "bluesky":
        return normalizedBluesky(trimmed);
      case "instagram":
        return normalizedInstagram(trimmed);
      case "telegram":
        return normalizedTelegram(trimmed);
      case "website":
        return normalizedWebsite(trimmed);
    }
  })();
  return normalized === null ? err({ field: key, reason: "invalid" }) : ok(normalized);
}
function parsedLinks(value, canonicalOnly) {
  if (!isRecord(value) || !exactKeys(value, PROFILE_LINK_KEYS)) {
    return err({ field: "profile", reason: "invalid" });
  }
  const links = {
    bluesky: null,
    instagram: null,
    linkedin: null,
    telegram: null,
    website: null,
    x: null
  };
  for (const key of PROFILE_LINK_KEYS) {
    const parsed = normalizeSuiteProfileLink(key, value[key]);
    if (!parsed.ok)
      return parsed;
    if (canonicalOnly && parsed.value !== value[key]) {
      return err({ field: key, reason: "invalid" });
    }
    links[key] = parsed.value;
  }
  return ok(links);
}
function nonnegativeInteger(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
function parsedEmail(value) {
  return typeof value === "string" && value.length <= 320 && value.trim() === value && !hasInvalidSingleLineControl(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value) ? value : null;
}
function parseSuiteProfileUpdateRequest(value) {
  if (!isRecord(value) || !exactKeys(value, ["bio", "expectedRevision", "links", "name"])) {
    return err({ field: "profile", reason: "invalid" });
  }
  const name = normalizedName(value["name"]);
  if (!name.ok)
    return name;
  const bio = normalizedBio(value["bio"]);
  if (!bio.ok)
    return bio;
  const links = parsedLinks(value["links"], false);
  if (!links.ok)
    return links;
  const expectedRevision = nonnegativeInteger(value["expectedRevision"]);
  if (expectedRevision === null) {
    return err({ field: "expectedRevision", reason: "invalid" });
  }
  return ok({
    bio: bio.value,
    expectedRevision,
    links: links.value,
    name: name.value
  });
}
function parseSuiteProfileView(value) {
  if (!isRecord(value) || !exactKeys(value, ["bio", "email", "links", "name", "revision"])) {
    return err({ field: "profile", reason: "invalid" });
  }
  const name = normalizedProfileViewName(value["name"]);
  const bio = normalizedBio(value["bio"]);
  const links = parsedLinks(value["links"], true);
  const email = parsedEmail(value["email"]);
  const revision = nonnegativeInteger(value["revision"]);
  if (!name.ok)
    return name;
  if (!bio.ok)
    return bio;
  if (!links.ok)
    return links;
  if (email === null)
    return err({ field: "email", reason: "invalid" });
  if (revision === null) {
    return err({ field: "expectedRevision", reason: "invalid" });
  }
  if (name.value !== value["name"] || bio.value !== value["bio"]) {
    return err({ field: "profile", reason: "invalid" });
  }
  return ok({
    bio: bio.value,
    email,
    links: links.value,
    name: name.value,
    revision
  });
}
function isApplicationStatus(value) {
  return typeof value === "string" && SUITE_COMMUNITY_APPLICATION_STATUSES.includes(value);
}
function parsedApplication(value) {
  if (value === null)
    return ok(null);
  if (!isRecord(value) || !exactKeys(value, [
    "community",
    "status",
    "submittedAtMs",
    "updatedAtMs"
  ]) || value["community"] !== "oh-computer" || !isApplicationStatus(value["status"])) {
    return err({ field: "application", reason: "invalid" });
  }
  const submittedAtMs = nonnegativeInteger(value["submittedAtMs"]);
  const updatedAtMs = nonnegativeInteger(value["updatedAtMs"]);
  if (submittedAtMs === null || updatedAtMs === null || updatedAtMs < submittedAtMs) {
    return err({ field: "application", reason: "invalid" });
  }
  return ok({
    community: "oh-computer",
    status: value["status"],
    submittedAtMs,
    updatedAtMs
  });
}
function parseSuiteCommunityProfileView(value) {
  if (!isRecord(value) || !exactKeys(value, ["application", "profile"])) {
    return err({ field: "profile", reason: "invalid" });
  }
  const application = parsedApplication(value["application"]);
  if (!application.ok)
    return application;
  const profile = parseSuiteProfileView(value["profile"]);
  return profile.ok ? ok({ application: application.value, profile: profile.value }) : profile;
}

// src/profile-form.tsx
import {
  useId,
  useState
} from "react";
import { jsx, jsxs } from "react/jsx-runtime";
function withoutFieldError(errors, field) {
  const next = { ...errors };
  delete next[field];
  return next;
}
var LINK_FIELDS = [
  ["x", "X"],
  ["linkedin", "LinkedIn"],
  ["bluesky", "BlueSky"],
  ["instagram", "Instagram"],
  ["telegram", "Telegram"],
  ["website", "Personal Website"]
];
function linkInputs(profile) {
  return {
    bluesky: profile.links.bluesky ?? "",
    instagram: profile.links.instagram ?? "",
    linkedin: profile.links.linkedin ?? "",
    telegram: profile.links.telegram ?? "",
    website: profile.links.website ?? "",
    x: profile.links.x ?? ""
  };
}
function issueMessage(issue) {
  if (issue.field === "name") {
    return issue.reason === "required" ? "Enter a name." : `Use ${SUITE_PROFILE_NAME_MAX_LENGTH} characters or fewer.`;
  }
  if (issue.field === "bio") {
    return `Use ${SUITE_PROFILE_BIO_MAX_LENGTH} characters or fewer.`;
  }
  if (issue.field === "linkedin")
    return "Enter a LinkedIn profile URL.";
  if (issue.field === "website")
    return "Enter a complete HTTPS URL.";
  if (issue.field === "x" || issue.field === "bluesky" || issue.field === "instagram" || issue.field === "telegram") {
    const label = LINK_FIELDS.find(([key]) => key === issue.field)?.[1] ?? "profile";
    return `Enter a valid ${label} handle or profile URL.`;
  }
  return "Check the profile and try again.";
}
function applyProfile(profile, setters) {
  setters.setBio(profile.bio);
  setters.setEmail(profile.email);
  setters.setLinks(linkInputs(profile));
  setters.setName(profile.name);
  setters.setRevision(profile.revision);
}
function SuiteProfileForm({
  className,
  initialProfile,
  onSave,
  onSaved,
  submitLabel
}) {
  const id = useId();
  const [name, setName] = useState(initialProfile.name);
  const [email, setEmail] = useState(initialProfile.email);
  const [bio, setBio] = useState(initialProfile.bio);
  const [links, setLinks] = useState(() => linkInputs(initialProfile));
  const [revision, setRevision] = useState(initialProfile.revision);
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  async function submit(event) {
    event.preventDefault();
    if (pending)
      return;
    setFieldErrors({});
    setFormError(null);
    const parsed = parseSuiteProfileUpdateRequest({
      bio,
      expectedRevision: revision,
      links,
      name
    });
    if (!parsed.ok) {
      setFieldErrors({
        [parsed.error.field]: issueMessage(parsed.error)
      });
      return;
    }
    setPending(true);
    try {
      const result = await onSave(parsed.value);
      applyProfile(result.profile, {
        setBio,
        setEmail,
        setLinks,
        setName,
        setRevision
      });
      if (result.status === "conflict") {
        setFormError("The profile changed elsewhere. Review it and save again.");
        return;
      }
      onSaved?.(result.profile);
    } catch {
      setFormError("The profile could not be saved. Try again.");
    } finally {
      setPending(false);
    }
  }
  const formClassName = className === undefined ? "suite-profile-form" : `suite-profile-form ${className}`;
  return /* @__PURE__ */ jsxs("form", {
    "aria-busy": pending,
    className: formClassName,
    onSubmit: (event) => {
      submit(event);
    },
    children: [
      /* @__PURE__ */ jsxs("label", {
        className: "suite-profile-field",
        htmlFor: `${id}-name`,
        children: [
          /* @__PURE__ */ jsx("span", {
            children: "Name"
          }),
          /* @__PURE__ */ jsx("input", {
            "aria-describedby": fieldErrors.name === undefined ? undefined : `${id}-name-error`,
            "aria-invalid": fieldErrors.name === undefined ? undefined : "true",
            autoComplete: "name",
            disabled: pending,
            id: `${id}-name`,
            maxLength: SUITE_PROFILE_NAME_MAX_LENGTH,
            onChange: (event) => {
              setName(event.currentTarget.value);
              setFieldErrors((errors) => withoutFieldError(errors, "name"));
            },
            required: true,
            type: "text",
            value: name
          }),
          fieldErrors.name === undefined ? null : /* @__PURE__ */ jsx("span", {
            className: "suite-profile-error",
            id: `${id}-name-error`,
            role: "alert",
            children: fieldErrors.name
          })
        ]
      }),
      /* @__PURE__ */ jsxs("label", {
        className: "suite-profile-field",
        htmlFor: `${id}-email`,
        children: [
          /* @__PURE__ */ jsx("span", {
            children: "Email"
          }),
          /* @__PURE__ */ jsx("input", {
            "aria-readonly": "true",
            autoComplete: "email",
            id: `${id}-email`,
            readOnly: true,
            type: "email",
            value: email
          })
        ]
      }),
      /* @__PURE__ */ jsxs("label", {
        className: "suite-profile-field",
        htmlFor: `${id}-bio`,
        children: [
          /* @__PURE__ */ jsx("span", {
            children: "Bio"
          }),
          /* @__PURE__ */ jsx("textarea", {
            "aria-describedby": fieldErrors.bio === undefined ? undefined : `${id}-bio-error`,
            "aria-invalid": fieldErrors.bio === undefined ? undefined : "true",
            disabled: pending,
            id: `${id}-bio`,
            maxLength: SUITE_PROFILE_BIO_MAX_LENGTH,
            onChange: (event) => {
              setBio(event.currentTarget.value);
              setFieldErrors((errors) => withoutFieldError(errors, "bio"));
            },
            placeholder: "Introduce yourself",
            rows: 5,
            value: bio
          }),
          fieldErrors.bio === undefined ? null : /* @__PURE__ */ jsx("span", {
            className: "suite-profile-error",
            id: `${id}-bio-error`,
            role: "alert",
            children: fieldErrors.bio
          })
        ]
      }),
      LINK_FIELDS.map(([key, label]) => {
        const error = fieldErrors[key];
        return /* @__PURE__ */ jsxs("label", {
          className: "suite-profile-field",
          htmlFor: `${id}-${key}`,
          children: [
            /* @__PURE__ */ jsx("span", {
              children: label
            }),
            /* @__PURE__ */ jsx("input", {
              "aria-describedby": error === undefined ? undefined : `${id}-${key}-error`,
              "aria-invalid": error === undefined ? undefined : "true",
              autoCapitalize: "none",
              autoComplete: "url",
              disabled: pending,
              id: `${id}-${key}`,
              inputMode: "url",
              maxLength: 2048,
              onChange: (event) => {
                const value = event.currentTarget.value;
                setLinks((current) => ({ ...current, [key]: value }));
                setFieldErrors((errors) => withoutFieldError(errors, key));
              },
              spellCheck: false,
              type: "text",
              value: links[key]
            }),
            error === undefined ? null : /* @__PURE__ */ jsx("span", {
              className: "suite-profile-error",
              id: `${id}-${key}-error`,
              role: "alert",
              children: error
            })
          ]
        }, key);
      }),
      formError === null ? null : /* @__PURE__ */ jsx("p", {
        className: "suite-profile-error",
        role: "alert",
        children: formError
      }),
      /* @__PURE__ */ jsx("button", {
        disabled: pending,
        type: "submit",
        children: submitLabel
      })
    ]
  });
}
export {
  SuiteProfileForm
};
