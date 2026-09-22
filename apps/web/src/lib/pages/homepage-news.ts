import { fetchArticles } from "@/lib/api/articles";
import { fetchPublicMedia } from "@/lib/api/media";
import type { ArticleCategory, ArticlePublic, MediaAssetPublic, PageSectionPublic } from "@/lib/api/types";

/**
 * The homepage's news shelves, and the stories on each.
 *
 * ── Why the category comes from `configuration` ────────────────────────────
 *
 * `PageSectionPublic.configuration` is the section's own free-form object, and
 * the established rule for it is that each consumer reads the keys it knows.
 * A second section type would have meant a change to the API's closed
 * `PAGE_SECTION_TYPES` enum — which needs owner approval — to express
 * something the existing extension point already expresses. So both shelves
 * are `LATEST_NEWS`, and the one that is narrowed says so in its own
 * configuration.
 *
 * `EXTERNAL_MEDIA` is emphatically NOT used for the media shelf. That section
 * type belongs to `externalMediaCoverage`, a separate collection of pointers
 * at coverage other outlets published, which is out of scope for this batch
 * and must never be conflated with an article the federation wrote about its
 * own presence in the press.
 *
 * ── Why the shelves are fetched lazily ─────────────────────────────────────
 *
 * The sponsors loader's own shape: a shelf nobody composed onto the page costs
 * zero requests. A homepage with no news section makes no news call.
 */

/** Section types this loader answers for. */
const NEWS_SECTION_TYPE = "LATEST_NEWS";

/** What a shelf shows when the CMS names no limit: the lead story and the five
 *  beside it, the count the approved canvas is drawn for. */
const DEFAULT_LIMIT = 6;

export interface HomeNewsShelf {
  section: PageSectionPublic;
  /** `coverage` is the slot "UAEAF in the Media" stands in; see
   *  `isCoverageSlot`. It carries no articles. */
  kind: "news" | "coverage";
  articles: ArticlePublic[];
}

export interface HomepageNews {
  shelves: HomeNewsShelf[];
  covers: ReadonlyMap<string, MediaAssetPublic>;
}

const EMPTY: HomepageNews = { shelves: [], covers: new Map() };

/** The category a shelf is narrowed to, or null for "everything". */
export const shelfCategory = (section: PageSectionPublic): ArticleCategory | null => {
  const asked = (section.configuration as { category?: unknown } | null)?.category;
  // Checked against the closed list rather than cast: `configuration` is
  // free-form, so a typo in the CMS would otherwise become a filter that
  // matches nothing and a shelf that silently disappears.
  return asked === "General" || asked === "FederationInMedia" ? asked : null;
};

/**
 * The shelf narrowed to `FederationInMedia` is where "UAEAF in the Media"
 * stands, and nothing more (owner decision 2026-09-22): the row gives the
 * section its place and its on/off switch, not its content. That section is
 * third-party coverage (Homepage Specification §11b), which the federation's
 * own `FederationInMedia` articles are not; those stay on `/news`.
 */
export const isCoverageSlot = (section: PageSectionPublic): boolean =>
  shelfCategory(section) === "FederationInMedia";

export const newsSections = (sections: readonly PageSectionPublic[]): PageSectionPublic[] =>
  sections
    .filter((section) => section.sectionType === NEWS_SECTION_TYPE)
    .sort((a, b) => a.displayOrder - b.displayOrder);

export const loadHomepageNews = async (
  sections: readonly PageSectionPublic[],
): Promise<HomepageNews> => {
  const shelves = newsSections(sections);
  if (shelves.length === 0) {
    return EMPTY;
  }

  const pages = await Promise.all(
    shelves.map((section) => {
      if (isCoverageSlot(section)) return null;
      const category = shelfCategory(section);
      const limit = section.itemLimit && section.itemLimit > 0 ? section.itemLimit : DEFAULT_LIMIT;

      // The category narrows through the feed's own `category` parameter
      // rather than by over-fetching and filtering here: a run of general
      // stories would otherwise push every media item off the end and empty
      // that shelf for a reason no editor could see.
      return fetchArticles(1, limit, undefined, category ?? undefined);
    }),
  );

  const drawn = shelves.map((section, index): HomeNewsShelf => ({
    section,
    kind: isCoverageSlot(section) ? "coverage" : "news",
    articles: pages[index]?.items ?? [],
  }));

  // One media read for every shelf together: two shelves asking separately
  // would fetch the same asset twice whenever a story sits on both.
  const covers = await fetchPublicMedia(
    drawn.flatMap((shelf) => shelf.articles.map((article) => article.coverMediaId)),
  );

  return { shelves: drawn, covers };
};
