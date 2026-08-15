import { err, ok, type Result } from "@hraness/result";

declare const suiteUsernameBrand: unique symbol;

/** A canonical, public username owned by the suite accounts service. */
export type SuiteUsername = string & {
  readonly [suiteUsernameBrand]: "SuiteUsername";
};

export const SUITE_USERNAME_MIN_LENGTH = 3;
export const SUITE_USERNAME_MAX_LENGTH = 24;

export type SuiteUsernameIssue =
  | "invalid-suite-username"
  | "suite-username-too-long"
  | "suite-username-too-short"
  | "suite-username-reserved";

const suiteUsernamePattern =
  /^[a-z0-9](?:[a-z0-9]|[-_](?=[a-z0-9]))*[a-z0-9]$/u;

const reservedSuiteUsernames = new Set([
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
  "www",
]);

function validateCanonicalSuiteUsername(
  value: string,
): Result<SuiteUsername, SuiteUsernameIssue> {
  if (value.length < SUITE_USERNAME_MIN_LENGTH) {
    return err("suite-username-too-short");
  }
  if (value.length > SUITE_USERNAME_MAX_LENGTH) {
    return err("suite-username-too-long");
  }
  if (!suiteUsernamePattern.test(value)) {
    return err("invalid-suite-username");
  }
  return ok(value as SuiteUsername);
}

/**
 * Normalize a human-entered username before validating its canonical form.
 *
 * Usernames are intentionally ASCII and case-insensitive. This avoids Unicode
 * lookalikes and gives every spelling exactly one storage and lookup key.
 */
export function normalizeSuiteUsername(
  value: unknown,
): Result<SuiteUsername, SuiteUsernameIssue> {
  if (typeof value !== "string") return err("invalid-suite-username");
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code > 127 || code < 32 || code === 127) {
      return err("invalid-suite-username");
    }
  }
  const trimmed = value.trim();
  const parsed = validateCanonicalSuiteUsername(trimmed.toLowerCase());
  if (!parsed.ok) return parsed;
  return reservedSuiteUsernames.has(parsed.value)
    ? err("suite-username-reserved")
    : parsed;
}

/** Parse an already-canonical value crossing a trusted service boundary. */
export function parseSuiteUsername(
  value: unknown,
): Result<SuiteUsername, SuiteUsernameIssue> {
  if (typeof value !== "string") return err("invalid-suite-username");
  const parsed = validateCanonicalSuiteUsername(value);
  return parsed.ok && parsed.value === value
    ? parsed
    : err(parsed.ok ? "invalid-suite-username" : parsed.error);
}
