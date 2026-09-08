/**
 * Site navigation model.
 *
 * Source of truth for CONTENT STRUCTURE (which items exist, their order, and
 * hrefs) is the approved Figma baseline `Homepage - AR / RTL (APPROVED
 * BASELINE v1)` (node 2374:1174): header nav = node 2374:1180, footer quick
 * links = node 2374:2218. The actual display text now lives in
 * `messages/{locale}.json` under the `Nav`/`Legal`/`Social` namespaces —
 * `key` here points into those, so this file stays locale-agnostic.
 *
 * Held as data rather than JSX so the eventual swap to the backend's
 * `GET /api/v1/navigation-menus` public endpoint is a data-source change,
 * not a component rewrite.
 */

export interface NavItem {
  /** Key into the `Nav` message namespace (see `messages/*.json`). */
  key: string;
  href: string;
  /** True where the approved header shows a chevron-down affordance. */
  hasDropdown?: boolean;
}

/** Header primary navigation — 9 items, per Homepage Specification §9 (resolved). */
export const PRIMARY_NAV: readonly NavItem[] = [
  { key: "home", href: "/" },
  { key: "about", href: "/about", hasDropdown: true },
  { key: "clubs", href: "/clubs" },
  { key: "members", href: "/members", hasDropdown: true },
  { key: "tournaments", href: "/tournaments", hasDropdown: true },
  { key: "federationEvents", href: "/events/federation-events" },
  { key: "news", href: "/news", hasDropdown: true },
  { key: "media", href: "/media", hasDropdown: true },
  { key: "contact", href: "/contact" },
];

/**
 * Footer quick links.
 *
 * RESOLVED 2026-09-07 (owner decision): reconciled 1:1 with `PRIMARY_NAV`,
 * closing the divergence Homepage Specification §6 row 13 flagged ("MUST be
 * updated to match the new 9-item Header 1:1 — not yet done"). Previously an
 * independent 10-item list verbatim from Figma node 2374:2218 — that node is
 * now superseded content, kept only as history in git, not reproduced here.
 * Aliased rather than duplicated so the two navigations cannot drift apart
 * again silently.
 */
export const FOOTER_QUICK_LINKS: readonly NavItem[] = PRIMARY_NAV;

/**
 * Footer legal strip — Figma node 2374:2257.
 *
 * Stored in DOM order for an RTL document, which is the reverse of the Figma
 * export's order. Figma flattens every horizontal row to LTR, so its first
 * child is the LEFTmost; under `dir="rtl"` the first child is the RIGHTmost.
 * Reversing here keeps visual order and reading/tab order identical
 * (WCAG 2.2 SC 1.3.2 Meaningful Sequence, SC 2.4.3 Focus Order).
 *
 * This is direction-DATA, not direction-CSS — it doesn't auto-flip under
 * `dir="ltr"` the way logical Tailwind classes do. Unverified for English:
 * flagged for the i18n visual-verification pass (see deviation log D1).
 */
export const LEGAL_LINKS: readonly NavItem[] = [
  { key: "accessibility", href: "/accessibility" },
  { key: "privacy", href: "/privacy" },
  { key: "terms", href: "/terms" },
  { key: "sitemap", href: "/sitemap" },
];

export interface SocialLink {
  /** Key into the `Social` message namespace — used as the accessible name. */
  key: string;
  href: string;
  icon: string;
  /** Brand background treatment, kept out of the token system on purpose:
   *  these are third-party brand colours, not UAEAF palette values. */
  className: string;
  /** True where Figma exported the complete button artwork rather than a bare
   *  glyph, so the asset fills the 32px button instead of sitting inside it. */
  fullBleed?: boolean;
}

/**
 * Footer social row — Figma node 2374:2243.
 *
 * Same RTL DOM-order reversal as LEGAL_LINKS above: the approved frame shows,
 * left to right, Instagram → X → YouTube → Facebook → TikTok, so in an RTL
 * document that is the reverse in DOM order. Same LTR caveat as LEGAL_LINKS.
 */
export const SOCIAL_LINKS: readonly SocialLink[] = [
  {
    key: "tiktok",
    href: "https://www.tiktok.com/@uaeaf",
    icon: "/icons/social/tiktok.svg",
    className: "bg-transparent",
    fullBleed: true,
  },
  {
    key: "facebook",
    href: "https://www.facebook.com/uaeaf",
    icon: "/icons/social/facebook.svg",
    className: "bg-gradient-to-b from-[#1877f2] via-[#8b9bff] to-[#1877f2]",
  },
  {
    key: "youtube",
    href: "https://www.youtube.com/@uaeaf",
    icon: "/icons/social/youtube.svg",
    className: "bg-gradient-to-b from-[red] via-[#ff3d00] to-[red]",
  },
  {
    key: "x",
    href: "https://x.com/uaeaf",
    icon: "/icons/social/x.png",
    className: "bg-black",
    fullBleed: true,
  },
  {
    key: "instagram",
    href: "https://www.instagram.com/uaeaf",
    icon: "/icons/social/instagram.svg",
    className: "bg-gradient-to-b from-[#405de6] via-[#c13584] to-[#fdaf31]",
  },
];
