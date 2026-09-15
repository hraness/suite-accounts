"use client";
// src/identity/consumers.ts
import { err, ok } from "@hraness/result";

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

// src/identity/consumers.ts
var SUITE_CONSUMER_IDS = deepFreeze([
  "accounts",
  "act60",
  "elders",
  "soundfish",
  "oh-computer",
  "draw-money",
  "oprte",
  "sponge"
]);
var LEGACY_SUITE_CONSUMER_IDS = deepFreeze([
  "kitchen"
]);
function parseSuiteConsumerId(value) {
  switch (value) {
    case "accounts":
    case "act60":
    case "elders":
    case "soundfish":
    case "oh-computer":
    case "draw-money":
    case "oprte":
    case "sponge":
      return ok(value);
    case "kitchen":
      return ok("oprte");
    default:
      return err("invalid-consumer");
  }
}

// src/registry.ts
var SUITE_ACCOUNTS_REMOTE_ENVIRONMENTS = deepFreeze([
  "production"
]);
var accountsCookies = deepFreeze({
  chunked: ["account_data", "session_data"],
  names: [
    "account_data",
    "convex_jwt",
    "dont_remember",
    "session_data",
    "session_token"
  ]
});
var consumerCookies = deepFreeze({
  chunked: ["session_data"],
  names: ["dont_remember", "session_data", "session_token"]
});
var SUITE_ACCOUNTS_DEPLOYMENTS = deepFreeze({
  production: {
    accountsOrigin: "https://account.hraness.com",
    convexSiteUrl: "https://qualified-marmot-22.convex.site",
    convexUrl: "https://qualified-marmot-22.convex.cloud"
  }
});
function unsupported(siteUrl) {
  return { billingReturn: { kind: "unsupported" }, siteUrl };
}
function oidcSite(id, displayName, productionSiteUrl) {
  return {
    auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
    displayName,
    environments: {
      production: unsupported(productionSiteUrl)
    },
    id
  };
}
var SUITE_ACCOUNTS_REGISTERED_CONSUMER_IDS = deepFreeze([
  "accounts",
  "act60",
  "elders",
  "soundfish",
  "oh-computer",
  "draw-money",
  "sponge"
]);
var SUITE_ACCOUNTS_CONSUMERS = deepFreeze({
  accounts: {
    auth: {
      basePath: "/api/auth",
      cookies: accountsCookies,
      kind: "authority"
    },
    displayName: "Accounts",
    environments: {
      production: {
        billingReturn: { kind: "supported", path: "/account" },
        siteUrl: "https://account.hraness.com"
      }
    },
    id: "accounts"
  },
  act60: oidcSite("act60", "ACT60", "https://act60.me"),
  elders: oidcSite("elders", "Elders", "https://elders.hraness.com"),
  soundfish: {
    auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
    displayName: "Soundfish",
    environments: {
      production: unsupported("https://sound.fish")
    },
    id: "soundfish"
  },
  "oh-computer": oidcSite("oh-computer", "Oh", "https://oh.computer"),
  "draw-money": {
    auth: {
      basePath: "/api/auth",
      cookies: consumerCookies,
      kind: "proxy"
    },
    displayName: "Draw Money",
    environments: {
      production: unsupported("https://draw.money")
    },
    id: "draw-money"
  },
  sponge: oidcSite("sponge", "Sponge", "https://spongesearch.com")
});
var SUITE_ACCOUNTS_CURRENT_ORIGIN_OVERRIDES = deepFreeze({
  sponge: {
    production: unsupported("https://sponge.computer")
  }
});
var SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS = deepFreeze([
  "accounts",
  "act60",
  "elders",
  "soundfish",
  "oh-computer",
  "hra",
  "sponge",
  "subcounter",
  "slackorgs",
  "peopleblade",
  "aicharts",
  "hraness"
]);
function currentOidcSite(id, displayName, productionSiteUrl) {
  return {
    auth: { basePath: "/api/suite-auth", kind: "oidc-rp" },
    displayName,
    environments: {
      production: unsupported(productionSiteUrl)
    },
    id
  };
}
var SUITE_ACCOUNTS_CURRENT_CONSUMERS = deepFreeze({
  accounts: SUITE_ACCOUNTS_CONSUMERS.accounts,
  act60: SUITE_ACCOUNTS_CONSUMERS.act60,
  elders: SUITE_ACCOUNTS_CONSUMERS.elders,
  soundfish: SUITE_ACCOUNTS_CONSUMERS.soundfish,
  "oh-computer": SUITE_ACCOUNTS_CONSUMERS["oh-computer"],
  hra: currentOidcSite("hra", "Oompa", "https://oompa.app"),
  sponge: currentOidcSite("sponge", "Sponge", SUITE_ACCOUNTS_CURRENT_ORIGIN_OVERRIDES.sponge.production.siteUrl),
  subcounter: currentOidcSite("subcounter", "Subcounter", "https://subcounter.com"),
  slackorgs: currentOidcSite("slackorgs", "BigDataDepot", "https://bigdatadepot.com"),
  peopleblade: currentOidcSite("peopleblade", "PeopleBlade", "https://peopleblade.com"),
  aicharts: currentOidcSite("aicharts", "AI Charts", "https://aicharts.io"),
  hraness: currentOidcSite("hraness", "Hraness", "https://hraness.com")
});
var SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS = deepFreeze([
  "accounts",
  "act60",
  "elders",
  "soundfish",
  "oh-computer",
  "sponge"
]);
var SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS = deepFreeze(SUITE_ACCOUNTS_REGISTERED_CONSUMER_IDS.filter((consumer) => SUITE_ACCOUNTS_CONSUMERS[consumer].auth.kind === "oidc-rp"));
function suiteAccountsConsumerRequiresEmailOtp(consumer) {
  return SUITE_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS.includes(consumer);
}
var SUITE_ACCOUNTS_LINKED_OIDC_CONSUMER_IDS = deepFreeze([
  "soundfish"
]);
var SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS = deepFreeze(SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS.filter((consumer) => SUITE_ACCOUNTS_CURRENT_CONSUMERS[consumer].auth.kind === "oidc-rp"));
var SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS = deepFreeze([
  "soundfish",
  "hra",
  "peopleblade"
]);
function isSuiteAccountsConsumerId(value) {
  return typeof value === "string" && SUITE_CONSUMER_IDS.includes(value);
}
function isSuiteAccountsRegisteredConsumerId(value) {
  return typeof value === "string" && SUITE_ACCOUNTS_REGISTERED_CONSUMER_IDS.includes(value);
}
function isSuiteAccountsOidcConsumerId(value) {
  return isSuiteAccountsRegisteredConsumerId(value) && SUITE_ACCOUNTS_CONSUMERS[value].auth.kind === "oidc-rp";
}
function isSuiteAccountsLinkedOidcConsumerId(value) {
  return SUITE_ACCOUNTS_LINKED_OIDC_CONSUMER_IDS.includes(value);
}
function isSuiteAccountsOAuthConsumerId(value) {
  return isSuiteAccountsRegisteredConsumerId(value) && SUITE_ACCOUNTS_CONSUMERS[value].auth.kind === "oidc-rp";
}
function isSuiteAccountsCurrentConsumerId(value) {
  return typeof value === "string" && SUITE_ACCOUNTS_CURRENT_CONSUMER_IDS.includes(value);
}
function isSuiteAccountsCurrentOidcConsumerId(value) {
  return getSuiteAccountsCurrentConsumer(value).auth.kind === "oidc-rp";
}
function isSuiteAccountsCurrentLinkedOidcConsumerId(value) {
  return SUITE_ACCOUNTS_CURRENT_LINKED_OIDC_CONSUMER_IDS.includes(value);
}
function isSuiteAccountsCurrentOAuthConsumerId(value) {
  return getSuiteAccountsCurrentConsumer(value).auth.kind === "oidc-rp";
}
function suiteAccountsCurrentConsumerRequiresEmailOtp(consumer) {
  return SUITE_ACCOUNTS_CURRENT_EMAIL_OTP_REQUIRED_OIDC_CONSUMER_IDS.includes(consumer);
}
function getSuiteAccountsConsumer(consumer) {
  return SUITE_ACCOUNTS_CONSUMERS[consumer];
}
function getSuiteAccountsConsumerEnvironment(consumer, environment) {
  if (!isSuiteAccountsRegisteredConsumerId(consumer))
    return null;
  const registration = getSuiteAccountsConsumer(consumer);
  return registration.environments[environment] ?? null;
}
function getSuiteAccountsCurrentConsumer(consumer) {
  return SUITE_ACCOUNTS_CURRENT_CONSUMERS[consumer];
}
function getSuiteAccountsCurrentConsumerEnvironment(consumer, environment) {
  if (!isSuiteAccountsCurrentConsumerId(consumer))
    return null;
  return getSuiteAccountsCurrentConsumer(consumer).environments[environment] ?? null;
}
function isSuiteAccountsActiveConsumerId(value) {
  return SUITE_ACCOUNTS_ACTIVE_CONSUMER_IDS.includes(value);
}
function getSuiteAccountsDeployment(environment) {
  return SUITE_ACCOUNTS_DEPLOYMENTS[environment];
}

// src/public-profile-form.tsx
import { useCallback, useEffect, useId, useRef, useState } from "react";

// src/identity/profiles.ts
import { err as err2, isRecord, ok as ok2 } from "@hraness/result";
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
    return err2({ field: "name", reason: "required" });
  }
  if (hasInvalidSingleLineControl(value)) {
    return err2({ field: "name", reason: "invalid" });
  }
  const name = value.trim().replace(/\s+/gu, " ");
  if (name.length === 0) {
    return err2({ field: "name", reason: "required" });
  }
  return name.length <= SUITE_PROFILE_NAME_MAX_LENGTH ? ok2(name) : err2({ field: "name", reason: "too_long" });
}
function normalizedProfileViewName(value) {
  if (typeof value !== "string") {
    return err2({ field: "name", reason: "invalid" });
  }
  if (hasInvalidSingleLineControl(value)) {
    return err2({ field: "name", reason: "invalid" });
  }
  const name = value.trim().replace(/\s+/gu, " ");
  return name.length <= SUITE_PROFILE_NAME_MAX_LENGTH ? ok2(name) : err2({ field: "name", reason: "too_long" });
}
function normalizedBio(value) {
  if (typeof value !== "string") {
    return err2({ field: "bio", reason: "invalid" });
  }
  const normalizedNewlines = value.replaceAll(`\r
`, `
`).replaceAll("\r", `
`);
  if (hasInvalidBioControl(normalizedNewlines)) {
    return err2({ field: "bio", reason: "invalid" });
  }
  const bio = normalizedNewlines.trim();
  return bio.length <= SUITE_PROFILE_BIO_MAX_LENGTH ? ok2(bio) : err2({ field: "bio", reason: "too_long" });
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
    return ok2(null);
  if (typeof value !== "string") {
    return err2({ field: key, reason: "invalid" });
  }
  const trimmed = value.trim();
  if (trimmed.length === 0)
    return ok2(null);
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
  return normalized === null ? err2({ field: key, reason: "invalid" }) : ok2(normalized);
}
function parsedLinks(value, canonicalOnly) {
  if (!isRecord(value) || !exactKeys(value, PROFILE_LINK_KEYS)) {
    return err2({ field: "profile", reason: "invalid" });
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
      return err2({ field: key, reason: "invalid" });
    }
    links[key] = parsed.value;
  }
  return ok2(links);
}
function nonnegativeInteger(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
function parsedEmail(value) {
  return typeof value === "string" && value.length <= 320 && value.trim() === value && !hasInvalidSingleLineControl(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value) ? value : null;
}
function parseSuiteProfileUpdateRequest(value) {
  if (!isRecord(value) || !exactKeys(value, ["bio", "expectedRevision", "links", "name"])) {
    return err2({ field: "profile", reason: "invalid" });
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
    return err2({ field: "expectedRevision", reason: "invalid" });
  }
  return ok2({
    bio: bio.value,
    expectedRevision,
    links: links.value,
    name: name.value
  });
}
function parseSuiteProfileView(value) {
  if (!isRecord(value) || !exactKeys(value, ["bio", "email", "links", "name", "revision"])) {
    return err2({ field: "profile", reason: "invalid" });
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
    return err2({ field: "email", reason: "invalid" });
  if (revision === null) {
    return err2({ field: "expectedRevision", reason: "invalid" });
  }
  if (name.value !== value["name"] || bio.value !== value["bio"]) {
    return err2({ field: "profile", reason: "invalid" });
  }
  return ok2({
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
    return ok2(null);
  if (!isRecord(value) || !exactKeys(value, [
    "community",
    "status",
    "submittedAtMs",
    "updatedAtMs"
  ]) || value["community"] !== "oh-computer" || !isApplicationStatus(value["status"])) {
    return err2({ field: "application", reason: "invalid" });
  }
  const submittedAtMs = nonnegativeInteger(value["submittedAtMs"]);
  const updatedAtMs = nonnegativeInteger(value["updatedAtMs"]);
  if (submittedAtMs === null || updatedAtMs === null || updatedAtMs < submittedAtMs) {
    return err2({ field: "application", reason: "invalid" });
  }
  return ok2({
    community: "oh-computer",
    status: value["status"],
    submittedAtMs,
    updatedAtMs
  });
}
function parseSuiteCommunityProfileView(value) {
  if (!isRecord(value) || !exactKeys(value, ["application", "profile"])) {
    return err2({ field: "profile", reason: "invalid" });
  }
  const application = parsedApplication(value["application"]);
  if (!application.ok)
    return application;
  const profile = parseSuiteProfileView(value["profile"]);
  return profile.ok ? ok2({ application: application.value, profile: profile.value }) : profile;
}

// src/identity/profiles-v2.ts
import { err as err5, ok as ok5 } from "@hraness/result";

// src/identity/identifiers.ts
import { err as err3, ok as ok3 } from "@hraness/result";
var suiteAccountIdPattern = /^acct_[0-9a-f]{32}$/u;
var suiteInvoiceRefPattern = /^invref_[0-9a-f]{32}$/u;
var uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
function parseSuiteAccountId(value) {
  return typeof value === "string" && suiteAccountIdPattern.test(value) ? ok3(value) : err3("invalid-suite-account-id");
}
function parseSuiteInvoiceRef(value) {
  return typeof value === "string" && suiteInvoiceRefPattern.test(value) ? ok3(value) : err3("invalid-suite-invoice-ref");
}
function generateSuiteAccountId(randomUuid = () => crypto.randomUUID()) {
  const uuid = randomUuid();
  if (!uuidPattern.test(uuid)) {
    throw new TypeError("The suite account ID source did not return a UUID.");
  }
  const candidate = `acct_${uuid.replaceAll("-", "").toLowerCase()}`;
  const parsed = parseSuiteAccountId(candidate);
  if (!parsed.ok) {
    throw new TypeError("The suite account ID source produced an invalid value.");
  }
  return parsed.value;
}
function generateSuiteInvoiceRef(randomUuid = () => crypto.randomUUID()) {
  const uuid = randomUuid();
  if (!uuidPattern.test(uuid)) {
    throw new TypeError("The suite invoice reference source did not return a UUID.");
  }
  const candidate = `invref_${uuid.replaceAll("-", "").toLowerCase()}`;
  const parsed = parseSuiteInvoiceRef(candidate);
  if (!parsed.ok) {
    throw new TypeError("The suite invoice reference source produced an invalid value.");
  }
  return parsed.value;
}

// src/identity/usernames.ts
import { err as err4, ok as ok4 } from "@hraness/result";
var SUITE_USERNAME_MIN_LENGTH = 3;
var SUITE_USERNAME_MAX_LENGTH = 24;
var suiteUsernamePattern = /^[a-z0-9](?:[a-z0-9]|[-_](?=[a-z0-9]))*[a-z0-9]$/u;
var reservedSuiteUsernames = new Set([
  "account",
  "accounts",
  "admin",
  "api",
  "auth",
  "billing",
  "design",
  "docs",
  "help",
  "hraness",
  "login",
  "logout",
  "new",
  "newsletter",
  "party",
  "place",
  "preview",
  "pub",
  "root",
  "settings",
  "social-image",
  "source",
  "sources",
  "support",
  "system",
  "user",
  "users",
  "www"
]);
function validateCanonicalSuiteUsername(value) {
  if (value.length < SUITE_USERNAME_MIN_LENGTH) {
    return err4("suite-username-too-short");
  }
  if (value.length > SUITE_USERNAME_MAX_LENGTH) {
    return err4("suite-username-too-long");
  }
  if (!suiteUsernamePattern.test(value)) {
    return err4("invalid-suite-username");
  }
  return ok4(value);
}
function normalizeSuiteUsername(value) {
  if (typeof value !== "string")
    return err4("invalid-suite-username");
  for (let index = 0;index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code > 127 || code < 32 || code === 127) {
      return err4("invalid-suite-username");
    }
  }
  const trimmed = value.trim();
  const parsed = validateCanonicalSuiteUsername(trimmed.toLowerCase());
  if (!parsed.ok)
    return parsed;
  return reservedSuiteUsernames.has(parsed.value) ? err4("suite-username-reserved") : parsed;
}
function parseSuiteUsername(value) {
  if (typeof value !== "string")
    return err4("invalid-suite-username");
  const parsed = validateCanonicalSuiteUsername(value);
  return parsed.ok && parsed.value === value ? parsed : err4(parsed.ok ? "invalid-suite-username" : parsed.error);
}

// src/identity/profiles-v2.ts
var LINK_KEYS = [
  "bluesky",
  "github",
  "instagram",
  "linkedin",
  "telegram",
  "website",
  "x"
];
var PUBLIC_KEYS = [
  "schemaVersion",
  "accountId",
  "username",
  "name",
  "bio",
  "links",
  "avatarRef",
  "revision"
];
var EDITOR_KEYS = [...PUBLIC_KEYS, "publication"];
var UPDATE_KEYS = [
  "schemaVersion",
  "expectedRevision",
  "name",
  "bio",
  "links",
  "avatarRef",
  "publication"
];
var MAX_INPUT_TEXT_LENGTH = 32768;
var AVATAR_PATTERN = /^avref_(?!0{64}$)[0-9a-f]{64}$/u;
function issue(field = "profile", reason = "invalid") {
  return deepFreeze(err5({ field, reason }));
}
function success(value) {
  return deepFreeze(ok5(value));
}
function snapshot(value, keys) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null)
    return null;
  const actual = Reflect.ownKeys(value);
  if (actual.length !== keys.length)
    return null;
  const copy = Object.create(null);
  for (const key of actual) {
    if (typeof key !== "string" || !keys.includes(key))
      return null;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      return null;
    }
    const field = descriptor.value;
    copy[key] = field;
  }
  return copy;
}
function nonnegativeInteger2(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function parseSuiteAvatarRef(value) {
  return typeof value === "string" && value.length === 70 && AVATAR_PATTERN.test(value) ? success(value) : issue("avatarRef");
}
function optionalAvatar(value) {
  return value === null ? success(null) : parseSuiteAvatarRef(value);
}
function legacyIssue(error) {
  const field = error.field === "application" || error.field === "email" ? "profile" : error.field;
  return issue(field, error.reason);
}
function normalizeSuiteProfileLinkV2(key, value) {
  if (typeof key !== "string" || !LINK_KEYS.some((candidate) => candidate === key)) {
    return issue();
  }
  const field = key;
  if (value !== null && typeof value !== "string")
    return issue(field);
  if (typeof value === "string" && value.length > SUITE_PROFILE_URL_MAX_LENGTH) {
    return issue(field, "too_long");
  }
  if (field === "github") {
    if (value === null || value === "")
      return success(null);
    if (/[^\x21-\x7e]/u.test(value))
      return issue("github");
    const match = /^https:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_-]{1,100})\/?$/iu.exec(value);
    return match === null || match[0] !== value ? issue("github") : success(`https://github.com/${match[1].toLowerCase()}`);
  }
  const parsed = normalizeSuiteProfileLink(field, value);
  if (!parsed.ok)
    return legacyIssue(parsed.error);
  if (parsed.value !== null && parsed.value.length > SUITE_PROFILE_URL_MAX_LENGTH) {
    return issue(field, "too_long");
  }
  return success(parsed.value);
}
function parsedContent(value, canonical) {
  for (const field of ["name", "bio"]) {
    if (typeof value[field] === "string" && value[field].length > MAX_INPUT_TEXT_LENGTH) {
      return issue(field, "too_long");
    }
  }
  const inputLinks = snapshot(value["links"], LINK_KEYS);
  if (inputLinks === null)
    return issue();
  const links = {
    bluesky: null,
    github: null,
    instagram: null,
    linkedin: null,
    telegram: null,
    website: null,
    x: null
  };
  for (const key of LINK_KEYS) {
    const result = normalizeSuiteProfileLinkV2(key, inputLinks[key]);
    if (!result.ok)
      return result;
    if (canonical && result.value !== inputLinks[key])
      return issue(key);
    links[key] = result.value;
  }
  const parsed = parseSuiteProfileUpdateRequest({
    expectedRevision: 0,
    name: value["name"],
    bio: value["bio"],
    links: {
      bluesky: links.bluesky,
      instagram: links.instagram,
      linkedin: links.linkedin,
      telegram: links.telegram,
      website: links.website,
      x: links.x
    }
  });
  if (!parsed.ok)
    return legacyIssue(parsed.error);
  if (canonical && (parsed.value.name !== value["name"] || parsed.value.bio !== value["bio"])) {
    return issue();
  }
  return success({ name: parsed.value.name, bio: parsed.value.bio, links });
}
function parseView(input, editor) {
  try {
    const value = snapshot(input, editor ? EDITOR_KEYS : PUBLIC_KEYS);
    if (value === null)
      return issue();
    if (value["schemaVersion"] !== 2)
      return issue("schemaVersion");
    const accountId = parseSuiteAccountId(value["accountId"]);
    if (!accountId.ok)
      return issue("accountId");
    const username = editor && value["username"] === null ? success(null) : parseSuiteUsername(value["username"]);
    if (!username.ok)
      return issue("username");
    const revision = value["revision"];
    if (!nonnegativeInteger2(revision) || !editor && revision === 0)
      return issue("revision");
    const avatarRef = optionalAvatar(value["avatarRef"]);
    if (!avatarRef.ok)
      return avatarRef;
    const publication = value["publication"];
    if (editor && publication !== "private" && publication !== "published") {
      return issue("publication");
    }
    if (editor && publication === "published" && username.value === null)
      return issue("username");
    let content;
    if (revision === 0) {
      const links = snapshot(value["links"], LINK_KEYS);
      if (value["name"] !== "" || value["bio"] !== "" || avatarRef.value !== null || publication !== "private" || links === null || LINK_KEYS.some((key) => links[key] !== null))
        return issue();
      content = {
        name: "",
        bio: "",
        links: {
          bluesky: null,
          github: null,
          instagram: null,
          linkedin: null,
          telegram: null,
          website: null,
          x: null
        }
      };
    } else {
      const parsed = parsedContent(value, true);
      if (!parsed.ok)
        return parsed;
      content = parsed.value;
    }
    const profile = {
      schemaVersion: 2,
      accountId: accountId.value,
      ...content,
      avatarRef: avatarRef.value,
      revision
    };
    if (editor && (publication === "private" || publication === "published")) {
      return success({ ...profile, username: username.value, publication });
    }
    if (username.value === null)
      return issue("username");
    return success({ ...profile, username: username.value });
  } catch {
    return issue();
  }
}
function parseSuitePublicProfileV2(value) {
  const parsed = parseView(value, false);
  if (!parsed.ok)
    return parsed;
  if (parsed.value.username === null || isEditor(parsed.value))
    return issue();
  return success({ ...parsed.value, username: parsed.value.username });
}
function parseSuiteProfileEditorV2(value) {
  const parsed = parseView(value, true);
  if (!parsed.ok)
    return parsed;
  return isEditor(parsed.value) ? success(parsed.value) : issue();
}
function isEditor(value) {
  return Object.hasOwn(value, "publication");
}
function parseSuiteProfileUpdateV2(input) {
  try {
    const value = snapshot(input, UPDATE_KEYS);
    if (value === null)
      return issue();
    if (value["schemaVersion"] !== 2)
      return issue("schemaVersion");
    const expectedRevision = value["expectedRevision"];
    if (!nonnegativeInteger2(expectedRevision))
      return issue("expectedRevision");
    const publication = value["publication"];
    if (publication !== "publish" && publication !== "private")
      return issue("publication");
    const avatarRef = optionalAvatar(value["avatarRef"]);
    if (!avatarRef.ok)
      return avatarRef;
    const content = parsedContent(value, false);
    if (!content.ok)
      return content;
    return success({
      schemaVersion: 2,
      expectedRevision,
      ...content.value,
      avatarRef: avatarRef.value,
      publication
    });
  } catch {
    return issue();
  }
}
function avatarUrl(ref, path) {
  const parsed = parseSuiteAvatarRef(ref);
  return parsed.ok ? success(`${getSuiteAccountsDeployment("production").accountsOrigin}${path}/${parsed.value}.webp`) : parsed;
}
function suiteProfileAvatarPublicUrl(ref) {
  return avatarUrl(ref, "/suite/profile/avatar/v1");
}
function suiteProfileAvatarEditorUrl(ref) {
  return avatarUrl(ref, "/api/profile/avatar/v1");
}

// src/profile-form.stylex.ts
var profileFormClasses = {
  affix: {
    className: "x6s0dn4 x1w9dvvm xxut2h2 x5goj4r x1y0btm7 xmkeg23 x78zum5 xeuugli xc4xxb1 x1p4mulw x1fanpfn x14xc8xn x16gxa91"
  }.className,
  affixInput: {
    className: "xjbqb8w xc342km x1heor9g x1iyjqo2 xs83m0k xjb2p0i x1qlqyl8 x1t35e8 x1pd3egz x37zpob x19hwnzc x1t137rt xvgi8cs x15u6esi x33uob6 x15y8ph0"
  }.className,
  affixLead: {
    className: "x6s0dn4 x5ee4ez x78zum5 x2lah0s x1qzg9v8 x1rcpt3j x79ra4s xuxw1ft"
  }.className,
  choice: {
    className: "x6s0dn4 x1ypdohk x78zum5 x5m0csh xgbkey0"
  }.className,
  button: {
    className: "x1fdtg7e x1u7o2vf x1jfjhf8 x18o3ruo x12koezg x1y4qj14 x182nak8 x103pssi x9ox504 x1y0btm7 xmkeg23 x18sabzy x1jleocg x1pjjote x1e53mt7 xgkqhyc x1e6avla xz46ci x1ypdohk xjb0foi xjb2p0i x1qlqyl8 x1xh6y1q x1t35e8 x1aazh3f x1xlr1w8 x10rt0pk xvmqkbn x1rcybi7 x61gc8y xd4aj15 xkyhvkk x15bjb6t x1lqcxt8 xfqoyci x4odjur x9dzeaa x52dz5p x1flg24d xo8l03z x7s97pk x9v5kkp x784prv"
  }.className,
  control: {
    className: "x1fdtg7e x1u7o2vf x1w9dvvm x18o3ruo x12koezg x1y4qj14 x182nak8 x103pssi xxut2h2 x1y0btm7 xmkeg23 x18sabzy x1jleocg x1pjjote x1e53mt7 xgkqhyc x5goj4r x1heor9g xjb2p0i x1qlqyl8 x1xh6y1q x1t35e8 x1aazh3f x1pd3egz x10rt0pk xvmqkbn x1rcybi7 x61gc8y xd4aj15 xkyhvkk x37zpob xeuugli xvgi8cs x79ra4s x33uob6 x15y8ph0 xh8yej3 xo8l03z x7s97pk x9v5kkp x784prv"
  }.className,
  email: {
    className: "x1fdtg7e x1u7o2vf x1w9dvvm x18o3ruo x12koezg x1y4qj14 x182nak8 x103pssi xxut2h2 x1y0btm7 xmkeg23 x18sabzy x1jleocg x1pjjote x1e53mt7 xgkqhyc x5goj4r xjb2p0i x1qlqyl8 x1xh6y1q x1t35e8 x1aazh3f x1pd3egz x10rt0pk xvmqkbn x1rcybi7 x61gc8y xd4aj15 xkyhvkk x37zpob xeuugli xvgi8cs x79ra4s x33uob6 x15y8ph0 xh8yej3 xo8l03z x7s97pk x9v5kkp x784prv x5ee4ez xt0e3qv xf9vgkq"
  }.className,
  error: {
    className: "xd5ouml x1nrrp6k xat24cr xj3b58b x1yf7rl7 xdj266r"
  }.className,
  field: {
    className: "xrvj5dj x73f2yu"
  }.className,
  form: {
    className: "xrvj5dj x8fetqu xh8yej3"
  }.className,
  label: {
    className: "x1nrrp6k x1xlr1w8"
  }.className,
  links: {
    className: "xxut2h2 x1y0btm7 x178xt8z x1qhh985 xyj58a3 xgfja2r xj3b58b x1yf7rl7 xeuugli x1q57ora"
  }.className,
  linksBody: {
    className: "xrvj5dj x8fetqu x1q57ora"
  }.className,
  linksHint: {
    className: "xo1l8bm x13zjp5t"
  }.className,
  linksSummary: {
    className: "x5ee4ez x1ypdohk x1nrrp6k x1xlr1w8 xes99ow x1iul6r4"
  }.className,
  mark: {
    className: "x1lliihq x2lah0s xdddoky xf6x3ch"
  }.className,
  note: {
    className: "x5ee4ez x1nrrp6k x1evy7pa xhbfen4 xj3b58b x1yf7rl7 xdj266r xj0a0fe"
  }.className,
  radio: {
    className: "x1c7drp3 x2lah0s xhdxxi3 xat24cr xj3b58b x1yf7rl7 xdj266r xmh2cwo xo8l03z x7s97pk x9v5kkp x784prv"
  }.className,
  textarea: {
    className: "x1fdtg7e x1u7o2vf x1w9dvvm x18o3ruo x12koezg x1y4qj14 x182nak8 x103pssi xxut2h2 x1y0btm7 xmkeg23 x18sabzy x1jleocg x1pjjote x1e53mt7 xgkqhyc x5goj4r x1heor9g xjb2p0i x1qlqyl8 x1xh6y1q x1t35e8 x1aazh3f x1pd3egz x10rt0pk xvmqkbn x1rcybi7 x61gc8y xd4aj15 xkyhvkk x37zpob xeuugli xvgi8cs x79ra4s x33uob6 x15y8ph0 xh8yej3 xo8l03z x7s97pk x9v5kkp x784prv x288g5"
  }.className,
  visibility: {
    className: "xc342km xat24cr xj3b58b x1yf7rl7 x1mjqqkp xeuugli x18d9i69 x1uhho1l x1xpa7k x1b58sdr"
  }.className
};

// src/public-profile-form-result.ts
var LINK_KEYS2 = [
  "bluesky",
  "github",
  "instagram",
  "linkedin",
  "telegram",
  "website",
  "x"
];
function matchesRequest(profile, request) {
  return profile.name === request.name && profile.bio === request.bio && profile.avatarRef === request.avatarRef && profile.publication === (request.publication === "publish" ? "published" : "private") && LINK_KEYS2.every((key) => profile.links[key] === request.links[key]);
}
function snapshot2(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype)
    return null;
  const keys = Reflect.ownKeys(value);
  if (keys.length < 1 || keys.length > 2 || !keys.includes("status"))
    return null;
  const owned = Object.create(null);
  for (const key of keys) {
    if (key !== "status" && key !== "profile")
      return null;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable || !Object.hasOwn(descriptor, "value"))
      return null;
    const field = descriptor.value;
    owned[key] = field;
  }
  return owned;
}
function parsePublicProfileFormResult(value, currentProfile, request) {
  try {
    const current = parseSuiteProfileEditorV2(currentProfile);
    const update = parseSuiteProfileUpdateV2(request);
    if (!current.ok || !update.ok || update.value.expectedRevision !== current.value.revision)
      return null;
    const envelope = snapshot2(value);
    if (envelope === null)
      return null;
    const status = envelope["status"];
    if (status === "unauthorized" || status === "username_required" || status === "invalid_avatar") {
      return Object.hasOwn(envelope, "profile") ? null : Object.freeze({ status });
    }
    if (status !== "saved" && status !== "conflict")
      return null;
    if (!Object.hasOwn(envelope, "profile"))
      return null;
    const parsed = parseSuiteProfileEditorV2(envelope["profile"]);
    if (!parsed.ok || parsed.value.accountId !== current.value.accountId)
      return null;
    const profile = parsed.value;
    const expected = update.value;
    if (status === "conflict") {
      return profile.revision > expected.expectedRevision ? Object.freeze({ status, profile }) : null;
    }
    const sameRevision = profile.revision === expected.expectedRevision && matchesRequest(current.value, expected);
    const nextRevision = expected.expectedRevision < Number.MAX_SAFE_INTEGER && profile.revision === expected.expectedRevision + 1;
    if (!sameRevision && !nextRevision || !matchesRequest(profile, expected))
      return null;
    return Object.freeze({ status, profile });
  } catch {
    return null;
  }
}

// src/public-profile-links.ts
var X_GLYPH = [
  ["path", { d: "M3 21L10.5484 13.4516M21 3L13.4516 10.5484M13.4516 10.5484L8 3H3L10.5484 13.4516M13.4516 10.5484L21 21H16L10.5484 13.4516" }]
];
var GITHUB_GLYPH = [
  ["path", { d: "M10 20.5675C6.57143 21.7248 3.71429 20.5675 2 17" }],
  ["path", { d: "M10 22V18.7579C10 18.1596 10.1839 17.6396 10.4804 17.1699C10.6838 16.8476 10.5445 16.3904 10.1771 16.2894C7.13394 15.4528 5 14.1077 5 9.64606C5 8.48611 5.38005 7.39556 6.04811 6.4464C6.21437 6.21018 6.29749 6.09208 6.31748 5.9851C6.33746 5.87813 6.30272 5.73852 6.23322 5.45932C5.95038 4.32292 5.96871 3.11619 6.39322 2.02823C6.39322 2.02823 7.27042 1.74242 9.26698 2.98969C9.72282 3.27447 9.95075 3.41686 10.1515 3.44871C10.3522 3.48056 10.6206 3.41384 11.1573 3.28041C11.8913 3.09795 12.6476 3 13.5 3C14.3524 3 15.1087 3.09795 15.8427 3.28041C16.3794 3.41384 16.6478 3.48056 16.8485 3.44871C17.0493 3.41686 17.2772 3.27447 17.733 2.98969C19.7296 1.74242 20.6068 2.02823 20.6068 2.02823C21.0313 3.11619 21.0496 4.32292 20.7668 5.45932C20.6973 5.73852 20.6625 5.87813 20.6825 5.9851C20.7025 6.09207 20.7856 6.21019 20.9519 6.4464C21.6199 7.39556 22 8.48611 22 9.64606C22 14.1077 19.8661 15.4528 16.8229 16.2894C16.4555 16.3904 16.3162 16.8476 16.5196 17.1699C16.8161 17.6396 17 18.1596 17 18.7579V22" }]
];
var LINKEDIN_GLYPH = [
  ["path", { d: "M7 10V17" }],
  ["path", { d: "M11 13V17M11 13C11 11.3431 12.3431 10 14 10C15.6569 10 17 11.3431 17 13V17M11 13V10" }],
  ["path", { d: "M7.125 6.75H7M7.25 6.75C7.25 6.88807 7.13807 7 7 7C6.86193 7 6.75 6.88807 6.75 6.75C6.75 6.61193 6.86193 6.5 7 6.5C7.13807 6.5 7.25 6.61193 7.25 6.75Z" }],
  ["path", { d: "M3 12C3 7.75736 3 5.63604 4.31802 4.31802C5.63604 3 7.75736 3 12 3C16.2426 3 18.364 3 19.682 4.31802C21 5.63604 21 7.75736 21 12C21 16.2426 21 18.364 19.682 19.682C18.364 21 16.2426 21 12 21C7.75736 21 5.63604 21 4.31802 19.682C3 18.364 3 16.2426 3 12Z" }]
];
var WEBSITE_GLYPH = [
  ["circle", { cx: 12, cy: 12, r: 10 }],
  ["path", { d: "M8 12C8 18 12 22 12 22C12 22 16 18 16 12C16 6 12 2 12 2C12 2 8 6 8 12Z" }],
  ["path", { d: "M21 15H3" }],
  ["path", { d: "M21 9H3" }]
];
var BLUESKY_GLYPH = [
  ["path", { d: "M12 11.4963C11.8936 11.2963 7.45492 3 3.50417 3C1.33647 3 2.00456 8 2.50443 10.5C2.70653 11.5108 3.50417 14.5 8.003 14C8.003 14 4.00404 14.5 4.00404 17C4.00404 18.5 6.50339 21 8.50287 21C10.4606 21 11.9391 16.6859 12 16.5058C12.0609 16.6859 13.5394 21 15.4971 21C17.4966 21 19.996 18.5 19.996 17C19.996 14.5 15.997 14 15.997 14C20.4958 14.5 21.2935 11.5108 21.4956 10.5C21.9954 8 22.6635 3 20.4958 3C16.5451 3 12.1064 11.2963 12 11.4963Z" }]
];
var INSTAGRAM_GLYPH = [
  ["path", { d: "M3 12C3 7.75736 3 5.63604 4.31802 4.31802C5.63604 3 7.75736 3 12 3C16.2426 3 18.364 3 19.682 4.31802C21 5.63604 21 7.75736 21 12C21 16.2426 21 18.364 19.682 19.682C18.364 21 16.2426 21 12 21C7.75736 21 5.63604 21 4.31802 19.682C3 18.364 3 16.2426 3 12Z" }],
  ["path", { d: "M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z" }],
  ["path", { d: "M17.3748 6.75024H17.2498M17.4998 6.75024C17.4998 6.88832 17.3878 7.00024 17.2498 7.00024C17.1117 7.00024 16.9998 6.88832 16.9998 6.75024C16.9998 6.61217 17.1117 6.50024 17.2498 6.50024C17.3878 6.50024 17.4998 6.61217 17.4998 6.75024Z" }]
];
var TELEGRAM_GLYPH = [
  ["path", { d: "M11.9854 15.4083L15.2268 19.0936C16.4277 20.4589 17.0282 21.1416 17.6567 20.9754C18.2852 20.8092 18.5008 19.9108 18.9318 18.1138L21.3229 8.1459C21.9868 5.37832 22.3187 3.99454 21.5808 3.312C20.843 2.62947 19.564 3.13725 17.0061 4.15282L5.13876 8.86449C3.09293 9.67674 2.07001 10.0829 2.00507 10.7808C1.99842 10.8522 1.99831 10.9241 2.00474 10.9955C2.06754 11.6937 3.08921 12.1033 5.13255 12.9223C6.05838 13.2934 6.5213 13.479 6.8532 13.8344C6.89052 13.8743 6.9264 13.9157 6.96078 13.9584C7.26658 14.3384 7.39709 14.8371 7.65808 15.8344L8.14653 17.701C8.4005 18.6715 8.52749 19.1568 8.86008 19.223C9.19267 19.2891 9.48225 18.8867 10.0614 18.0819L11.9854 15.4083ZM11.9854 15.4083L11.6676 15.0771C11.3059 14.7001 11.1251 14.5117 11.1251 14.2775C11.1251 14.0433 11.3059 13.8548 11.6676 13.4778L15.2406 9.75409" }]
];
var SUITE_PROFILE_LINK_AFFORDANCES = {
  bluesky: { glyph: BLUESKY_GLYPH, placeholder: "name.bsky.social", prefix: "bsky.app/profile/" },
  github: { glyph: GITHUB_GLYPH, placeholder: "username", prefix: "github.com/" },
  instagram: { glyph: INSTAGRAM_GLYPH, placeholder: "handle", prefix: "instagram.com/" },
  linkedin: { glyph: LINKEDIN_GLYPH, placeholder: "handle", prefix: "linkedin.com/in/" },
  telegram: { glyph: TELEGRAM_GLYPH, placeholder: "handle", prefix: "t.me/" },
  website: { glyph: WEBSITE_GLYPH, placeholder: "example.com", prefix: "https://" },
  x: { glyph: X_GLYPH, placeholder: "handle", prefix: "x.com/" }
};
var SCHEME = /^https?:\/\//iu;
function expandSuiteProfileLinkInput(key, raw) {
  const trimmed = raw.trim();
  if (trimmed === "" || SCHEME.test(trimmed))
    return trimmed;
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  if (key === "website")
    return `https://${trimmed}`;
  if (withoutAt.includes("/"))
    return `https://${withoutAt}`;
  switch (key) {
    case "bluesky": {
      const handle = withoutAt.includes(".") ? withoutAt : `${withoutAt}.bsky.social`;
      return `https://bsky.app/profile/${handle}`;
    }
    case "github":
      return `https://github.com/${withoutAt}`;
    case "instagram":
      return `https://www.instagram.com/${withoutAt}`;
    case "linkedin":
      return `https://www.linkedin.com/in/${withoutAt}`;
    case "telegram":
      return `https://t.me/${withoutAt}`;
    case "x":
      return `https://x.com/${withoutAt}`;
  }
}

// src/public-profile-form.tsx
import { jsx, jsxs } from "react/jsx-runtime";
import { createElement } from "react";
var LINK_FIELDS = [
  ["x", "X"],
  ["github", "GitHub"],
  ["linkedin", "LinkedIn"],
  ["bluesky", "Bluesky"],
  ["instagram", "Instagram"],
  ["telegram", "Telegram"],
  ["website", "Website"]
];
function expandedLinks(links) {
  const expanded = { ...links };
  for (const key of Object.keys(expanded)) {
    expanded[key] = expandSuiteProfileLinkInput(key, links[key]);
  }
  return expanded;
}
function LinkMark({ glyph }) {
  return /* @__PURE__ */ jsx("svg", {
    "aria-hidden": "true",
    className: profileFormClasses.mark,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 1.5,
    viewBox: "0 0 24 24",
    children: glyph.map(([tag, attrs], index) => tag === "circle" ? /* @__PURE__ */ jsx("circle", {
      ...attrs
    }, index) : /* @__PURE__ */ jsx("path", {
      ...attrs
    }, index))
  });
}
function linkInputs(profile) {
  return {
    x: profile.links.x ?? "",
    github: profile.links.github ?? "",
    linkedin: profile.links.linkedin ?? "",
    website: profile.links.website ?? "",
    bluesky: profile.links.bluesky ?? "",
    instagram: profile.links.instagram ?? "",
    telegram: profile.links.telegram ?? ""
  };
}
function issueMessage(issue2) {
  if (issue2.field === "name")
    return issue2.reason === "required" ? "Enter a public-facing name." : `Use ${SUITE_PROFILE_NAME_MAX_LENGTH} characters or fewer.`;
  if (issue2.field === "bio")
    return `Use ${SUITE_PROFILE_BIO_MAX_LENGTH} characters or fewer.`;
  if (issue2.field === "publication")
    return "Choose whether to keep this profile private or publish it.";
  if (issue2.field === "github")
    return "Enter a GitHub profile URL, such as https://github.com/username.";
  if (issue2.field === "linkedin")
    return "Enter a LinkedIn profile URL.";
  if (issue2.field === "website")
    return "Enter a complete HTTPS URL.";
  const label = LINK_FIELDS.find(([key]) => key === issue2.field)?.[1];
  return label === undefined ? "Check the profile and try again." : `Enter a valid ${label} handle or profile URL.`;
}
function SuitePublicProfileForm(props) {
  const parsed = parseSuiteProfileEditorV2(props.initialProfile);
  if (!parsed.ok) {
    return /* @__PURE__ */ jsx("p", {
      className: `suite-profile-error ${profileFormClasses.error}`,
      role: "alert",
      children: "The profile is unavailable. Reload the page to try again."
    });
  }
  return /* @__PURE__ */ createElement(PublicProfileEditor, {
    ...props,
    initialProfile: parsed.value,
    key: parsed.value.accountId
  });
}
function PublicProfileEditor({ className, initialProfile, onSave, onSaved }) {
  const id = useId();
  const [transport] = useState(() => ({ onSave, onSaved }));
  const [profile, setProfile] = useState(initialProfile);
  const [name, setName] = useState(initialProfile.name);
  const [bio, setBio] = useState(initialProfile.bio);
  const [links, setLinks] = useState(() => linkInputs(initialProfile));
  const [linksOpen, setLinksOpen] = useState(() => Object.values(linkInputs(initialProfile)).some((value) => value !== ""));
  const [visibility, setVisibility] = useState(initialProfile.publication === "published" ? "publish" : "private");
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [conflict, setConflict] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const inFlight = useRef(null);
  const liveForm = useRef(null);
  const abandoned = useRef(false);
  const nameControl = useRef(null);
  const focusLoadedProfile = useRef(false);
  const pendingFocus = useRef(null);
  const attachForm = useCallback((node) => {
    liveForm.current = node;
    if (node === null) {
      if (inFlight.current !== null)
        abandoned.current = true;
      inFlight.current = null;
    } else if (abandoned.current) {
      abandoned.current = false;
      setPending(false);
      setUnconfirmed(true);
      setFormError("The save could not be confirmed. Your draft is preserved. Try saving again, or reload the profile to check its saved state.");
    }
  }, []);
  useEffect(() => {
    setReady(true);
  }, []);
  useEffect(() => {
    if (focusLoadedProfile.current && conflict === null) {
      focusLoadedProfile.current = false;
      nameControl.current?.focus();
    }
  }, [conflict]);
  useEffect(() => {
    const field = pendingFocus.current;
    if (field === null)
      return;
    pendingFocus.current = null;
    liveForm.current?.querySelector(`[id="${id}-${field}"]`)?.focus();
  });
  function clearField(field) {
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setNotice(null);
  }
  function applyProfile(next, nextVisibility) {
    setProfile(next);
    setName(next.name);
    setBio(next.bio);
    setLinks(linkInputs(next));
    setVisibility(nextVisibility);
    setUnconfirmed(false);
  }
  async function submit(event) {
    event.preventDefault();
    if (!ready || liveForm.current !== event.currentTarget || inFlight.current !== null || conflict !== null)
      return;
    setNotice(null);
    setFormError(null);
    setFieldErrors({});
    const parsed = parseSuiteProfileUpdateV2({
      schemaVersion: 2,
      expectedRevision: profile.revision,
      name,
      bio,
      links: expandedLinks(links),
      avatarRef: profile.avatarRef,
      publication: visibility
    });
    if (!parsed.ok) {
      setFieldErrors({ [parsed.error.field]: issueMessage(parsed.error) });
      if (parsed.error.field in SUITE_PROFILE_LINK_AFFORDANCES)
        setLinksOpen(true);
      pendingFocus.current = parsed.error.field;
      return;
    }
    if (parsed.value.publication === "publish" && profile.username === null) {
      setFieldErrors({ publication: "Choose a username in account settings before publishing." });
      return;
    }
    const dispatch = Symbol();
    inFlight.current = dispatch;
    setPending(true);
    let saved = null;
    try {
      const raw = await transport.onSave(parsed.value);
      if (liveForm.current === null || inFlight.current !== dispatch)
        return;
      const result = parsePublicProfileFormResult(raw, profile, parsed.value);
      if (result === null)
        throw new Error("Unconfirmed profile result.");
      if (result.status === "conflict") {
        setConflict(result.profile);
        setVisibility(null);
        setUnconfirmed(false);
        setFormError("This profile changed elsewhere. Your draft is still below. Load the latest profile to replace it, then review visibility before saving.");
      } else if (result.status === "saved") {
        applyProfile(result.profile, result.profile.publication === "published" ? "publish" : "private");
        setNotice(result.profile.publication === "published" ? "Public profile saved." : "Private profile saved.");
        saved = result.profile;
      } else if (result.status === "unauthorized") {
        setFormError("Your account session is unavailable. Sign in again before saving.");
      } else if (result.status === "username_required") {
        setFormError("Choose a username in account settings, then reload this profile before publishing.");
      } else {
        setFormError("Your profile image is unavailable. Reload the profile before saving.");
      }
    } catch {
      if (liveForm.current === null || inFlight.current !== dispatch)
        return;
      setUnconfirmed(true);
      setFormError("The save could not be confirmed. Your draft is preserved. Try saving again, or reload the profile to check its saved state.");
    } finally {
      if (liveForm.current !== null && inFlight.current === dispatch) {
        inFlight.current = null;
        setPending(false);
      }
    }
    if (saved !== null && liveForm.current !== null) {
      try {
        transport.onSaved?.(saved);
      } catch {
        if (liveForm.current !== null)
          setFormError("The profile was saved, but the page could not refresh. Reload the page.");
      }
    }
  }
  const disabled = !ready || pending || conflict !== null;
  const currentProfile = conflict ?? profile;
  const action = pending ? "Saving profile" : visibility === "publish" ? profile.publication === "published" ? "Save public profile" : "Publish profile" : visibility === "private" && profile.publication === "published" ? "Make profile private" : visibility === "private" ? "Save private profile" : "Save profile";
  const formClass = `suite-profile-form suite-public-profile-form ${profileFormClasses.form}${className === undefined ? "" : ` ${className}`}`;
  const describedBy = (field) => fieldErrors[field] === undefined ? undefined : `${id}-${field}-error`;
  const fieldError = (field) => fieldErrors[field] === undefined ? null : /* @__PURE__ */ jsx("span", {
    className: `suite-profile-error ${profileFormClasses.error}`,
    id: `${id}-${field}-error`,
    role: "alert",
    children: fieldErrors[field]
  });
  return /* @__PURE__ */ jsxs("form", {
    "aria-busy": !ready || pending,
    className: formClass,
    method: "post",
    onSubmit: (event) => {
      submit(event);
    },
    ref: attachForm,
    children: [
      /* @__PURE__ */ jsx("noscript", {
        children: /* @__PURE__ */ jsx("p", {
          className: profileFormClasses.note,
          children: "Enable JavaScript to edit this profile. No changes can be saved from this form without it."
        })
      }),
      formError === null ? null : /* @__PURE__ */ jsx("p", {
        className: `suite-profile-error ${profileFormClasses.error}`,
        role: "alert",
        children: formError
      }),
      conflict === null ? null : /* @__PURE__ */ jsx("button", {
        className: profileFormClasses.button,
        onClick: () => {
          applyProfile(conflict, null);
          setConflict(null);
          setFieldErrors({});
          setFormError(null);
          setNotice("Latest profile loaded. Choose visibility before saving.");
          focusLoadedProfile.current = true;
        },
        type: "button",
        children: "Load latest profile"
      }),
      /* @__PURE__ */ jsxs("div", {
        className: `suite-profile-field ${profileFormClasses.field}`,
        children: [
          /* @__PURE__ */ jsx("label", {
            className: profileFormClasses.label,
            htmlFor: `${id}-name`,
            children: "Public-facing name"
          }),
          /* @__PURE__ */ jsx("input", {
            "aria-describedby": describedBy("name"),
            "aria-invalid": fieldErrors.name === undefined ? undefined : true,
            autoComplete: "off",
            className: profileFormClasses.control,
            disabled,
            id: `${id}-name`,
            maxLength: SUITE_PROFILE_NAME_MAX_LENGTH,
            onChange: (event) => {
              setName(event.currentTarget.value);
              clearField("name");
            },
            placeholder: "Ada Lovelace",
            ref: nameControl,
            required: true,
            type: "text",
            value: name
          }),
          fieldError("name")
        ]
      }),
      /* @__PURE__ */ jsxs("div", {
        className: `suite-profile-field ${profileFormClasses.field}`,
        children: [
          /* @__PURE__ */ jsx("label", {
            className: profileFormClasses.label,
            htmlFor: `${id}-bio`,
            children: "Bio"
          }),
          /* @__PURE__ */ jsx("textarea", {
            "aria-describedby": describedBy("bio"),
            "aria-invalid": fieldErrors.bio === undefined ? undefined : true,
            className: profileFormClasses.textarea,
            disabled,
            id: `${id}-bio`,
            maxLength: SUITE_PROFILE_BIO_MAX_LENGTH,
            onChange: (event) => {
              setBio(event.currentTarget.value);
              clearField("bio");
            },
            placeholder: "A short introduction.",
            rows: 3,
            value: bio
          }),
          fieldError("bio")
        ]
      }),
      /* @__PURE__ */ jsxs("details", {
        className: `suite-profile-links ${profileFormClasses.links}`,
        onToggle: (event) => {
          setLinksOpen(event.currentTarget.open);
        },
        open: linksOpen,
        children: [
          /* @__PURE__ */ jsxs("summary", {
            className: profileFormClasses.linksSummary,
            children: [
              "Links ",
              /* @__PURE__ */ jsx("span", {
                className: profileFormClasses.linksHint,
                children: "optional — a handle is enough"
              })
            ]
          }),
          /* @__PURE__ */ jsx("div", {
            className: profileFormClasses.linksBody,
            children: LINK_FIELDS.map(([key, label]) => {
              const affordance = SUITE_PROFILE_LINK_AFFORDANCES[key];
              return /* @__PURE__ */ jsxs("div", {
                className: `suite-profile-field ${profileFormClasses.field}`,
                children: [
                  /* @__PURE__ */ jsx("label", {
                    className: profileFormClasses.label,
                    htmlFor: `${id}-${key}`,
                    children: label
                  }),
                  /* @__PURE__ */ jsxs("div", {
                    className: profileFormClasses.affix,
                    children: [
                      /* @__PURE__ */ jsxs("span", {
                        "aria-hidden": "true",
                        className: profileFormClasses.affixLead,
                        children: [
                          /* @__PURE__ */ jsx(LinkMark, {
                            glyph: affordance.glyph
                          }),
                          /* @__PURE__ */ jsx("span", {
                            children: affordance.prefix
                          })
                        ]
                      }),
                      /* @__PURE__ */ jsx("input", {
                        "aria-describedby": describedBy(key),
                        "aria-invalid": fieldErrors[key] === undefined ? undefined : true,
                        autoCapitalize: "none",
                        autoComplete: "off",
                        className: profileFormClasses.affixInput,
                        disabled,
                        id: `${id}-${key}`,
                        inputMode: "url",
                        maxLength: SUITE_PROFILE_URL_MAX_LENGTH,
                        onChange: (event) => {
                          const value = event.currentTarget.value;
                          setLinks((current) => ({ ...current, [key]: value }));
                          clearField(key);
                        },
                        placeholder: affordance.placeholder,
                        spellCheck: false,
                        type: "text",
                        value: links[key]
                      })
                    ]
                  }),
                  fieldError(key)
                ]
              }, key);
            })
          })
        ]
      }),
      /* @__PURE__ */ jsxs("fieldset", {
        "aria-describedby": `${id}-visibility-note${fieldErrors.publication === undefined ? "" : ` ${id}-publication-error`}`,
        "aria-invalid": fieldErrors.publication === undefined ? undefined : true,
        className: `suite-profile-visibility ${profileFormClasses.visibility}`,
        disabled,
        id: `${id}-publication`,
        tabIndex: -1,
        children: [
          /* @__PURE__ */ jsx("legend", {
            className: profileFormClasses.label,
            children: "Profile visibility"
          }),
          /* @__PURE__ */ jsxs("p", {
            className: profileFormClasses.note,
            id: `${id}-visibility-note`,
            children: [
              unconfirmed ? "Publication status is unconfirmed." : currentProfile.publication === "published" ? `The saved profile for @${currentProfile.username} is public.` : "The saved profile is private.",
              " Your choice takes effect when you save."
            ]
          }),
          /* @__PURE__ */ jsxs("label", {
            className: profileFormClasses.choice,
            children: [
              /* @__PURE__ */ jsx("input", {
                checked: visibility === "private",
                className: profileFormClasses.radio,
                name: "publication",
                onChange: () => {
                  setVisibility("private");
                  clearField("publication");
                },
                required: true,
                type: "radio",
                value: "private"
              }),
              /* @__PURE__ */ jsx("span", {
                children: "Keep private"
              })
            ]
          }),
          /* @__PURE__ */ jsxs("label", {
            className: profileFormClasses.choice,
            children: [
              /* @__PURE__ */ jsx("input", {
                "aria-describedby": `${id}-publication-note`,
                checked: visibility === "publish",
                className: profileFormClasses.radio,
                disabled: profile.username === null,
                name: "publication",
                onChange: () => {
                  setVisibility("publish");
                  clearField("publication");
                },
                required: true,
                type: "radio",
                value: "publish"
              }),
              /* @__PURE__ */ jsx("span", {
                children: "Publish profile"
              })
            ]
          }),
          /* @__PURE__ */ jsx("p", {
            className: profileFormClasses.note,
            id: `${id}-publication-note`,
            children: profile.username === null ? "Choose a username in account settings before publishing. You can still save privately." : "Anyone can read your published name, bio, social links, and profile image. Your sign-in email is not included."
          }),
          fieldError("publication")
        ]
      }),
      /* @__PURE__ */ jsx("button", {
        className: profileFormClasses.button,
        disabled,
        type: "submit",
        children: action
      }),
      /* @__PURE__ */ jsx("p", {
        "aria-live": "polite",
        className: profileFormClasses.note,
        role: "status",
        children: notice
      })
    ]
  });
}
// src/profile-form.tsx
import {
  useId as useId2,
  useState as useState2
} from "react";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function withoutFieldError(errors, field) {
  const next = { ...errors };
  delete next[field];
  return next;
}
var LINK_FIELDS2 = [
  ["x", "X"],
  ["linkedin", "LinkedIn"],
  ["bluesky", "BlueSky"],
  ["instagram", "Instagram"],
  ["telegram", "Telegram"],
  ["website", "Personal Website"]
];
function linkInputs2(profile) {
  return {
    bluesky: profile.links.bluesky ?? "",
    instagram: profile.links.instagram ?? "",
    linkedin: profile.links.linkedin ?? "",
    telegram: profile.links.telegram ?? "",
    website: profile.links.website ?? "",
    x: profile.links.x ?? ""
  };
}
function issueMessage2(issue2) {
  if (issue2.field === "name") {
    return issue2.reason === "required" ? "Enter a name." : `Use ${SUITE_PROFILE_NAME_MAX_LENGTH} characters or fewer.`;
  }
  if (issue2.field === "bio") {
    return `Use ${SUITE_PROFILE_BIO_MAX_LENGTH} characters or fewer.`;
  }
  if (issue2.field === "linkedin")
    return "Enter a LinkedIn profile URL.";
  if (issue2.field === "website")
    return "Enter a complete HTTPS URL.";
  if (issue2.field === "x" || issue2.field === "bluesky" || issue2.field === "instagram" || issue2.field === "telegram") {
    const label = LINK_FIELDS2.find(([key]) => key === issue2.field)?.[1] ?? "profile";
    return `Enter a valid ${label} handle or profile URL.`;
  }
  return "Check the profile and try again.";
}
function applyProfile(profile, setters) {
  setters.setBio(profile.bio);
  setters.setEmail(profile.email);
  setters.setLinks(linkInputs2(profile));
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
  const id = useId2();
  const [name, setName] = useState2(initialProfile.name);
  const [email, setEmail] = useState2(initialProfile.email);
  const [bio, setBio] = useState2(initialProfile.bio);
  const [links, setLinks] = useState2(() => linkInputs2(initialProfile));
  const [revision, setRevision] = useState2(initialProfile.revision);
  const [pending, setPending] = useState2(false);
  const [fieldErrors, setFieldErrors] = useState2({});
  const [formError, setFormError] = useState2(null);
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
        [parsed.error.field]: issueMessage2(parsed.error)
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
  const formClassName = className === undefined ? `suite-profile-form ${profileFormClasses.form}` : `suite-profile-form ${profileFormClasses.form} ${className}`;
  return /* @__PURE__ */ jsxs2("form", {
    "aria-busy": pending,
    className: formClassName,
    onSubmit: (event) => {
      submit(event);
    },
    children: [
      /* @__PURE__ */ jsxs2("label", {
        className: `suite-profile-field ${profileFormClasses.field}`,
        htmlFor: `${id}-name`,
        children: [
          /* @__PURE__ */ jsx2("span", {
            className: profileFormClasses.label,
            children: "Name"
          }),
          /* @__PURE__ */ jsx2("input", {
            className: profileFormClasses.control,
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
          fieldErrors.name === undefined ? null : /* @__PURE__ */ jsx2("span", {
            className: `suite-profile-error ${profileFormClasses.error}`,
            id: `${id}-name-error`,
            role: "alert",
            children: fieldErrors.name
          })
        ]
      }),
      /* @__PURE__ */ jsxs2("label", {
        className: `suite-profile-field ${profileFormClasses.field}`,
        htmlFor: `${id}-email`,
        children: [
          /* @__PURE__ */ jsx2("span", {
            className: profileFormClasses.label,
            children: "Email"
          }),
          /* @__PURE__ */ jsx2("input", {
            className: profileFormClasses.email,
            "aria-readonly": "true",
            autoComplete: "email",
            id: `${id}-email`,
            readOnly: true,
            type: "email",
            value: email
          })
        ]
      }),
      /* @__PURE__ */ jsxs2("label", {
        className: `suite-profile-field ${profileFormClasses.field}`,
        htmlFor: `${id}-bio`,
        children: [
          /* @__PURE__ */ jsx2("span", {
            className: profileFormClasses.label,
            children: "Bio"
          }),
          /* @__PURE__ */ jsx2("textarea", {
            className: profileFormClasses.textarea,
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
          fieldErrors.bio === undefined ? null : /* @__PURE__ */ jsx2("span", {
            className: `suite-profile-error ${profileFormClasses.error}`,
            id: `${id}-bio-error`,
            role: "alert",
            children: fieldErrors.bio
          })
        ]
      }),
      LINK_FIELDS2.map(([key, label]) => {
        const error = fieldErrors[key];
        return /* @__PURE__ */ jsxs2("label", {
          className: `suite-profile-field ${profileFormClasses.field}`,
          htmlFor: `${id}-${key}`,
          children: [
            /* @__PURE__ */ jsx2("span", {
              className: profileFormClasses.label,
              children: label
            }),
            /* @__PURE__ */ jsx2("input", {
              className: profileFormClasses.control,
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
            error === undefined ? null : /* @__PURE__ */ jsx2("span", {
              className: `suite-profile-error ${profileFormClasses.error}`,
              id: `${id}-${key}-error`,
              role: "alert",
              children: error
            })
          ]
        }, key);
      }),
      formError === null ? null : /* @__PURE__ */ jsx2("p", {
        className: `suite-profile-error ${profileFormClasses.error}`,
        role: "alert",
        children: formError
      }),
      /* @__PURE__ */ jsx2("button", {
        className: profileFormClasses.button,
        disabled: pending,
        type: "submit",
        children: submitLabel
      })
    ]
  });
}
export {
  SuitePublicProfileForm,
  SuiteProfileForm
};
