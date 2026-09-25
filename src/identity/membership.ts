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
    description: "model benchmark scores plotted against cost and tokens per task",
    emoji: "📈",
    href: "https://aicharts.io",
    id: "aicharts",
    name: "AI CHARTS",
  },
  {
    description: "markdown knowledge base that gives agents the decisions behind code",
    emoji: "📝",
    href: "https://wordcell.io",
    id: "kb",
    name: "WORDCELL",
  },
  {
    description: "memory for agents that stores each fact with its sources and history",
    emoji: "📚",
    href: "https://oh.computer",
    id: "oh-computer",
    name: "OH",
  },
  {
    description: "private library for what you read, with notes your agent can cite",
    emoji: "🧽",
    href: "https://sponge.computer",
    id: "sponge",
    name: "SPONGE",
  },
  {
    description: "local personal crm for everyone you know, built for your agent",
    emoji: "📇",
    href: "https://peopleblade.com",
    id: "peopleblade",
    name: "PEOPLEBLADE",
  },
  {
    description: "named web actions for ai agents: read pages, save media, use connected accounts",
    emoji: "👻",
    href: "https://ghostget.com",
    id: "ghostget",
    name: "GHOSTGET",
  },
  {
    description: "free agent skill that writes dated dossiers on people, sources cited",
    emoji: "🦾",
    href: "https://soulscrape.com",
    id: "soulscrape",
    name: "SOULSCRAPE",
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
    description: "ehlers-danlos evidence stratified by kind, every record linked to sources",
    emoji: "🧬",
    href: "https://hraness.com/eds",
    id: "eds-research",
    name: "EDS RESEARCH INDEX",
  },
  {
    description: "estimate act 60 savings after real costs, with sourced guides and a day tracker",
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
    description: "repeatable app states for browser agents, opened by url",
    emoji: "🎯",
    href: "https://hraness.com/direct",
    id: "direct",
    name: "DIRECT",
  },
  {
    description: "fresh puzzles for ai agents, scored exactly, with a signed receipt",
    emoji: "📡",
    href: "https://clankdar.com",
    id: "clankdar",
    name: "CLANKDAR",
  },
  {
    description: "turn the chapters of your life into one timeline you can share",
    emoji: "📊",
    href: "https://lifecharts.io",
    id: "lifedaysleft",
    name: "LIFECHARTS",
  },
  {
    description: "free publication about how companies put ai agents to work",
    emoji: "🏭",
    href: "https://swft.io",
    id: "swft",
    name: "SWFT",
  },
] as const satisfies readonly SuiteMembershipProduct[]);

export type SuiteMembershipProductId =
  (typeof SUITE_MEMBERSHIP_PRODUCTS)[number]["id"];
