import { fetchPublic } from "./public-client";
import type { ArticleCategory, ArticlePublic, ArticleSitemapEntry, Paginated } from "./types";

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
 * Twelve, not the seven the approved design lays out. The page now draws two
 * shelves from one request — federation news and the media round-up — and
 * asking for seven would let a run of general stories push every media item
 * off the end, leaving that section empty for a reason no editor could see.
 *
 * Twelve is the smallest number that keeps both shelves populated in ordinary
 * use. Pagination is the real answer and is recorded as backlog; this is the
 * honest interim.
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
): Promise<Paginated<ArticlePublic> | null> => {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  // Only when asked for: an empty `tag=` would narrow the feed to articles
  // carrying a tag that is the empty string, which is every article's none.
  if (tag) query.set("tag", tag);
  if (category) query.set("category", category);

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
