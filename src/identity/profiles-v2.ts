import { err, ok, type Result } from "@hraness/result";
import { deepFreeze } from "../immutable.js";
import { getSuiteAccountsDeployment } from "../registry.js";
import { parseSuiteAccountId, type SuiteAccountId } from "./identifiers.js";
import {
  normalizeSuiteProfileLink,
  parseSuiteProfileUpdateRequest,
  SUITE_PROFILE_URL_MAX_LENGTH,
  type SuiteProfileIssue,
  type SuiteProfileLinkKey,
  type SuiteProfileLinks,
} from "./profiles.js";
import { parseSuiteUsername, type SuiteUsername } from "./usernames.js";

export type SuiteProfileLinkKeyV2 = SuiteProfileLinkKey | "github";
export type SuiteProfileLinksV2 = Readonly<SuiteProfileLinks & {
  github: string | null;
}>;
declare const suiteAvatarRefBrand: unique symbol;
/** An opaque syntax-checked reference, not proof of ownership or publication. */
export type SuiteAvatarRef = string & {
  readonly [suiteAvatarRefBrand]: "SuiteAvatarRef";
};

export type SuitePublicProfileV2 = Readonly<{
  schemaVersion: 2;
  accountId: SuiteAccountId;
  username: SuiteUsername;
  name: string;
  bio: string;
  links: SuiteProfileLinksV2;
  avatarRef: SuiteAvatarRef | null;
  revision: number;
}>;

export type SuiteProfileEditorV2 = Readonly<
  Omit<SuitePublicProfileV2, "username"> & {
    username: SuiteUsername | null;
    publication: "private" | "published";
  }
>;

export type SuiteProfileUpdateV2 = Readonly<{
  schemaVersion: 2;
  expectedRevision: number;
  name: string;
  bio: string;
  links: SuiteProfileLinksV2;
  avatarRef: SuiteAvatarRef | null;
  publication: "publish" | "private";
}>;

export type SuiteProfileV2Issue = Readonly<{
  field:
    | SuiteProfileLinkKeyV2
    | "accountId"
    | "avatarRef"
    | "bio"
    | "expectedRevision"
    | "name"
    | "profile"
    | "publication"
    | "revision"
    | "schemaVersion"
    | "username";
  reason: "invalid" | "required" | "too_long";
}>;

const LINK_KEYS = [
  "bluesky", "github", "instagram", "linkedin", "telegram", "website", "x",
] as const;
const PUBLIC_KEYS = [
  "schemaVersion", "accountId", "username", "name", "bio", "links",
  "avatarRef", "revision",
] as const;
const EDITOR_KEYS = [...PUBLIC_KEYS, "publication"] as const;
const UPDATE_KEYS = [
  "schemaVersion", "expectedRevision", "name", "bio", "links", "avatarRef",
  "publication",
] as const;
// Bound work before text normalization. HTTP callers must also cap their body.
const MAX_INPUT_TEXT_LENGTH = 32_768;
const AVATAR_PATTERN = /^avref_(?!0{64}$)[0-9a-f]{64}$/u;

function issue(
  field: SuiteProfileV2Issue["field"] = "profile",
  reason: SuiteProfileV2Issue["reason"] = "invalid",
): Result<never, SuiteProfileV2Issue> {
  return deepFreeze(err({ field, reason }));
}

function success<Value>(value: Value): Result<Value, SuiteProfileV2Issue> {
  return deepFreeze(ok(value));
}

/** Copy data descriptors without evaluating getters or retaining caller records. */
function snapshot(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const actual = Reflect.ownKeys(value);
  if (actual.length !== keys.length) return null;
  const copy = Object.create(null) as Record<string, unknown>;
  for (const key of actual) {
    if (typeof key !== "string" || !keys.includes(key)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      return null;
    }
    const field: unknown = descriptor.value;
    copy[key] = field;
  }
  return copy;
}

function nonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function parseSuiteAvatarRef(
  value: unknown,
): Result<SuiteAvatarRef, SuiteProfileV2Issue> {
  return typeof value === "string" && value.length === 70 && AVATAR_PATTERN.test(value)
    ? success(value as SuiteAvatarRef)
    : issue("avatarRef");
}

function optionalAvatar(value: unknown): Result<SuiteAvatarRef | null, SuiteProfileV2Issue> {
  return value === null ? success(null) : parseSuiteAvatarRef(value);
}

function legacyIssue(error: SuiteProfileIssue): Result<never, SuiteProfileV2Issue> {
  const field = error.field === "application" || error.field === "email"
    ? "profile"
    : error.field;
  return issue(field, error.reason);
}

/** GitHub uses a bounded URL policy; this does not verify an existing username. */
export function normalizeSuiteProfileLinkV2(
  key: unknown,
  value: unknown,
): Result<string | null, SuiteProfileV2Issue> {
  if (typeof key !== "string" || !LINK_KEYS.some((candidate) => candidate === key)) {
    return issue();
  }
  const field = key as SuiteProfileLinkKeyV2;
  if (value !== null && typeof value !== "string") return issue(field);
  if (typeof value === "string" && value.length > SUITE_PROFILE_URL_MAX_LENGTH) {
    return issue(field, "too_long");
  }
  if (field === "github") {
    if (value === null || value === "") return success(null);
    // Match the original input so URL parsing cannot erase ports, escapes,
    // dot segments, empty queries, or control characters before validation.
    if (/[^\x21-\x7e]/u.test(value)) return issue("github");
    const match = /^https:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_-]{1,100})\/?$/iu.exec(value);
    return match === null || match[0] !== value
      ? issue("github")
      : success(`https://github.com/${match[1]!.toLowerCase()}`);
  }
  const parsed = normalizeSuiteProfileLink(field, value);
  if (!parsed.ok) return legacyIssue(parsed.error);
  if (parsed.value !== null && parsed.value.length > SUITE_PROFILE_URL_MAX_LENGTH) {
    return issue(field, "too_long");
  }
  return success(parsed.value);
}

function parsedContent(
  value: Record<string, unknown>,
  canonical: boolean,
): Result<Readonly<{ name: string; bio: string; links: SuiteProfileLinksV2 }>, SuiteProfileV2Issue> {
  for (const field of ["name", "bio"] as const) {
    if (typeof value[field] === "string" && value[field].length > MAX_INPUT_TEXT_LENGTH) {
      return issue(field, "too_long");
    }
  }
  const inputLinks = snapshot(value["links"], LINK_KEYS);
  if (inputLinks === null) return issue();
  const links: Record<SuiteProfileLinkKeyV2, string | null> = {
    bluesky: null, github: null, instagram: null, linkedin: null,
    telegram: null, website: null, x: null,
  };
  for (const key of LINK_KEYS) {
    const result = normalizeSuiteProfileLinkV2(key, inputLinks[key]);
    if (!result.ok) return result;
    if (canonical && result.value !== inputLinks[key]) return issue(key);
    links[key] = result.value;
  }
  // Preserve the released text normalization without widening its six-link schema.
  const parsed = parseSuiteProfileUpdateRequest({
    expectedRevision: 0,
    name: value["name"],
    bio: value["bio"],
    links: {
      bluesky: links.bluesky, instagram: links.instagram, linkedin: links.linkedin,
      telegram: links.telegram, website: links.website, x: links.x,
    },
  });
  if (!parsed.ok) return legacyIssue(parsed.error);
  if (canonical && (parsed.value.name !== value["name"] || parsed.value.bio !== value["bio"])) {
    return issue();
  }
  return success({ name: parsed.value.name, bio: parsed.value.bio, links });
}

function parseView(
  input: unknown,
  editor: boolean,
): Result<SuiteProfileEditorV2 | SuitePublicProfileV2, SuiteProfileV2Issue> {
  try {
    const value = snapshot(input, editor ? EDITOR_KEYS : PUBLIC_KEYS);
    if (value === null) return issue();
    if (value["schemaVersion"] !== 2) return issue("schemaVersion");
    const accountId = parseSuiteAccountId(value["accountId"]);
    if (!accountId.ok) return issue("accountId");
    const username = editor && value["username"] === null
      ? success(null)
      : parseSuiteUsername(value["username"]);
    if (!username.ok) return issue("username");
    const revision = value["revision"];
    if (!nonnegativeInteger(revision) || (!editor && revision === 0)) return issue("revision");
    const avatarRef = optionalAvatar(value["avatarRef"]);
    if (!avatarRef.ok) return avatarRef;
    const publication = value["publication"];
    if (editor && publication !== "private" && publication !== "published") {
      return issue("publication");
    }
    if (editor && publication === "published" && username.value === null) return issue("username");
    let content;
    if (revision === 0) {
      const links = snapshot(value["links"], LINK_KEYS);
      if (value["name"] !== "" || value["bio"] !== "" || avatarRef.value !== null
        || publication !== "private" || links === null
        || LINK_KEYS.some((key) => links[key] !== null)) return issue();
      content = {
        name: "", bio: "",
        links: { bluesky: null, github: null, instagram: null, linkedin: null,
          telegram: null, website: null, x: null },
      };
    } else {
      const parsed = parsedContent(value, true);
      if (!parsed.ok) return parsed;
      content = parsed.value;
    }
    const profile = {
      schemaVersion: 2 as const,
      accountId: accountId.value,
      ...content,
      avatarRef: avatarRef.value,
      revision,
    };
    if (editor && (publication === "private" || publication === "published")) {
      return success({ ...profile, username: username.value, publication });
    }
    if (username.value === null) return issue("username");
    return success({ ...profile, username: username.value });
  } catch {
    return issue();
  }
}

/** Parse a canonical public projection. This does not authenticate its source. */
export function parseSuitePublicProfileV2(
  value: unknown,
): Result<SuitePublicProfileV2, SuiteProfileV2Issue> {
  const parsed = parseView(value, false);
  if (!parsed.ok) return parsed;
  if (parsed.value.username === null || isEditor(parsed.value)) return issue();
  return success({ ...parsed.value, username: parsed.value.username });
}

/** Parse a canonical owner view, including the coherent revision-zero default. */
export function parseSuiteProfileEditorV2(
  value: unknown,
): Result<SuiteProfileEditorV2, SuiteProfileV2Issue> {
  const parsed = parseView(value, true);
  if (!parsed.ok) return parsed;
  return isEditor(parsed.value) ? success(parsed.value) : issue();
}

function isEditor(value: SuiteProfileEditorV2 | SuitePublicProfileV2): value is SuiteProfileEditorV2 {
  return Object.hasOwn(value, "publication");
}

/** Normalize an explicit revision-bound edit; the authority applies publication. */
export function parseSuiteProfileUpdateV2(
  input: unknown,
): Result<SuiteProfileUpdateV2, SuiteProfileV2Issue> {
  try {
    const value = snapshot(input, UPDATE_KEYS);
    if (value === null) return issue();
    if (value["schemaVersion"] !== 2) return issue("schemaVersion");
    const expectedRevision = value["expectedRevision"];
    if (!nonnegativeInteger(expectedRevision)) return issue("expectedRevision");
    const publication = value["publication"];
    if (publication !== "publish" && publication !== "private") return issue("publication");
    const avatarRef = optionalAvatar(value["avatarRef"]);
    if (!avatarRef.ok) return avatarRef;
    const content = parsedContent(value, false);
    if (!content.ok) return content;
    return success({ schemaVersion: 2, expectedRevision, ...content.value,
      avatarRef: avatarRef.value, publication });
  } catch {
    return issue();
  }
}

function avatarUrl(ref: unknown, path: string): Result<string, SuiteProfileV2Issue> {
  const parsed = parseSuiteAvatarRef(ref);
  return parsed.ok
    ? success(`${getSuiteAccountsDeployment("production").accountsOrigin}${path}/${parsed.value}.webp`)
    : parsed;
}

/** Syntax only; serving requires current publication consent and a live endpoint. */
export function suiteProfileAvatarPublicUrl(ref: unknown): Result<string, SuiteProfileV2Issue> {
  return avatarUrl(ref, "/suite/profile/avatar/v1");
}

/** Syntax only; serving requires the owner's authenticated session and a live endpoint. */
export function suiteProfileAvatarEditorUrl(ref: unknown): Result<string, SuiteProfileV2Issue> {
  return avatarUrl(ref, "/api/profile/avatar/v1");
}
