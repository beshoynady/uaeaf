import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { buildStaticPageMetadata, loadStaticPage } from "@/components/pages/static-page-screen";
import { NewsScreen } from "@/components/pages/news/news-screen";
import { rangeIsPossible } from "@uaeaf/content/time-range";
import { NEWS_PAGE_SIZE, fetchArticles } from "@/lib/api/articles";
import { fetchPublicMedia } from "@/lib/api/media";
import { clampPage, feedHref, pageCount } from "@/lib/news/feed-query";
import { findPublicPage } from "@/lib/pages/public-pages";
import { isIndexable } from "@/lib/pages/indexability";
import { ARTICLE_CATEGORIES, ARTICLE_TOPICS } from "@/lib/api/types";
import type { ArticleCategory, ArticleTopic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

const KEY = "news";

/**
 * The news listing: this file reads the query and fetches; `NewsScreen` draws.
 *
 * A newsroom that has published nothing is Chapter 14 §11's case: the listing
 * draws nothing, and `isIndexable` — which asks the same endpoint the body
 * renders from — keeps the page out of the index and the sitemap until it has
 * something, so the robots directive and the sitemap cannot disagree.
 *
 * `?tag=`, `?category=`, `?topic=`, `?from=`, `?to=` and `?page=` are all views
 * of this one listing, so all are parameters rather than paths: the page keeps
 * its address and its metadata, and clearing a filter returns to the start. A
 * tag or topic nothing carries answers an empty listing rather than a 404,
 * which is the truth about a label nothing carries.
 */

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> => {
  const { locale } = await params;
  return buildStaticPageMetadata(KEY, locale, await isIndexable(findPublicPage(KEY)!));
};

/** `?tag=a&tag=b` arrives as an array; the first is what the badge meant. */
const one = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() || undefined;

const NewsPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const search = await searchParams;

  // Topic, category and window are checked here rather than forwarded: each
  // invalid value is a 400 upstream, and the page would render an error where
  // a reader expects a list.
  const asked = one(search.topic);
  const topic = ARTICLE_TOPICS.includes(asked as ArticleTopic) ? (asked as ArticleTopic) : undefined;
  const askedCategory = one(search.category);
  const category = ARTICLE_CATEGORIES.includes(askedCategory as ArticleCategory)
    ? (askedCategory as ArticleCategory)
    : undefined;
  const askedRange = { from: one(search.from), to: one(search.to) };
  const range = rangeIsPossible(askedRange.from, askedRange.to) ? askedRange : {};
  const tag = one(search.tag);
  const page = clampPage(one(search.page));

  const [{ title, subtitle, heroImage }, feed] = await Promise.all([
    loadStaticPage(KEY, locale),
    fetchArticles(page, undefined, tag, category, range, topic),
  ]);

  const articles = feed?.items ?? [];
  const pages = pageCount(feed?.total ?? 0, feed?.limit ?? NEWS_PAGE_SIZE);
  const query = { tag, category, topic, range, page };

  // A page past the end is a stale link into a feed that has since shrunk:
  // corrected in the address, in one locale-aware hop.
  if (page > pages) {
    redirect({ href: feedHref(query, { page: pages }), locale });
  }

  const covers = await fetchPublicMedia(articles.map((article) => article.coverMediaId));

  return (
    <NewsScreen
      locale={locale}
      title={title}
      subtitle={subtitle}
      heroImage={heroImage}
      articles={articles}
      covers={covers}
      query={query}
      pages={pages}
    />
  );
};

export default NewsPage;
