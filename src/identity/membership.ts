import { deepFreeze } from "../immutable.js";

/**
 * Public membership product shown on the shared subscription surfaces.
 *
 * Only display metadata lives here: the stable product ID, emoji, name,
 * canonical link, and short description. Accounts and the hraness.com plan
 * page render the list verbatim; the portfolio site keeps it convergent with
 * the authored portfolio catalog.
 */
export type SuiteMembershipProduct = Readonly<{
  description: string;
  emoji: string;
  href: `https://${string}`;
  id: string;
  name: string;
}>;

export const SUITE_MEMBERSHIP_PRODUCTS = deepFreeze([
  {
    description: "local personal crm for everyone you know, built for your agent",
    emoji: "📇",
    href: "https://peopleblade.com",
    id: "peopleblade",
    name: "PEOPLEBLADE",
  },
  {
    description: "media studio for agents: images, 3d, animation, and video to revise",
    emoji: "📸",
    href: "https://slopcamera.com",
    id: "slopcamera",
    name: "SLOPCAMERA",
  },
  {
    description: "build prompt that turns a coding agent into a trading-system designer",
    emoji: "📈",
    href: "https://sloptrade.com",
    id: "sloptrade",
    name: "SLOPTRADE",
  },
  {
    description: "software studio making tools for ai agents and for people",
    emoji: "🪢",
    href: "https://hraness.com",
    id: "hraness",
    name: "HRANESS",
  },
  {
    description: "free sleep sounds made in your browser, with sourced sleep guides",
    emoji: "💤",
    href: "https://sleepy.land",
    id: "sleepyland",
    name: "SLEEPYLAND",
  },
  {
    description: "independent history of stripe where every event is dated and sourced",
    emoji: "🦓",
    href: "https://hraness.com/stripe",
    id: "stripe-history",
    name: "STRIPE HISTORY",
  },
  {
    description: "browser experiments for a game of algorithmic organisms",
    emoji: "🦠",
    href: "https://platonik.space",
    id: "platonik",
    name: "PLATONIK",
  },
  {
    description: "fresh puzzles for ai agents, scored exactly, with a signed receipt",
    emoji: "📡",
    href: "https://clankdar.com",
    id: "clankdar",
    name: "CLANKDAR",
  },
] as const satisfies readonly SuiteMembershipProduct[]);

export type SuiteMembershipProductId =
  (typeof SUITE_MEMBERSHIP_PRODUCTS)[number]["id"];
