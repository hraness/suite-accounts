import { err, isRecord, ok, type Result } from "@hraness/result";
import { deepFreeze } from "../immutable.js";

export const SUITE_PROFILE_NAME_MAX_LENGTH = 120;
export const SUITE_PROFILE_BIO_MAX_LENGTH = 1_000;
export const SUITE_PROFILE_URL_MAX_LENGTH = 2_048;

export const SUITE_COMMUNITY_APPLICATION_STATUSES = deepFreeze([
  "submitted",
  "accepted",
  "declined",
  "withdrawn",
] as const);

export type SuiteCommunityApplicationStatus =
  (typeof SUITE_COMMUNITY_APPLICATION_STATUSES)[number];

export type SuiteProfileLinkKey =
  | "x"
  | "linkedin"
  | "bluesky"
  | "instagram"
  | "telegram"
  | "website";

export type SuiteProfileLinks = Readonly<
  Record<SuiteProfileLinkKey, string | null>
>;

export type SuiteProfileUpdateRequest = Readonly<{
  bio: string;
  expectedRevision: number;
  links: SuiteProfileLinks;
  name: string;
}>;

export type SuiteProfileView = Readonly<{
  bio: string;
  email: string;
  links: SuiteProfileLinks;
  name: string;
  revision: number;
}>;

export type SuiteCommunityApplicationView = Readonly<{
  community: "oh-computer";
  status: SuiteCommunityApplicationStatus;
  submittedAtMs: number;
  updatedAtMs: number;
}>;

export type SuiteCommunityProfileView = Readonly<{
  application: SuiteCommunityApplicationView | null;
  profile: SuiteProfileView;
}>;

export type SuiteProfileIssue = Readonly<{
  field:
    | SuiteProfileLinkKey
    | "application"
    | "bio"
    | "email"
    | "expectedRevision"
    | "name"
    | "profile";
  reason: "invalid" | "required" | "too_long";
}>;

const PROFILE_LINK_KEYS = [
  "bluesky",
  "instagram",
  "linkedin",
  "telegram",
  "website",
  "x",
] as const satisfies readonly SuiteProfileLinkKey[];

function exactKeys(
  value: Record<PropertyKey, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length
    && actual.every((key, index) => key === sortedExpected[index]);
}

function hasInvalidSingleLineControl(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || (code >= 127 && code <= 159)) return true;
  }
  return false;
}

function hasInvalidBioControl(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (
      (code <= 31 && code !== 10)
      || (code >= 127 && code <= 159)
    ) {
      return true;
    }
  }
  return false;
}

function normalizedName(value: unknown): Result<string, SuiteProfileIssue> {
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
  return name.length <= SUITE_PROFILE_NAME_MAX_LENGTH
    ? ok(name)
    : err({ field: "name", reason: "too_long" });
}

function normalizedProfileViewName(
  value: unknown,
): Result<string, SuiteProfileIssue> {
  if (typeof value !== "string") {
    return err({ field: "name", reason: "invalid" });
  }
  if (hasInvalidSingleLineControl(value)) {
    return err({ field: "name", reason: "invalid" });
  }
  const name = value.trim().replace(/\s+/gu, " ");
  return name.length <= SUITE_PROFILE_NAME_MAX_LENGTH
    ? ok(name)
    : err({ field: "name", reason: "too_long" });
}

function normalizedBio(value: unknown): Result<string, SuiteProfileIssue> {
  if (typeof value !== "string") {
    return err({ field: "bio", reason: "invalid" });
  }
  const normalizedNewlines = value
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n");
  if (hasInvalidBioControl(normalizedNewlines)) {
    return err({ field: "bio", reason: "invalid" });
  }
  const bio = normalizedNewlines.trim();
  return bio.length <= SUITE_PROFILE_BIO_MAX_LENGTH
    ? ok(bio)
    : err({ field: "bio", reason: "too_long" });
}

function parsedHttpsUrl(
  value: string,
  options: Readonly<{
    allowQuery: boolean;
    hosts?: ReadonlySet<string>;
  }>,
): URL | null {
  if (
    value.length === 0
    || value.length > SUITE_PROFILE_URL_MAX_LENGTH
    || hasInvalidSingleLineControl(value)
    || value.trim() !== value
  ) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (
    url.protocol !== "https:"
    || url.username !== ""
    || url.password !== ""
    || url.hash !== ""
    || url.port !== ""
    || (!options.allowQuery && url.search !== "")
    || (
      options.hosts !== undefined
      && !options.hosts.has(url.hostname.toLowerCase())
    )
  ) {
    return null;
  }
  return url;
}

function simpleHandle(
  value: string,
  pattern: RegExp,
): string | null {
  const withoutAt = value.startsWith("@") ? value.slice(1) : value;
  return pattern.test(withoutAt) ? withoutAt.toLowerCase() : null;
}

function exactPathSegments(url: URL): string[] | null {
  const segments = url.pathname.split("/").filter(Boolean);
  return url.pathname === `/${segments.join("/")}`
      || url.pathname === `/${segments.join("/")}/`
    ? segments
    : null;
}

const X_HOSTS = new Set(["x.com", "www.x.com", "twitter.com", "www.twitter.com"]);
const INSTAGRAM_HOSTS = new Set(["instagram.com", "www.instagram.com"]);
const TELEGRAM_HOSTS = new Set([
  "t.me",
  "www.t.me",
  "telegram.me",
  "www.telegram.me",
]);
const BLUESKY_HOSTS = new Set(["bsky.app", "www.bsky.app"]);
const LINKEDIN_HOSTS = new Set(["linkedin.com", "www.linkedin.com"]);

function normalizedX(value: string): string | null {
  const enteredHandle = simpleHandle(value, /^[A-Za-z0-9_]{1,15}$/u);
  if (enteredHandle !== null) return `https://x.com/${enteredHandle}`;
  const url = parsedHttpsUrl(value, { allowQuery: false, hosts: X_HOSTS });
  const segments = url === null ? null : exactPathSegments(url);
  const handle = segments?.length === 1
    ? simpleHandle(segments[0]!, /^[A-Za-z0-9_]{1,15}$/u)
    : null;
  return handle === null ? null : `https://x.com/${handle}`;
}

function normalizedInstagram(value: string): string | null {
  const pattern = /^(?!.*\.\.)[A-Za-z0-9](?:[A-Za-z0-9._]{0,28}[A-Za-z0-9_])?$/u;
  const enteredHandle = simpleHandle(value, pattern);
  if (enteredHandle !== null) {
    return `https://www.instagram.com/${enteredHandle}`;
  }
  const url = parsedHttpsUrl(value, {
    allowQuery: false,
    hosts: INSTAGRAM_HOSTS,
  });
  const segments = url === null ? null : exactPathSegments(url);
  const handle = segments?.length === 1
    ? simpleHandle(segments[0]!, pattern)
    : null;
  return handle === null
    ? null
    : `https://www.instagram.com/${handle}`;
}

function normalizedTelegram(value: string): string | null {
  const enteredHandle = simpleHandle(
    value,
    /^[A-Za-z][A-Za-z0-9_]{4,31}$/u,
  );
  if (enteredHandle !== null) return `https://t.me/${enteredHandle}`;
  const url = parsedHttpsUrl(value, {
    allowQuery: false,
    hosts: TELEGRAM_HOSTS,
  });
  const segments = url === null ? null : exactPathSegments(url);
  const handle = segments?.length === 1
    ? simpleHandle(segments[0]!, /^[A-Za-z][A-Za-z0-9_]{4,31}$/u)
    : null;
  return handle === null ? null : `https://t.me/${handle}`;
}

function validBlueskyHandle(value: string): boolean {
  if (
    value.length < 3
    || value.length > 253
    || !value.includes(".")
    || value.startsWith(".")
    || value.endsWith(".")
  ) {
    return false;
  }
  const labels = value.split(".");
  return labels.every(label =>
    label.length >= 1
    && label.length <= 63
    && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(label)
  );
}

function normalizedBluesky(value: string): string | null {
  const withoutAt = value.startsWith("@") ? value.slice(1) : value;
  const enteredHandle = withoutAt.toLowerCase();
  if (validBlueskyHandle(enteredHandle)) {
    return `https://bsky.app/profile/${enteredHandle}`;
  }
  const url = parsedHttpsUrl(value, {
    allowQuery: false,
    hosts: BLUESKY_HOSTS,
  });
  const segments = url === null ? null : exactPathSegments(url);
  const handle = segments?.length === 2 && segments[0] === "profile"
    ? segments[1]!.toLowerCase()
    : null;
  return handle !== null && validBlueskyHandle(handle)
    ? `https://bsky.app/profile/${handle}`
    : null;
}

function normalizedLinkedIn(value: string): string | null {
  const url = parsedHttpsUrl(value, {
    allowQuery: false,
    hosts: LINKEDIN_HOSTS,
  });
  const segments = url === null ? null : exactPathSegments(url);
  if (
    segments?.length !== 2
    || segments[0] !== "in"
    || !/^[A-Za-z0-9][A-Za-z0-9-]{1,99}$/u.test(segments[1]!)
  ) {
    return null;
  }
  return `https://www.linkedin.com/in/${segments[1]!.toLowerCase()}`;
}

function normalizedWebsite(value: string): string | null {
  const url = parsedHttpsUrl(value, { allowQuery: true });
  return url === null ? null : url.href;
}

export function normalizeSuiteProfileLink(
  key: SuiteProfileLinkKey,
  value: unknown,
): Result<string | null, SuiteProfileIssue> {
  if (value === null) return ok(null);
  if (typeof value !== "string") {
    return err({ field: key, reason: "invalid" });
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return ok(null);
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
  return normalized === null
    ? err({ field: key, reason: "invalid" })
    : ok(normalized);
}

function parsedLinks(
  value: unknown,
  canonicalOnly: boolean,
): Result<SuiteProfileLinks, SuiteProfileIssue> {
  if (
    !isRecord(value)
    || !exactKeys(value, PROFILE_LINK_KEYS)
  ) {
    return err({ field: "profile", reason: "invalid" });
  }
  const links: Record<SuiteProfileLinkKey, string | null> = {
    bluesky: null,
    instagram: null,
    linkedin: null,
    telegram: null,
    website: null,
    x: null,
  };
  for (const key of PROFILE_LINK_KEYS) {
    const parsed = normalizeSuiteProfileLink(key, value[key]);
    if (!parsed.ok) return parsed;
    if (
      canonicalOnly
      && parsed.value !== value[key]
    ) {
      return err({ field: key, reason: "invalid" });
    }
    links[key] = parsed.value;
  }
  return ok(links);
}

function nonnegativeInteger(value: unknown): number | null {
  return typeof value === "number"
      && Number.isSafeInteger(value)
      && value >= 0
    ? value
    : null;
}

function parsedEmail(value: unknown): string | null {
  return typeof value === "string"
      && value.length <= 320
      && value.trim() === value
      && !hasInvalidSingleLineControl(value)
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)
    ? value
    : null;
}

export function parseSuiteProfileUpdateRequest(
  value: unknown,
): Result<SuiteProfileUpdateRequest, SuiteProfileIssue> {
  if (
    !isRecord(value)
    || !exactKeys(value, ["bio", "expectedRevision", "links", "name"])
  ) {
    return err({ field: "profile", reason: "invalid" });
  }
  const name = normalizedName(value["name"]);
  if (!name.ok) return name;
  const bio = normalizedBio(value["bio"]);
  if (!bio.ok) return bio;
  const links = parsedLinks(value["links"], false);
  if (!links.ok) return links;
  const expectedRevision = nonnegativeInteger(value["expectedRevision"]);
  if (expectedRevision === null) {
    return err({ field: "expectedRevision", reason: "invalid" });
  }
  return ok({
    bio: bio.value,
    expectedRevision,
    links: links.value,
    name: name.value,
  });
}

export function parseSuiteProfileView(
  value: unknown,
): Result<SuiteProfileView, SuiteProfileIssue> {
  if (
    !isRecord(value)
    || !exactKeys(value, ["bio", "email", "links", "name", "revision"])
  ) {
    return err({ field: "profile", reason: "invalid" });
  }
  const name = normalizedProfileViewName(value["name"]);
  const bio = normalizedBio(value["bio"]);
  const links = parsedLinks(value["links"], true);
  const email = parsedEmail(value["email"]);
  const revision = nonnegativeInteger(value["revision"]);
  if (!name.ok) return name;
  if (!bio.ok) return bio;
  if (!links.ok) return links;
  if (email === null) return err({ field: "email", reason: "invalid" });
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
    revision,
  });
}

function isApplicationStatus(
  value: unknown,
): value is SuiteCommunityApplicationStatus {
  return typeof value === "string"
    && (SUITE_COMMUNITY_APPLICATION_STATUSES as readonly string[])
      .includes(value);
}

function parsedApplication(
  value: unknown,
): Result<SuiteCommunityApplicationView | null, SuiteProfileIssue> {
  if (value === null) return ok(null);
  if (
    !isRecord(value)
    || !exactKeys(value, [
      "community",
      "status",
      "submittedAtMs",
      "updatedAtMs",
    ])
    || value["community"] !== "oh-computer"
    || !isApplicationStatus(value["status"])
  ) {
    return err({ field: "application", reason: "invalid" });
  }
  const submittedAtMs = nonnegativeInteger(value["submittedAtMs"]);
  const updatedAtMs = nonnegativeInteger(value["updatedAtMs"]);
  if (
    submittedAtMs === null
    || updatedAtMs === null
    || updatedAtMs < submittedAtMs
  ) {
    return err({ field: "application", reason: "invalid" });
  }
  return ok({
    community: "oh-computer",
    status: value["status"],
    submittedAtMs,
    updatedAtMs,
  });
}

export function parseSuiteCommunityProfileView(
  value: unknown,
): Result<SuiteCommunityProfileView, SuiteProfileIssue> {
  if (
    !isRecord(value)
    || !exactKeys(value, ["application", "profile"])
  ) {
    return err({ field: "profile", reason: "invalid" });
  }
  const application = parsedApplication(value["application"]);
  if (!application.ok) return application;
  const profile = parseSuiteProfileView(value["profile"]);
  return profile.ok
    ? ok({ application: application.value, profile: profile.value })
    : profile;
}
