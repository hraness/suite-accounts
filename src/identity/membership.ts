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
    description: "personal site",
    emoji: "🪢",
    href: "https://hraness.com",
    id: "hraness",
    name: "HRNSS",
  },
  {
    description: "pareto frontier charts",
    emoji: "👀",
    href: "https://aicharts.io",
    id: "aicharts",
    name: "AI Charts",
  },
  {
    description: "software factories, in practice",
    emoji: "🏭",
    href: "https://swft.io",
    id: "swft",
    name: "SWFT",
  },
  {
    description: "personal life timeline maker",
    emoji: "⏳",
    href: "https://lifecharts.io",
    id: "lifedaysleft",
    name: "Lifecharts",
  },
  {
    description: "sleep research and a calming sound machine",
    emoji: "💤",
    href: "https://sleepy.land",
    id: "sleepyland",
    name: "Sleepyland",
  },
  {
    description: "news aggregator",
    emoji: "🌧️",
    href: "https://rough.day",
    id: "roughday",
    name: "Rough Day",
  },
  {
    description: "history of a generational co",
    emoji: "📚",
    href: "https://hraness.com/stripe",
    id: "stripe-history",
    name: "Stripe History",
  },
  {
    description: "move to puerto rico",
    emoji: "⏱️",
    href: "https://act60.me",
    id: "act60",
    name: "ACT60",
  },
  {
    description: "precise web capabilities for agents",
    emoji: "👻",
    href: "https://ghostget.com",
    id: "wrench",
    name: "Ghostget",
  },
  {
    description: "relationship-aware drafting",
    emoji: "💬",
    href: "https://messagelikeme.com",
    id: "message-like-me",
    name: "Message Like Me",
  },
  {
    description: "visual studio for coding agents",
    emoji: "📷",
    href: "https://slopcamera.com",
    id: "slopcamera",
    name: "Slopcamera",
  },
  {
    description:
      "local-first contact book and evidence-backed enrichment for people and agents",
    emoji: "🗡️",
    href: "https://peopleblade.com",
    id: "peopleblade",
    name: "PeopleBlade",
  },
  {
    description: "absorb knowledge",
    emoji: "🧽",
    href: "https://sponge.computer",
    id: "sponge",
    name: "Sponge",
  },
  {
    description: "markdown knowledge base for coding agents",
    emoji: "📚",
    href: "https://wordcell.io",
    id: "kb",
    name: "Wordcell",
  },
  {
    description: "evidence-backed working models of people",
    emoji: "👀",
    href: "https://soulscrape.com",
    id: "soulscrape",
    name: "Soulscrape",
  },
  {
    description: "browser experiments for a game of algorithmic organisms",
    emoji: "🦠",
    href: "https://platonik.space",
    id: "platonik",
    name: "Platonik",
  },
  {
    description: "repeatable app states for browser agents",
    emoji: "🎯",
    href: "https://hraness.com/direct",
    id: "direct",
    name: "Direct",
  },
  {
    description: "one workspace for coding agents",
    emoji: "⌨️",
    href: "https://oompa.app",
    id: "hra",
    name: "Oompa",
  },
  {
    description: "content-addressable music",
    emoji: "🌊",
    href: "https://sound.fish",
    id: "soundfish",
    name: "Soundfish",
  },
  {
    description: "open-source tools for agentic research",
    emoji: "📚",
    href: "https://oh.computer",
    id: "oh-computer",
    name: "oh.computer",
  },
] as const satisfies readonly SuiteMembershipProduct[]);

export type SuiteMembershipProductId =
  (typeof SUITE_MEMBERSHIP_PRODUCTS)[number]["id"];
