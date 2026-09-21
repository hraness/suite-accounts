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
    description: "model benchmarks and personal token usage",
    emoji: "📈",
    href: "https://aicharts.io",
    id: "aicharts",
    name: "AI CHARTS",
  },
  {
    description: "a knowledge base for agents: markdown, backlinks, search, ontology, and git context",
    emoji: "📝",
    href: "https://wordcell.io",
    id: "kb",
    name: "WORDCELL",
  },
  {
    description: "an ontology-centered memory and research framework for agents",
    emoji: "📚",
    href: "https://oh.computer",
    id: "oh-computer",
    name: "OH",
  },
  {
    description: "deep research tools for connected, cited knowledge, exploring self-evolution",
    emoji: "🧽",
    href: "https://sponge.computer",
    id: "sponge",
    name: "SPONGE",
  },
  {
    description: "a local-first crm for your personal agent",
    emoji: "📇",
    href: "https://peopleblade.com",
    id: "peopleblade",
    name: "PEOPLEBLADE",
  },
  {
    description: "a fast web gateway with typed website capabilities for agents",
    emoji: "👻",
    href: "https://ghostget.com",
    id: "ghostget",
    name: "GHOSTGET",
  },
  {
    description: "evidence-backed dossiers and revisable models of people",
    emoji: "🦾",
    href: "https://soulscrape.com",
    id: "soulscrape",
    name: "SOULSCRAPE",
  },
  {
    description: "direct visual art, 3d scenes, animation, and video with your agent",
    emoji: "📸",
    href: "https://slopcamera.com",
    id: "slopcamera",
    name: "SLOPCAMERA",
  },
  {
    description: "autonomous trading system research and build specification",
    emoji: "📈",
    href: "https://sloptrade.com",
    id: "sloptrade",
    name: "SLOPTRADE",
  },
  {
    description: "tools for agents and humans",
    emoji: "🪢",
    href: "https://hraness.com",
    id: "hraness",
    name: "HRANESS.COM",
  },
  {
    description: "sleep research and a calming sound machine",
    emoji: "💤",
    href: "https://sleepy.land",
    id: "sleepyland",
    name: "SLEEPYLAND",
  },
  {
    description: "history of a generational co",
    emoji: "🦓",
    href: "https://hraness.com/stripe",
    id: "stripe-history",
    name: "STRIPE HISTORY",
  },
  {
    description: "eds evidence, stratified and sourced",
    emoji: "🧬",
    href: "https://hraness.com/eds",
    id: "eds-research",
    name: "EDS RESEARCH",
  },
  {
    description: "move to puerto rico",
    emoji: "⏱️",
    href: "https://act60.me",
    id: "act60",
    name: "ACT60",
  },
  {
    description: "browser experiments for a game of algorithmic organisms",
    emoji: "🦠",
    href: "https://platonik.space",
    id: "platonik",
    name: "PLATONIK",
  },
  {
    description: "repeatable app states for browser agents",
    emoji: "🎯",
    href: "https://hraness.com/direct",
    id: "direct",
    name: "DIRECT",
  },
  {
    description: "reproducible capability checks for agents",
    emoji: "📡",
    href: "https://clankdar.com",
    id: "clankdar",
    name: "CLANKDAR",
  },
  {
    description: "personal life timeline maker",
    emoji: "📊",
    href: "https://lifecharts.io",
    id: "lifedaysleft",
    name: "LIFECHARTS",
  },
  {
    description: "software factories, in practice",
    emoji: "🏭",
    href: "https://swft.io",
    id: "swft",
    name: "SWFT",
  },
] as const satisfies readonly SuiteMembershipProduct[]);

export type SuiteMembershipProductId =
  (typeof SUITE_MEMBERSHIP_PRODUCTS)[number]["id"];
