import { err, ok, type Result } from "@hraness/result";
import { deepFreeze } from "../immutable.js";

/**
 * Deployments that consume the central Accounts authority.
 *
 * This is intentionally distinct from `SUITE_PRODUCTS`: Accounts is a
 * consumer but not a product principal, while some product identities have no
 * interactive authentication surface.
 */
export const SUITE_CONSUMER_IDS = deepFreeze([
  "accounts",
  "act60",
  "elders",
  "gnrte",
  "soundfish",
  "oh-computer",
  "draw-money",
  "oprte",
  "sponge",
  "sup",
] as const);
/**
 * Retired client identities accepted only while parsing bounded pre-OPRTE
 * evidence. New registrations and state always use a canonical ID from
 * `SUITE_CONSUMER_IDS`.
 */
export const LEGACY_SUITE_CONSUMER_IDS = deepFreeze([
  "kitchen",
] as const);

export type SuiteConsumerId = (typeof SUITE_CONSUMER_IDS)[number];
export type LegacySuiteConsumerId =
  (typeof LEGACY_SUITE_CONSUMER_IDS)[number];

export function parseSuiteConsumerId(
  value: unknown,
): Result<SuiteConsumerId, "invalid-consumer"> {
  switch (value) {
    case "accounts":
    case "act60":
    case "elders":
    case "gnrte":
    case "soundfish":
    case "oh-computer":
    case "draw-money":
    case "oprte":
    case "sponge":
    case "sup":
      return ok(value);
    case "kitchen":
      return ok("oprte");
    default:
      return err("invalid-consumer");
  }
}
