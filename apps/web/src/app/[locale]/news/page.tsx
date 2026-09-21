import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { StaticPageScreen, buildStaticPageMetadata, loadStaticPage } from "@/components/pages/static-page-screen";
import { NewsList } from "@/components/pages/news/news-list";
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
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildStaticPageMetadata(KEY, locale, await isIndexable(findPublicPage(KEY)!));
}

export default async function NewsPage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [{ title, subtitle, heroImage }, page] = await Promise.all([
    loadStaticPage(KEY, locale),
    fetchArticles(),
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
      {articles.length > 0 ? (
        <Section labelledBy="news-latest" className="py-12 md:py-16">
          <NewsList articles={articles} covers={covers} locale={locale} />
        </Section>
      ) : null}
    </StaticPageScreen>
  );
}
