import { err, ok, type Result } from "@hraness/result";
import { deepFreeze } from "../immutable.js";

/**
 * Consumer identities accepted by the released v1 protocol.
 *
 * This is intentionally distinct from both `SUITE_PRODUCTS` and the client
 * registration authority. Accounts is a consumer but not a product principal,
 * some product identities have no interactive authentication surface, and a
 * retired consumer identity may remain parseable without retaining trust.
 */
export const SUITE_CONSUMER_IDS = deepFreeze([
  "accounts",
  "act60",
  "elders",
  "soundfish",
  "oh-computer",
  "draw-money",
  "oprte",
  "sponge",
] as const);
/**
 * Earlier client identities accepted only while parsing bounded historical
 * evidence. Registration authority is defined separately and may reject both
 * these aliases and retired canonical identities.
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
