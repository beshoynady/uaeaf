import { fetchPublic } from "@/lib/api/public-client";
import { fetchArticles } from "@/lib/api/articles";
import { fetchPublicMedia } from "@/lib/api/media";
import { loadActiveLiveStream, loadVideoPage } from "@/lib/video/load";
import { findPublicPage } from "@/lib/pages/public-pages";
import type { ArticleCategory, MediaAssetPublic, PresidentMessagePublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/** Everything the header's five panels show, in one shape. Every field is
 *  independent: a panel whose own source failed, or does not exist yet,
 *  shows its standing fallback card while its siblings show real data. */
export interface HeaderFeatures {
  presidentExcerpt: { quote: string; href: string } | null;
  nextChampionship: { title: string; date: string; venue: string; href: string } | null;
  nextEvent: { title: string; href: string; startsAt: string } | null;
  currentSeasonSummary: { label: string; championships: number; records: number; href: string } | null;
  /** The Media panel's middle slot (design spec §3.5). `slug` and `category`
   *  are carried alongside the display fields because `ArticleTeaser`'s cover
   *  placeholder is derived from them, not invented at render time. */
  latestArticle: {
    slug: string;
    title: string;
    date: string;
    category: ArticleCategory;
    href: string;
    cover: MediaAssetPublic | null;
  } | null;
  latestVideo: { title: string; href: string; thumbnailId: string | null } | null;
  activeLiveStream: { title: string; href: string } | null;
}

const PRESIDENT_PAGE = findPublicPage("president-message")!;

/** The President's Message pull-quote, for the About panel's card. */
const readPresidentExcerpt = async (
  locale: AppLocale,
): Promise<HeaderFeatures["presidentExcerpt"]> => {
  try {
    const record = await fetchPublic<PresidentMessagePublic>(PRESIDENT_PAGE.apiPath);
    const quote = record?.pullQuote?.[locale];
    if (!quote) return null;
    return { quote, href: PRESIDENT_PAGE.route };
  } catch {
    // A card the reader never asked for is not worth a page-level failure.
    return null;
  }
};

/** The newsroom's most recent live story, for the Media panel's middle slot. */
const readLatestArticle = async (locale: AppLocale): Promise<HeaderFeatures["latestArticle"]> => {
  try {
    const page = await fetchArticles(1, 1);
    const first = page?.items[0];
    if (!first) return null;
    const covers = await fetchPublicMedia([first.coverMediaId]);
    return {
      slug: first.slug,
      title: first.title[locale] || first.title.ar,
      date: first.publishDate ?? "",
      category: first.category,
      href: `/news/${first.slug}`,
      cover: (first.coverMediaId && covers.get(first.coverMediaId)) || null,
    };
  } catch {
    return null;
  }
};

/** The most recently published video, for the Media panel's card. */
const readLatestVideo = async (locale: AppLocale): Promise<HeaderFeatures["latestVideo"]> => {
  try {
    const query = new URLSearchParams({ page: "1", limit: "1" }).toString();
    const page = await loadVideoPage(query);
    const first = page?.items[0];
    if (!first) return null;
    return {
      title: first.title[locale] || first.title.ar,
      href: "/media/videos",
      thumbnailId: first.thumbnailId,
    };
  } catch {
    return null;
  }
};

/** The broadcast running right now, or `null` the moment it ends. */
const readActiveLiveStream = async (
  locale: AppLocale,
): Promise<HeaderFeatures["activeLiveStream"]> => {
  try {
    const live = await loadActiveLiveStream();
    if (!live) return null;
    return { title: live.title[locale] || live.title.ar, href: "/media/videos#live" };
  } catch {
    return null;
  }
};

const settled = <T,>(result: PromiseSettledResult<T | null>): T | null =>
  result.status === "fulfilled" ? result.value : null;

/**
 * Everything the header's cards show, in one pass.
 *
 * Each source is settled on its own. The header is on every page, so a single
 * upstream failure must cost its own card and nothing else — never the
 * navigation the reader came for. `try/catch` inside each reader turns a
 * failure into `null`; `Promise.allSettled` around the set catches anything a
 * reader throws outside its own try (a bug in the mapping itself). One
 * without the other leaves a gap.
 */
export const getHeaderFeatures = async (locale: AppLocale): Promise<HeaderFeatures> => {
  const [president, article, video, live] = await Promise.allSettled([
    readPresidentExcerpt(locale),
    readLatestArticle(locale),
    readLatestVideo(locale),
    readActiveLiveStream(locale),
  ]);

  return {
    presidentExcerpt: settled(president),
    latestArticle: settled(article),
    latestVideo: settled(video),
    activeLiveStream: settled(live),
    // No championships/records collection exists yet (owned by a later
    // project); inventing a shape for it here would have to be undone.
    nextChampionship: null,
    // The public events calendar does not exist yet (a later project owns
    // it); `readNextEvent` in `lib/pages/homepage.ts` reads the homepage
    // hero's own editor-typed event, which is a different concept.
    nextEvent: null,
    // Depends on the championships/records collections above.
    currentSeasonSummary: null,
  };
};
