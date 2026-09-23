import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { StaticPageScreen, buildStaticPageMetadata, loadStaticPage } from "@/components/pages/static-page-screen";
import { NewsList } from "@/components/pages/news/news-list";
import { NewsPagination } from "@/components/pages/news/news-pagination";
import { NewsSidebar } from "@/components/pages/news/news-sidebar";
import { TagFilterNotice } from "@/components/pages/news/tag-filter-notice";
import { NewsTimeFilter } from "@/components/pages/news/time-filter";
import { NewsTopicFilter } from "@/components/pages/news/topic-filter";
import { rangeIsPossible } from "@uaeaf/content/time-range";
import { Section } from "@/components/ui/section";
import { NEWS_PAGE_SIZE, fetchArticles } from "@/lib/api/articles";
import { fetchPublicMedia } from "@/lib/api/media";
import { clampPage, feedHref, pageCount } from "@/lib/news/feed-query";
import { findPublicPage } from "@/lib/pages/public-pages";
import { isIndexable } from "@/lib/pages/indexability";
import { ARTICLE_TOPICS } from "@/lib/api/types";
import type { ArticleTopic } from "@/lib/api/types";
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
 * ── Two columns (approved canvas `NewsListing.dc.html`, 2026-09-22) ────────
 *
 * The listing and a sidebar, at the canvas's own 840 / 48 / 424 — which sums
 * to 1312px, exactly the container's width at a 1440px viewport, so the canvas
 * is drawn on the approved grid (Chapter 5 §5.3) and this is an 8/4 division
 * of its twelve columns. Written as `fr` ratios rather than fixed widths so
 * the split holds at every width above it instead of overflowing at 1280,
 * following `featured-article-card`'s own precedent.
 *
 * Stacked below `lg`, where IA §12 records the public layer's third
 * breakpoint and "side-by-side news" begins. The sidebar follows the listing
 * in the stacked order: it is a set of ways INTO the listing, and a reader who
 * came for the news should not have to scroll past the topics to reach it.
 *
 * ── The query ──────────────────────────────────────────────────────────────
 *
 * `?tag=`, `?topic=`, `?from=`, `?to=` and `?page=` are all views of this one
 * listing, so all five are parameters rather than paths: the page keeps its
 * address, its hero and its metadata, and a reader clearing a filter is back
 * where they started. `lib/news/feed-query.ts` builds every link that writes
 * them, so each control carries the others untouched.
 *
 * A tag nobody uses, and a topic nothing is filed under, answer an empty
 * listing rather than a 404 — which is the truth about a label nothing
 * carries.
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
  const search = await searchParams;
  const one = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value)?.trim() || undefined;

  const tag = one(search.tag);
  // Checked against the closed list rather than forwarded: an invented topic
  // is a 400 upstream, and the page would render an error where a reader
  // expects a list.
  const asked = one(search.topic);
  const topic = ARTICLE_TOPICS.includes(asked as ArticleTopic) ? (asked as ArticleTopic) : undefined;

  const askedRange = { from: one(search.from), to: one(search.to) };
  // A window that closes before it opens is refused upstream with a 400. Sent
  // anyway, the page would render an error where a reader expects a list.
  const range = rangeIsPossible(askedRange.from, askedRange.to) ? askedRange : {};
  const page = clampPage(one(search.page));

  const [{ title, subtitle, heroImage }, feed] = await Promise.all([
    loadStaticPage(KEY, locale),
    fetchArticles(page, undefined, tag, undefined, range, topic),
  ]);

  const articles = feed?.items ?? [];
  const pages = pageCount(feed?.total ?? 0, feed?.limit ?? NEWS_PAGE_SIZE);
  const query = { tag, topic, range, page };

  // A page past the end is a stale link into a feed that has since shrunk, or
  // a hand-edited number. Corrected in the address rather than answered with
  // an empty column under a pager that disagrees with it.
  if (page > pages) {
    // The locale-aware redirect, so the corrected address is `/ar/news…` in
    // one hop rather than `/news…` and a second redirect from the middleware.
    redirect({ href: feedHref(query, { page: pages }), locale });
  }

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
        <div className="flex flex-col gap-5 border-b border-[color:var(--color-border-default)] pb-6">
          <NewsTopicFilter query={query} />
          <NewsTimeFilter query={query} />
        </div>
      </Section>

      {tag ? (
        <Section className="pt-8">
          <TagFilterNotice tag={tag} empty={articles.length === 0} />
        </Section>
      ) : null}

      {/* `enter={false}`: the band's own entrance animates a transform on the
          container, and a transformed ancestor becomes the containing block of
          a `sticky` descendant — the sidebar simply scrolled away with the
          page. `Section`'s own documentation names this and offers the escape
          hatch; `media-coverage-section` takes the same one. The entrance
          moves onto the listing column, which has no sticky child. */}
      <Section enter={false} className="py-12 md:py-16">
        {/* 840 / 48 / 424 as ratios — the canvas's own numbers, which sum to
            the container's 1312px. `items-start` so the sidebar can stick
            rather than stretch to the listing's height.

            Every track is `minmax(0, …)`, including the single stacked one. A
            grid track defaults to a minimum of its content's own minimum
            width, so one long unbreakable headline makes the column wider
            than the viewport and the whole page scrolls sideways — measured
            at 82px on a 390px screen, against IA §12's "zero horizontal
            scroll". `min-w-0` on each child is the same rule one level down,
            for the flex column inside. */}
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-10 lg:grid-cols-[minmax(0,840fr)_minmax(0,424fr)] lg:gap-12">
          <div data-reveal="" data-reveal-reduced="fade" className="flex min-w-0 flex-col gap-10">
            <NewsList articles={articles} covers={covers} locale={locale} />
            <NewsPagination query={query} pages={pages} />
          </div>

          <NewsSidebar query={query} locale={locale} />
        </div>
      </Section>
    </StaticPageScreen>
  );
}
