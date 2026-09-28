/**
 * Site navigation model.
 *
 * Source of truth for CONTENT STRUCTURE is `docs/product/01-Information-Architecture.md`
 * §8.1 (Product Owner ruling, resolves Master Spec §52 OPEN-004). Display text
 * lives in `messages/{locale}.json` under `Nav` — `key` points into it, so
 * this file stays locale-agnostic.
 *
 * Held as data rather than JSX so the eventual swap to the backend's
 * `GET /api/v1/navigation-menus` public endpoint is a data-source change, not
 * a component rewrite. The tree shape below is what that endpoint would have
 * to return.
 *
 * A panel's children are columns; a column's children are the links it lays
 * out. One nested level below a column, maximum (IA §8.1).
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
  /** Columns on a top-level item, links on a column. Two levels, maximum (IA §8.1). */
  children?: readonly NavItem[];
  /**
   * Optional supporting line, shown only inside a panel. Carries meaning that
   * would otherwise be lost — "Clubs = General Assembly members" is the whole
   * reason §8.1 had Clubs at top level.
   */
  descriptionKey?: string;
  /**
   * A standing label on the destination itself, not a state of the link.
   * Only `/national-teams` carries one: every other unbuilt page in this tree
   * is built by a later project in the same series, and its own page says so.
   */
  badge?: "soon";
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
 * Header primary navigation — 6 top-level items, 5 of them panels.
 *
 * A panel's children are COLUMNS, never links: the column is what the mega
 * panel lays out and what a screen reader announces as a heading, so it exists
 * in the tree rather than being inferred from position.
 */
export const PRIMARY_NAV: readonly NavItem[] = [
  {
    key: "about",
    children: [
      {
        key: "aboutFederationColumn",
        children: [
          { key: "aboutOverview", href: "/about", descriptionKey: "aboutOverviewDescription" },
          { key: "presidentMessage", href: "/about/president" },
          { key: "boardMembers", href: "/about/board-members" },
          { key: "committees", href: "/about/committees" },
        ],
      },
      {
        key: "governance",
        children: [
          { key: "visionMission", href: "/about/governance/vision-mission" },
          { key: "strategicPlan", href: "/about/governance/strategic-plan" },
          { key: "policies", href: "/about/governance/policies", descriptionKey: "policiesDescription" },
        ],
      },
    ],
  },
  {
    key: "athletics",
    children: [
      {
        key: "discoverSport",
        children: [
          { key: "discoverAthletics", href: "/athletics", descriptionKey: "discoverAthleticsDescription" },
          { key: "disciplinesEvents", href: "/athletics#disciplines" },
          { key: "ageCategories", href: "/athletics#ages", descriptionKey: "ageCategoriesDescription" },
          { key: "startTraining", href: "/athletics#start" },
        ],
      },
      {
        key: "athleticsCommunity",
        children: [
          { key: "clubs", href: "/clubs", descriptionKey: "clubsDescription" },
          { key: "athletes", href: "/athletes" },
          {
            key: "nationalTeams",
            href: "/national-teams",
            descriptionKey: "nationalTeamsDescription",
            badge: "soon",
          },
          { key: "coaches", href: "/coaches" },
          { key: "officials", href: "/officials" },
        ],
      },
    ],
  },
  {
    key: "championshipsResults",
    children: [
      {
        key: "competitions",
        children: [
          { key: "championships", href: "/championships", descriptionKey: "championshipsDescription" },
          { key: "resultsRankings", href: "/results-rankings" },
          { key: "records", href: "/records", descriptionKey: "recordsDescription" },
        ],
      },
    ],
  },
  {
    key: "eventsSeasons",
    children: [
      {
        key: "eventsColumn",
        children: [
          { key: "allEvents", href: "/events", descriptionKey: "allEventsDescription" },
          { key: "seasonAgenda", href: "/events?view=calendar" },
          { key: "currentSeason", href: "/seasons/current" },
          { key: "seasonsArchive", href: "/seasons" },
        ],
      },
    ],
  },
  {
    key: "media",
    children: [
      {
        key: "contentColumn",
        children: [
          { key: "news", href: "/news", descriptionKey: "newsDescription" },
          { key: "photoAlbums", href: "/media/albums" },
          { key: "videos", href: "/media/videos" },
          { key: "liveStream", href: "/media/videos#live" },
        ],
      },
    ],
  },
  { key: "contact", href: "/contact" },
];

/** The page part of a destination: everything before `#` or `?`. */
const pagePart = (href: string): string => href.split(/[#?]/, 1)[0]!;

/**
 * Every leaf destination in the tree, in reading order.
 *
 * A destination is a page. An in-page anchor, and a pre-filtered view of a page
 * the list already carries, are the same address twice over — the footer would
 * print both.
 */
export const navDestinations = (items: readonly NavItem[] = PRIMARY_NAV): NavLeaf[] => {
  const seen = new Set<string>();
  const walk = (nodes: readonly NavItem[]): NavLeaf[] =>
    nodes.flatMap((item) => {
      if (item.children) return walk(item.children);
      const page = pagePart(item.href!);
      // An anchor is a position inside a page, not a page. The live-stream item
      // is conditional too, and a footer cannot express "only while a broadcast
      // is running".
      if (page !== item.href || seen.has(page)) return [];
      seen.add(page);
      return [item as NavLeaf];
    });
  return walk(items);
};

/**
 * True when `path` is this destination, or somewhere beneath it.
 *
 * Whole segments, so "/media" is current on "/media/videos" but "/news" is
 * NOT current on "/newsletter" — a prefix match on the raw string would make
 * every page whose address merely starts with another's light up its link.
 * The home route matches only itself, or it would be current everywhere.
 * An `#anchor` or `?query` is stripped before matching: it names a position or
 * a filtered view of the page, never a different page.
 */
export const isWithin = (href: string, path: string): boolean => {
  const page = pagePart(href);
  return page === "/" ? path === "/" : path === page || path.startsWith(`${page}/`);
};

/**
 * True when `item` is, or contains at any depth, the given path.
 *
 * Descendants count (owner request 2026-09-23, Brief §5.18): a reader on a
 * page below a menu destination is still in that part of the site, and a menu
 * that says otherwise has lost them. "المركز الإعلامي" therefore stays current
 * across every page under `/media`.
 */
export const containsPath = (item: NavItem, path: string): boolean => {
  if (item.href && isWithin(item.href, path)) return true;
  return (item.children ?? []).some((child) => containsPath(child, path));
};

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
