import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { StaticPageScreen, buildStaticPageMetadata, loadStaticPage } from "@/components/pages/static-page-screen";
import { NewsList } from "@/components/pages/news/news-list";
import { TagFilterNotice } from "@/components/pages/news/tag-filter-notice";
import { NewsTimeFilter } from "@/components/pages/news/time-filter";
import { rangeIsPossible } from "@uaeaf/content/time-range";
import { Section } from "@/components/ui/section";
import { fetchArticles } from "@/lib/api/articles";
import { fetchPublicMedia } from "@/lib/api/media";
import { findPublicPage } from "@/lib/pages/public-pages";
import { isIndexable } from "@/lib/pages/indexability";
import type { AppLocale } from "@/i18n/routing";

const KEY = "news";

/**
 * The news listing.
 *
 * Until the articles module existed this page was its hero and nothing else,
 * held out of the index by Chapter 14 §11's minimum-content threshold because
 * `CT-ARTICLE-001` had no public read to list. It has one now, so the page
 * lists — and §11's hold lifts by itself, because `isIndexable` asks the same
 * endpoint the body renders from.
 *
 * A newsroom that has published nothing yet is still §11's case: `NewsList`
 * draws nothing, the page is its hero again, and it stays out of both the
 * index and the sitemap until there is something to show. That is one
 * function's decision, so the robots directive and the sitemap cannot
 * disagree about it.
 *
 * ── `?from=` and `?to=` ───────────────────────────────────────────────────
 *
 * The same shape as the tag: a window is a view of this listing, so it keeps
 * the page's address and a reader can bookmark it, send it, and undo it with
 * the browser's own back button. A range the API would refuse is dropped here
 * rather than forwarded — the reader gets the unfiltered list and the control
 * shows nothing pressed, which is the truth about a window that cannot hold
 * anything.
 *
 * ── `?tag=` ────────────────────────────────────────────────────────────────
 *
 * Where every tag badge on the site points. A query parameter rather than a
 * path segment, deliberately: a tag is a view of this listing, not a page of
 * its own, so it keeps this page's address, its hero and its metadata, and a
 * reader clearing the filter is back where they started. It also means a tag
 * nobody uses answers an empty listing rather than a 404 — which is the truth
 * about a label nothing carries.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildStaticPageMetadata(KEY, locale, await isIndexable(findPublicPage(KEY)!));
}

export default async function NewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // `?tag=a&tag=b` arrives as an array. One tag is the whole feature, and
  // taking the first is what the badge that built the link meant.
  const query = await searchParams;
  const one = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value)?.trim() || undefined;

  const tag = one(query.tag);
  const asked = { from: one(query.from), to: one(query.to) };
  // A window that closes before it opens is refused upstream with a 400. Sent
  // anyway, the page would render an error where a reader expects a list.
  const range = rangeIsPossible(asked.from, asked.to) ? asked : {};

  const [{ title, subtitle, heroImage }, page] = await Promise.all([
    loadStaticPage(KEY, locale),
    fetchArticles(1, undefined, tag, undefined, range),
  ]);

  const articles = page?.items ?? [];
  const covers = await fetchPublicMedia(articles.map((article) => article.coverMediaId));

  return (
    <StaticPageScreen
      pageKey={KEY}
      locale={locale}
      title={title}
      subtitle={subtitle}
      heroImage={heroImage}
      // Chapter 14 §4 forbids structured data describing content the page does
      // not show, so the `ItemList` is built from the headlines actually
      // rendered below — never from what the newsroom might publish next.
      itemNames={articles.map((article) => article.title[locale])}
    >
      <Section className="pt-12 md:pt-16">
        <NewsTimeFilter range={range} tag={tag} />
      </Section>

      {tag ? (
        <Section className="pt-8">
          <TagFilterNotice tag={tag} empty={articles.length === 0} />
        </Section>
      ) : null}

      {articles.length > 0 ? (
        <Section labelledBy="news-latest" className="py-12 md:py-16">
          <NewsList articles={articles} covers={covers} locale={locale} />
        </Section>
      ) : null}
    </StaticPageScreen>
  );
}
