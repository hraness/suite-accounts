import { err, ok, type Result } from "@hraness/result";
import { deepFreeze } from "../immutable.js";

/**
 * Billing destinations that have a reviewed server-owned return path.
 *
 * This set is intentionally narrower than the Accounts auth-consumer registry.
 * Adding an auth consumer must not make it a valid billing redirect target.
 */
export const SUITE_RETURN_TARGETS = deepFreeze(["accounts"] as const);

export type SuiteReturnTarget = (typeof SUITE_RETURN_TARGETS)[number];

export function parseSuiteReturnTarget(
  value: unknown,
): Result<SuiteReturnTarget, "invalid-return-target"> {
  return value === "accounts"
    ? ok(value)
    : err("invalid-return-target");
}
