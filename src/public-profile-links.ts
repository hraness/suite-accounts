import type { SuiteProfileLinkKeyV2 } from "./identity/profiles-v2.js";

/**
 * Brand glyphs adapted from @hugeicons/core-free-icons (MIT, hugeicons.com).
 * The geometry is vendored so this opt-in form surface stays free of a
 * runtime icon dependency; stroke presentation is applied by the renderer.
 */
export type SuiteProfileLinkGlyph = ReadonlyArray<
  | readonly ["path", Readonly<{ d: string }>]
  | readonly ["circle", Readonly<{ cx: number; cy: number; r: number }>]
>;

export type SuiteProfileLinkAffordance = Readonly<{
  glyph: SuiteProfileLinkGlyph;
  placeholder: string;
  prefix: string;
}>;

const X_GLYPH: SuiteProfileLinkGlyph = [
  ["path", { d: "M3 21L10.5484 13.4516M21 3L13.4516 10.5484M13.4516 10.5484L8 3H3L10.5484 13.4516M13.4516 10.5484L21 21H16L10.5484 13.4516" }],
];

const GITHUB_GLYPH: SuiteProfileLinkGlyph = [
  ["path", { d: "M10 20.5675C6.57143 21.7248 3.71429 20.5675 2 17" }],
  ["path", { d: "M10 22V18.7579C10 18.1596 10.1839 17.6396 10.4804 17.1699C10.6838 16.8476 10.5445 16.3904 10.1771 16.2894C7.13394 15.4528 5 14.1077 5 9.64606C5 8.48611 5.38005 7.39556 6.04811 6.4464C6.21437 6.21018 6.29749 6.09208 6.31748 5.9851C6.33746 5.87813 6.30272 5.73852 6.23322 5.45932C5.95038 4.32292 5.96871 3.11619 6.39322 2.02823C6.39322 2.02823 7.27042 1.74242 9.26698 2.98969C9.72282 3.27447 9.95075 3.41686 10.1515 3.44871C10.3522 3.48056 10.6206 3.41384 11.1573 3.28041C11.8913 3.09795 12.6476 3 13.5 3C14.3524 3 15.1087 3.09795 15.8427 3.28041C16.3794 3.41384 16.6478 3.48056 16.8485 3.44871C17.0493 3.41686 17.2772 3.27447 17.733 2.98969C19.7296 1.74242 20.6068 2.02823 20.6068 2.02823C21.0313 3.11619 21.0496 4.32292 20.7668 5.45932C20.6973 5.73852 20.6625 5.87813 20.6825 5.9851C20.7025 6.09207 20.7856 6.21019 20.9519 6.4464C21.6199 7.39556 22 8.48611 22 9.64606C22 14.1077 19.8661 15.4528 16.8229 16.2894C16.4555 16.3904 16.3162 16.8476 16.5196 17.1699C16.8161 17.6396 17 18.1596 17 18.7579V22" }],
];

const LINKEDIN_GLYPH: SuiteProfileLinkGlyph = [
  ["path", { d: "M7 10V17" }],
  ["path", { d: "M11 13V17M11 13C11 11.3431 12.3431 10 14 10C15.6569 10 17 11.3431 17 13V17M11 13V10" }],
  ["path", { d: "M7.125 6.75H7M7.25 6.75C7.25 6.88807 7.13807 7 7 7C6.86193 7 6.75 6.88807 6.75 6.75C6.75 6.61193 6.86193 6.5 7 6.5C7.13807 6.5 7.25 6.61193 7.25 6.75Z" }],
  ["path", { d: "M3 12C3 7.75736 3 5.63604 4.31802 4.31802C5.63604 3 7.75736 3 12 3C16.2426 3 18.364 3 19.682 4.31802C21 5.63604 21 7.75736 21 12C21 16.2426 21 18.364 19.682 19.682C18.364 21 16.2426 21 12 21C7.75736 21 5.63604 21 4.31802 19.682C3 18.364 3 16.2426 3 12Z" }],
];

const WEBSITE_GLYPH: SuiteProfileLinkGlyph = [
  ["circle", { cx: 12, cy: 12, r: 10 }],
  ["path", { d: "M8 12C8 18 12 22 12 22C12 22 16 18 16 12C16 6 12 2 12 2C12 2 8 6 8 12Z" }],
  ["path", { d: "M21 15H3" }],
  ["path", { d: "M21 9H3" }],
];

const BLUESKY_GLYPH: SuiteProfileLinkGlyph = [
  ["path", { d: "M12 11.4963C11.8936 11.2963 7.45492 3 3.50417 3C1.33647 3 2.00456 8 2.50443 10.5C2.70653 11.5108 3.50417 14.5 8.003 14C8.003 14 4.00404 14.5 4.00404 17C4.00404 18.5 6.50339 21 8.50287 21C10.4606 21 11.9391 16.6859 12 16.5058C12.0609 16.6859 13.5394 21 15.4971 21C17.4966 21 19.996 18.5 19.996 17C19.996 14.5 15.997 14 15.997 14C20.4958 14.5 21.2935 11.5108 21.4956 10.5C21.9954 8 22.6635 3 20.4958 3C16.5451 3 12.1064 11.2963 12 11.4963Z" }],
];

const INSTAGRAM_GLYPH: SuiteProfileLinkGlyph = [
  ["path", { d: "M3 12C3 7.75736 3 5.63604 4.31802 4.31802C5.63604 3 7.75736 3 12 3C16.2426 3 18.364 3 19.682 4.31802C21 5.63604 21 7.75736 21 12C21 16.2426 21 18.364 19.682 19.682C18.364 21 16.2426 21 12 21C7.75736 21 5.63604 21 4.31802 19.682C3 18.364 3 16.2426 3 12Z" }],
  ["path", { d: "M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z" }],
  ["path", { d: "M17.3748 6.75024H17.2498M17.4998 6.75024C17.4998 6.88832 17.3878 7.00024 17.2498 7.00024C17.1117 7.00024 16.9998 6.88832 16.9998 6.75024C16.9998 6.61217 17.1117 6.50024 17.2498 6.50024C17.3878 6.50024 17.4998 6.61217 17.4998 6.75024Z" }],
];

const TELEGRAM_GLYPH: SuiteProfileLinkGlyph = [
  ["path", { d: "M11.9854 15.4083L15.2268 19.0936C16.4277 20.4589 17.0282 21.1416 17.6567 20.9754C18.2852 20.8092 18.5008 19.9108 18.9318 18.1138L21.3229 8.1459C21.9868 5.37832 22.3187 3.99454 21.5808 3.312C20.843 2.62947 19.564 3.13725 17.0061 4.15282L5.13876 8.86449C3.09293 9.67674 2.07001 10.0829 2.00507 10.7808C1.99842 10.8522 1.99831 10.9241 2.00474 10.9955C2.06754 11.6937 3.08921 12.1033 5.13255 12.9223C6.05838 13.2934 6.5213 13.479 6.8532 13.8344C6.89052 13.8743 6.9264 13.9157 6.96078 13.9584C7.26658 14.3384 7.39709 14.8371 7.65808 15.8344L8.14653 17.701C8.4005 18.6715 8.52749 19.1568 8.86008 19.223C9.19267 19.2891 9.48225 18.8867 10.0614 18.0819L11.9854 15.4083ZM11.9854 15.4083L11.6676 15.0771C11.3059 14.7001 11.1251 14.5117 11.1251 14.2775C11.1251 14.0433 11.3059 13.8548 11.6676 13.4778L15.2406 9.75409" }],
];

export const SUITE_PROFILE_LINK_AFFORDANCES = {
  bluesky: { glyph: BLUESKY_GLYPH, placeholder: "name.bsky.social", prefix: "bsky.app/profile/" },
  github: { glyph: GITHUB_GLYPH, placeholder: "username", prefix: "github.com/" },
  instagram: { glyph: INSTAGRAM_GLYPH, placeholder: "handle", prefix: "instagram.com/" },
  linkedin: { glyph: LINKEDIN_GLYPH, placeholder: "handle", prefix: "linkedin.com/in/" },
  telegram: { glyph: TELEGRAM_GLYPH, placeholder: "handle", prefix: "t.me/" },
  website: { glyph: WEBSITE_GLYPH, placeholder: "example.com", prefix: "https://" },
  x: { glyph: X_GLYPH, placeholder: "handle", prefix: "x.com/" },
} satisfies Readonly<Record<SuiteProfileLinkKeyV2, SuiteProfileLinkAffordance>>;

const SCHEME = /^https?:\/\//iu;

/**
 * Expands a bare handle or schemeless URL into the canonical HTTPS form the
 * parser accepts, so each link field can be filled with just a handle. The
 * authoritative normalizer still validates the expanded value on save.
 */
export function expandSuiteProfileLinkInput(
  key: SuiteProfileLinkKeyV2,
  raw: string,
): string {
  const trimmed = raw.trim();
  if (trimmed === "" || SCHEME.test(trimmed)) return trimmed;
  const withoutAt = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  if (key === "website") return `https://${trimmed}`;
  if (withoutAt.includes("/")) return `https://${withoutAt}`;
  switch (key) {
    case "bluesky": {
      const handle = withoutAt.includes(".")
        ? withoutAt
        : `${withoutAt}.bsky.social`;
      return `https://bsky.app/profile/${handle}`;
    }
    case "github":
      return `https://github.com/${withoutAt}`;
    case "instagram":
      return `https://www.instagram.com/${withoutAt}`;
    case "linkedin":
      return `https://www.linkedin.com/in/${withoutAt}`;
    case "telegram":
      return `https://t.me/${withoutAt}`;
    case "x":
      return `https://x.com/${withoutAt}`;
  }
}
