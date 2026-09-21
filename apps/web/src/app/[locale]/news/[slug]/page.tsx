import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArticleScreen } from "@/components/pages/news/article-screen";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Section } from "@/components/ui/section";
import { BreadcrumbJsonLd, NewsArticleJsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { fetchArticle, fetchArticles } from "@/lib/api/articles";
import { fetchPublicMedia } from "@/lib/api/media";
import type { ArticlePublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * One story, at `/news/<slug>`.
 *
 * ── Why the record is fetched twice, and why that costs nothing ────────────
 *
 * `generateMetadata` and the page body both need the article. Next dedupes
 * identical requests within one render, so asking twice is one request — the
 * same arrangement every other page here uses, and the reason neither has to
 * thread the record through a shared cache.
 *
 * ── Related stories ────────────────────────────────────────────────────────
 *
 * The four most recent live articles other than this one. Recency, not
 * relevance: relevance would need categories or tags, which are out of scope
 * for this batch, and a "related" row assembled from nothing in common would
 * be a claim the page cannot support.
 */

const RELATED_COUNT = 4;

/** Enough to drop this article and still fill the related row. */
const RELATED_POOL = RELATED_COUNT + 1;

const relatedTo = (article: ArticlePublic, pool: readonly ArticlePublic[]): ArticlePublic[] =>
  pool.filter((candidate) => candidate.id !== article.id).slice(0, RELATED_COUNT);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await fetchArticle(slug);

  if (!article) {
    // Nothing to describe, and nothing that should be indexed: the body will
    // answer 404 for the same reason.
    return { robots: { index: false, follow: true } };
  }

  return buildMetadata({
    locale,
    route: `/news/${slug}`,
    // The editor's override wins. The headline is the honest fallback — better
    // than a truncation of the body, which is what a generic description would
    // amount to here.
    title: article.seo?.metaTitle?.[locale] ?? article.title[locale],
    description: article.seo?.metaDescription?.[locale] ?? article.excerpt[locale],
    indexable: true,
    ogType: "article",
  });
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: AppLocale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const article = await fetchArticle(slug);
  if (!article) {
    // A draft, a retired address, or a slug nobody has used. All three are
    // "there is nothing here" to a reader, and none of them should differ in
    // what they disclose.
    notFound();
  }

  const [pool, pages, nav] = await Promise.all([
    fetchArticles(1, RELATED_POOL),
    getTranslations({ locale, namespace: "Pages" }),
    getTranslations({ locale, namespace: "Nav" }),
  ]);

  const related = relatedTo(article, pool?.items ?? []);
  const covers = await fetchPublicMedia([
    article.coverMediaId,
    ...related.map((item) => item.coverMediaId),
  ]);

  // IA §8.5 — a trail is mandatory from depth two, and this page is depth two.
  const trail = [
    { name: nav("home"), route: "/" },
    { name: pages("news"), route: "/news" },
    { name: article.title[locale], route: null },
  ];

  const cover = article.coverMediaId ? covers.get(article.coverMediaId) : undefined;

  return (
    <>
      <NewsArticleJsonLd locale={locale} article={article} coverUrl={cover?.file.url} />
      <BreadcrumbJsonLd
        locale={locale}
        trail={trail.filter((crumb): crumb is { name: string; route: string } => crumb.route !== null)}
      />

      <Section className="py-8 md:py-12">
        <Breadcrumb trail={trail} label={pages("breadcrumbLabel")} register="neutral" />
      </Section>

      <Section className="pb-16 md:pb-20">
        <ArticleScreen article={article} locale={locale} related={related} covers={covers} />
      </Section>
    </>
  );
}
