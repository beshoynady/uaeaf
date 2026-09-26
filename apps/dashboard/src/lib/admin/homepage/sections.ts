/**
 * The homepage's sections, as the management screen understands them.
 *
 * `pageSections` stores what a section IS — its type, its order, whether it is
 * drawn. It stores nothing about how to talk about it: no name an editor would
 * recognise, no sentence saying what the section does, and no address for the
 * screen that edits it. That is this file.
 *
 * -- Not in the approval workflow --------------------------------------------
 *
 * `pageSections` is absent from `WORKFLOW_ENTITY_TYPES` (checked 2026-09-24),
 * so ordering a section and hiding one are direct writes gated only by
 * `pageSections:Update`. There is no review step to route them through, and
 * adding one here would invent a policy nobody approved.
 */

/**
 * Whether the list offers the up/down arrows.
 *
 * OFF, deliberately, until the homepage actually reads `displayOrder`.
 * `apps/web/src/app/[locale]/page.tsx` draws three hardcoded groups and sorts
 * only WITHIN each of them, so a saved reorder is stored faithfully and
 * changes nothing a visitor sees — the worst kind of control, because it
 * reports success. Measured and written up as "ترتيب الرئيسية الحقيقي" in
 * `docs/engineering/post-delivery-backlog.md` §7.
 *
 * The arrows, `moveSection`, `changedOrders`, the route handler's `orders`
 * branch and all their tests stay exactly as they are. Flipping this back to
 * `true` is the last step of that task, not a rewrite.
 *
 * The visibility switch is NOT behind this: hiding a section works today.
 */
export const SECTION_REORDER_ENABLED = false;

/** A section whose absence would leave the homepage without a front door.
 *  Enforced on the write path as well as in the UI — a switch that is merely
 *  not drawn is not a rule, it is an omission waiting for a hand-made
 *  request. */
const LOCKED_SECTION_TYPES = new Set(["HERO"]);

/**
 * Never listed here, even if a row appears.
 *
 * The footer is on every page of the site, so "hide it on the homepage" is not
 * a thing the platform can express. Today no `FOOTER` row exists at all — the
 * footer and the sponsor strip live in `siteSettings` — so this is a guard
 * against a row being added later, not a case the screen meets now. Both keep
 * their sidebar screens.
 */
const EXCLUDED_SECTION_TYPES = new Set(["FOOTER"]);

/**
 * The homepage holds TWO `LATEST_NEWS` rows: the general shelf, and the one
 * narrowed to `FederationInMedia`, which is where "UAEAF in the media" stands
 * (`apps/web/src/lib/pages/homepage-news.ts`). They are the same section type,
 * so a registry keyed on type alone names them identically — and an editor
 * hiding one of two rows called "آخر الأخبار" is guessing.
 *
 * `configuration.category` is what tells them apart — the same field, read the
 * same way, that `shelfCategory()` in `apps/web/src/lib/pages/homepage-news.ts`
 * uses to decide which shelf a row is. Reading a different field here would
 * let the list name a row one thing while the site drew it as another.
 */
const NEWS_COVERAGE_CATEGORY = "FederationInMedia";

export interface HomepageSectionMeta {
  sectionType: string;
  /** Key into the `Homepage` message namespace, for the name and the line
   *  under it. */
  messageKey: string;
  /** The screen that edits it, or `null` where no screen exists yet. A link to
   *  a route that does not exist is worse than no link. */
  href: string | null;
}

/**
 * Every section type the approved homepage can hold, in the order the
 * inventory lists them.
 *
 * A type absent from here is still listed by `toHomepageSections` — it just
 * has no name and no editor. That is deliberate: the screen must not quietly
 * disagree with the page it claims to describe.
 */
export const HOMEPAGE_SECTIONS: readonly HomepageSectionMeta[] = [
  { sectionType: "HERO", messageKey: "hero", href: "/homepage/hero" },
  // No `pageSections` row: the strip is stored in `siteSettings`. Listed so
  // the rail can name it and link to its screen; it gets no switch until the
  // ordering task gives it a row (backlog §7).
  { sectionType: "SPONSOR_STRIP", messageKey: "sponsorStrip", href: "/homepage/sponsor-strip" },
  { sectionType: "FEDERATION_STATS", messageKey: "federationStats", href: null },
  { sectionType: "CLUBS", messageKey: "clubs", href: null },
  { sectionType: "FEATURED_ATHLETES", messageKey: "featuredAthletes", href: null },
  { sectionType: "UPCOMING_HIGHLIGHTS", messageKey: "upcomingHighlights", href: null },
  { sectionType: "RESULTS_RANKINGS", messageKey: "resultsRankings", href: null },
  { sectionType: "LATEST_NEWS", messageKey: "latestNews", href: null },
  // Not a section type of its own — a `LATEST_NEWS` row narrowed by category.
  // Listed here so `sectionCopy` builds its name and description like the
  // rest; `toHomepageSections` picks it by the row's own filter.
  { sectionType: "LATEST_NEWS:coverage", messageKey: "externalMedia", href: null },
  { sectionType: "EXTERNAL_MEDIA", messageKey: "externalMediaSection", href: null },
  { sectionType: "SPONSORS", messageKey: "sponsors", href: "/homepage/sponsors" },
  { sectionType: "PARTNERS", messageKey: "partners", href: "/homepage/partners" },
  { sectionType: "MEMBERSHIPS", messageKey: "memberships", href: "/homepage/memberships" },
  { sectionType: "VIDEO_LIBRARY", messageKey: "video", href: "/homepage/video" },
  { sectionType: "PHOTO_GALLERY", messageKey: "photoGallery", href: "/homepage/albums" },
  { sectionType: "NEWSLETTER_CTA", messageKey: "newsletterCta", href: null },
];

const META = new Map(HOMEPAGE_SECTIONS.map((meta) => [meta.sectionType, meta]));

/**
 * The rail's order: the order the homepage ACTUALLY draws, today.
 *
 * Not `displayOrder`. `apps/web/src/app/[locale]/page.tsx` renders three
 * hardcoded groups and sorts only within each, so the stored numbers and the
 * page disagree — sponsors, partners and memberships are 1, 2 and 3 and are
 * drawn last (backlog §7). A rail sorted by `displayOrder` would therefore
 * tell an editor the page is in an order it is not.
 *
 * So the order is written here, matching the page, and the honest reading of
 * this constant is: it exists BECAUSE the page is hardcoded, and it is deleted
 * by the same task that makes the page read `displayOrder`.
 *
 * `SPONSOR_STRIP` is in the list and has no `pageSections` row at all — it is
 * stored in `siteSettings`. The rail shows it as a link with no switch, since
 * there is nothing to switch until that task gives it a row.
 */
export const HOMEPAGE_RAIL_ORDER: readonly string[] = [
  "HERO",
  "SPONSOR_STRIP",
  "LATEST_NEWS",
  "LATEST_NEWS:coverage",
  "VIDEO_LIBRARY",
  "PHOTO_GALLERY",
  "SPONSORS",
  "PARTNERS",
  "MEMBERSHIPS",
];

/** A rail entry that has no `pageSections` row behind it, so nothing to
 *  switch. Today that is the sponsor strip alone. */
export interface RailEntry {
  key: string;
  messageKey: string;
  href: string | null;
  /** The row, when one exists. `null` means no switch is offered. */
  section: HomepageSection | null;
}

/**
 * The rail, in page order, with each entry's row attached where it has one.
 *
 * Rows the order does not name are appended rather than dropped: a section
 * added upstream must still be reachable and switchable, even before this
 * constant learns where it goes.
 */
export const toRailEntries = (sections: readonly HomepageSection[]): RailEntry[] => {
  const byKey = new Map(sections.map((section) => [railKeyOf(section), section]));

  const ordered = HOMEPAGE_RAIL_ORDER.map((key) => {
    const meta = META.get(key);
    return {
      key,
      messageKey: meta?.messageKey ?? key,
      href: meta?.href ?? null,
      section: byKey.get(key) ?? null,
    };
  });

  const named = new Set(HOMEPAGE_RAIL_ORDER);
  const extras = sections
    .filter((section) => !named.has(railKeyOf(section)))
    .map((section) => ({
      key: railKeyOf(section),
      messageKey: section.messageKey ?? section.sectionType,
      href: section.href,
      section,
    }));

  return [...ordered, ...extras];
};

export const isLocked = (sectionType: string): boolean => LOCKED_SECTION_TYPES.has(sectionType);

/** One row as the screen draws it. */
export interface HomepageSection {
  id: string;
  sectionType: string;
  displayOrder: number;
  enabled: boolean;
  /** `null` for a type the registry does not name — the screen falls back to
   *  the raw type rather than showing nothing. */
  messageKey: string | null;
  href: string | null;
  locked: boolean;
  /** The key this row matches in `HOMEPAGE_RAIL_ORDER`: its type, or the
   *  type-and-category pair for the one type that appears twice. */
  railKey: string;
}

const railKeyOf = (section: HomepageSection): string => section.railKey;

interface SectionRow {
  _id: string;
  sectionType: string;
  displayOrder?: number;
  enabled?: boolean;
  /** Free-form section settings. `category` on a `LATEST_NEWS` row is what
   *  makes it the coverage shelf rather than the general one. */
  configuration?: { category?: unknown } | null;
}

/** The registry key for a row: its type, or — for the one type that appears
 *  twice — its type and the category that distinguishes the two. */
const registryKey = (row: SectionRow): string =>
  row.sectionType === "LATEST_NEWS" && row.configuration?.category === NEWS_COVERAGE_CATEGORY
    ? "LATEST_NEWS:coverage"
    : row.sectionType;

/**
 * The API's rows, in the order a visitor meets them.
 *
 * Sorted here rather than trusted from the API: the screen's whole claim is
 * "this is the order of the page", and a list that merely echoes whatever
 * arrived would be right only by luck.
 */
export const toHomepageSections = (rows: readonly SectionRow[]): HomepageSection[] =>
  rows
    .filter((row) => !EXCLUDED_SECTION_TYPES.has(row.sectionType))
    .map((row) => {
      const meta = META.get(registryKey(row));
      return {
        id: row._id,
        sectionType: row.sectionType,
        displayOrder: typeof row.displayOrder === "number" ? row.displayOrder : 0,
        // Mongoose defaults this to true, so only an explicit false is off.
        enabled: row.enabled !== false,
        messageKey: meta?.messageKey ?? null,
        href: meta?.href ?? null,
        locked: isLocked(row.sectionType),
        railKey: registryKey(row),
      };
    })
    .sort((a, b) => a.displayOrder - b.displayOrder);

interface Orderable {
  id: string;
  sectionType: string;
  displayOrder: number;
}

/**
 * The list after one section moves one place.
 *
 * `null` when the move is impossible — the first cannot go up, the last cannot
 * go down, an unknown id moves nothing. The buttons are disabled from the same
 * fact, so this is the second guard rather than the only one, and it is what
 * stops a write that would change nothing.
 *
 * Every position is renumbered from zero. The rows may arrive with gaps (4, 9,
 * 12) from earlier hand edits; a swap that preserved them would leave two
 * sections able to collide the next time one is inserted "at the end".
 */
export const moveSection = <T extends Orderable>(
  sections: readonly T[],
  id: string,
  direction: "up" | "down",
): T[] | null => {
  const from = sections.findIndex((section) => section.id === id);
  if (from < 0) return null;

  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= sections.length) return null;

  const next = [...sections];
  [next[from], next[to]] = [next[to], next[from]];

  return next.map((section, index) => ({ ...section, displayOrder: index }));
};

/** Only the rows whose stored order is now wrong. One PATCH each: sending the
 *  whole list on every press would be writes that store the number already
 *  there, and more chances for one of them to fail. */
export const changedOrders = <T extends Orderable>(
  before: readonly T[],
  after: readonly T[],
): { id: string; displayOrder: number }[] => {
  const was = new Map(before.map((section) => [section.id, section.displayOrder]));
  return after
    .filter((section) => was.get(section.id) !== section.displayOrder)
    .map((section) => ({ id: section.id, displayOrder: section.displayOrder }));
};
