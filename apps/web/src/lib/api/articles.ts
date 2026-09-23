import { fetchPublic } from "./public-client";
import type { ArticleCategory, ArticlePublic, ArticleSitemapEntry, ArticleTopic, Paginated } from "./types";
import type { TimeRange } from "@uaeaf/content/time-range";

/**
 * The news reads, in one place.
 *
 * Thin on purpose: every one of these is a `@Public()` route upstream, and the
 * shaping — which articles are live, in what order, and which revision's words
 * they carry — is the API's, not this app's. What these add is the page size
 * and the honest `null` on failure that `fetchPublic` already returns.
 */

/**
 * How many articles the listing asks for.
 *
 * Twelve: the cover story plus a grid that fills three columns evenly at the
 * canvas's own measure, and two rows of two below `xl`. It was twelve before
 * the pager existed too, for a reason that has since gone away — the page drew
 * two shelves from one request and a run of general stories could push every
 * media item off the end. The shelves are one grid now, and the pager is the
 * answer to "and the rest".
 */
export const NEWS_PAGE_SIZE = 12;

/** A page of live articles, newest first. `null` when the API cannot answer —
 *  the page then renders as though nothing is published, which is the same
 *  thing from a reader's side and keeps the site up during a deploy. */
export const fetchArticles = async (
  page = 1,
  limit: number = NEWS_PAGE_SIZE,
  /** One free label. Matched case-insensitively and whole, upstream. */
  tag?: string,
  /** One shelf of the newsroom. Independent of the tag: a story has exactly
   *  one category and any number of labels. */
  category?: ArticleCategory,
  /** A window on the publication date. Both bounds inclusive; `to` runs to the
   *  end of its day upstream. */
  range: TimeRange = {},
  /** One subject from the closed list (ADR-0094). Its own axis, independent of
   *  both the category and the tags: a story carries exactly one topic and one
   *  category, and they answer different questions. */
  topic?: ArticleTopic,
): Promise<Paginated<ArticlePublic> | null> => {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  // Only when asked for: an empty `tag=` would narrow the feed to articles
  // carrying a tag that is the empty string, which is every article's none.
  if (tag) query.set("tag", tag);
  if (category) query.set("category", category);
  if (topic) query.set("topic", topic);
  if (range.from) query.set("from", range.from);
  if (range.to) query.set("to", range.to);

  return fetchPublic<Paginated<ArticlePublic>>(`/articles/public?${query.toString()}`);
};

/**
 * One article by its address.
 *
 * `null` covers three cases the page treats alike: no such slug, a draft that
 * has never been published, and an API that did not answer. A draft carries a
 * slug from the moment it is written, so "the address exists" is not "the
 * article is public" — the distinction is enforced upstream.
 */
export const fetchArticle = async (slug: string): Promise<ArticlePublic | null> => {
  const article = await fetchPublic<ArticlePublic>(`/articles/public/${encodeURIComponent(slug)}`);
  // The route answers 200 with an empty body for a slug that is not live, so
  // an object without a slug is "not found" rather than a malformed article.
  return article && article.slug ? article : null;
};

/** Every live address, for the news sitemap. Identity and dates only. */
export const fetchArticleSitemap = async (): Promise<ArticleSitemapEntry[]> =>
  (await fetchPublic<ArticleSitemapEntry[]>("/articles/public-sitemap")) ?? [];
