/**
 * Site navigation model.
 *
 * Source of truth for CONTENT STRUCTURE is `docs/product/01-Information-Architecture.md`
 * §8.1 (Product Owner ruling, resolves Master Spec §52 OPEN-004), as amended by
 * the owner's decisions of 2026-09-09 recorded in ADR-0062. Display text lives
 * in `messages/{locale}.json` under `Nav` — `key` points into it, so this file
 * stays locale-agnostic.
 *
 * Held as data rather than JSX so the eventual swap to the backend's
 * `GET /api/v1/navigation-menus` public endpoint is a data-source change, not
 * a component rewrite. The tree shape below is what that endpoint would have
 * to return.
 *
 * ── The 2026-09-09 regrouping ──────────────────────────────────────────────
 *
 * Nine flat top-level items became eight, three of them carrying a disclosure
 * panel. The reason was measured, not stylistic: nine English labels wanted
 * 1098px of row and the widest laptop band offers 1070px, so the row overlapped
 * the utility cluster at 1280, 1366 and 1440 (ADR-0061 §D6). Grouping reduces
 * the row instead of shortening approved copy.
 *
 * Three owner decisions depart from §8.1 as written, each recorded in ADR-0062
 * rather than applied silently:
 *
 *  - **Clubs sits inside Members** (§8.1 has it top-level). §8.1's own note is
 *    that Clubs *is* the General Assembly membership listing, so the meaning
 *    that made it top-level is preserved as a description line on the child
 *    (`descriptionKey`) instead of by position.
 *  - **News is a plain link** (§8.1 has it as a two-item dropdown). Its second
 *    item, "الاتحاد في الإعلام / UAEAF in the Media", becomes a section OF the
 *    news page rather than a destination of its own — so nothing is orphaned,
 *    but ADR-0042 and IA §15.1a now describe a page that will not exist and
 *    need amending.
 *  - **"فعاليات الاتحاد / Federation Events" is shortened to "الفعاليات /
 *    Events"**, in both languages together. This is not a rename away from the
 *    approved term — §8.1 already calls the item "الفاعليات / Events"; the
 *    build was the thing that had drifted. CLAUDE.md §11 protects the
 *    *distinction* between Events and Championships, which §8.1 restates
 *    explicitly and this change does not touch.
 *
 * Not shortened: "الأخبار والمقالات / News & Articles" and "البطولات /
 * Championships". The owner named exactly one label to shorten; CLAUDE.md §12
 * forbids rewriting approved terminology for the sake of it, so the other two
 * keep the words the product documentation uses. (§8.1 writes the second as
 * "Championships" — a discrepancy with the build's "Tournaments" that predates
 * this work and is flagged in ADR-0062, not resolved here.)
 *
 * ── URLs ───────────────────────────────────────────────────────────────────
 *
 * Every existing route is unchanged, per the owner's constraint — including
 * `/events/federation-events`, which keeps its path behind the shorter label.
 * The nine destinations that have no page yet take paths derived from the
 * pattern already in use (`/about/board-members`, `/about/committees`): a
 * section segment then a clean slug, per Chapter 14 §5. They resolve to the
 * 404 screen today, which is the owner's explicit decision — see
 * `built-routes.ts` for how that is kept honest for crawlers.
 */

export interface NavItem {
  /** Key into the `Nav` message namespace (see `messages/*.json`). */
  key: string;
  /**
   * Destination. Absent on a grouping item: a trigger that both navigates and
   * discloses cannot do either unambiguously from the keyboard, so items with
   * children are buttons and never links (WAI-ARIA APG, Disclosure Navigation).
   */
  href?: string;
  /** One nested level, maximum. Two is the documented ceiling (IA §8.1). */
  children?: readonly NavItem[];
  /**
   * Optional supporting line, shown only inside a panel. Carries meaning that
   * would otherwise be lost — "Clubs = General Assembly members" is the whole
   * reason §8.1 had Clubs at top level.
   */
  descriptionKey?: string;
}

/**
 * A destination: an item that navigates rather than discloses. Narrowing the
 * type is what lets the footer and the sitemap consume the same tree without
 * a non-null assertion at every call site.
 */
export interface NavLeaf extends NavItem {
  href: string;
  children?: undefined;
}

/**
 * Header primary navigation — 8 top-level items, 3 with panels, 1 nested level.
 */
export const PRIMARY_NAV: readonly NavItem[] = [
  { key: "home", href: "/" },
  {
    key: "about",
    children: [
      { key: "aboutOverview", href: "/about" },
      { key: "presidentMessage", href: "/about/president" },
      { key: "boardMembers", href: "/about/board-members" },
      { key: "committees", href: "/about/committees" },
      { key: "organisationalStructure", href: "/about/organisational-structure" },
      {
        key: "governance",
        children: [
          { key: "visionMission", href: "/about/governance/vision-mission" },
          { key: "strategicPlan", href: "/about/governance/strategic-plan" },
          { key: "policies", href: "/about/governance/policies" },
        ],
      },
    ],
  },
  {
    key: "members",
    children: [
      { key: "clubs", href: "/clubs", descriptionKey: "clubsDescription" },
      { key: "athletes", href: "/athletes" },
      { key: "coaches", href: "/coaches" },
      { key: "officials", href: "/officials" },
    ],
  },
  { key: "championships", href: "/championships" },
  { key: "events", href: "/events/federation-events" },
  { key: "news", href: "/news" },
  {
    key: "media",
    children: [
      { key: "photoAlbums", href: "/media/albums" },
      { key: "videos", href: "/media/videos" },
    ],
  },
  { key: "contact", href: "/contact" },
];

/** Every leaf destination in the tree, in reading order. */
export function navDestinations(items: readonly NavItem[] = PRIMARY_NAV): NavLeaf[] {
  return items.flatMap((item) =>
    item.children ? navDestinations(item.children) : [item as NavLeaf],
  );
}

/** True when `item` is, or contains at any depth, the given path. */
export function containsPath(item: NavItem, path: string): boolean {
  if (item.href === path) return true;
  return (item.children ?? []).some((child) => containsPath(child, path));
}

/**
 * Footer quick links.
 *
 * RESOLVED 2026-09-07 (owner decision): reconciled 1:1 with the header, closing
 * the divergence Homepage Specification §6 row 13 flagged. IA §9's "must mirror
 * 1:1" is now read as mirroring the header's DESTINATIONS, not its grouping: a
 * footer column cannot disclose, and a flat list of eight group labels — three
 * of which lead nowhere — would mirror the shape while losing the content.
 * Every leaf the header can reach, the footer lists.
 */
export const FOOTER_QUICK_LINKS: readonly NavLeaf[] = navDestinations();

/**
 * Footer legal strip — Figma node 2374:2257.
 *
 * Stored in logical reading order, which is identical in both directions: the
 * first child is the rightmost under `dir="rtl"` and the leftmost under
 * `dir="ltr"`, so the sequence a reader meets is the same in each and matches
 * the tab order (WCAG 2.2 SC 1.3.2, SC 2.4.3).
 */
export const LEGAL_LINKS: readonly NavLeaf[] = [
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
 * Same reasoning as LEGAL_LINKS: one logical order, read identically in both
 * directions.
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
