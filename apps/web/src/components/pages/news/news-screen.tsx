import { Section } from "@/components/ui/section";
import type { FeedQuery } from "@/lib/news/feed-query";
import type { ArticlePublic, MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";
import { NewsCategoryTabs } from "./category-tabs";
import { EditorialHero } from "./editorial-hero";
import { NewsList } from "./news-list";
import { NewsPagination } from "./news-pagination";
import { NewsSidebar } from "./news-sidebar";
import { TagFilterNotice } from "./tag-filter-notice";
import { NewsTimeFilter } from "./time-filter";
import { NewsTopicFilter } from "./topic-filter";

/**
 * The news listing's composition, below its route (which parses the query and
 * fetches).
 *
 * ── The hero ───────────────────────────────────────────────────────────────
 *
 * The kit's `PageHero` (ADR-0098), through `EditorialHero`: the record's
 * photograph where it has one, the ink ground where it has none. It also
 * emits the `CollectionPage` structured data from the headlines actually
 * rendered below (Chapter 14 §4) — never from what the newsroom might publish
 * next.
 *
 * ── The filters stay links ─────────────────────────────────────────────────
 *
 * Every narrowing is an address (`?category=`, `?topic=`, `?from=`, `?to=`),
 * built by `feedHref` so each control carries the others. The kit's
 * `FilterChip` is a toggle button with a click handler; drawn here it would
 * turn every filter into client-side state with no address, which is the
 * design the three filter components record rejecting. They stay as they are
 * until the kit offers a link-shaped chip.
 *
 * ── Two columns (approved canvas `NewsListing.dc.html`, 2026-09-22) ────────
 *
 * The listing and a sidebar at the canvas's 840 / 48 / 424, which sums to the
 * container's 1312px at 1440 — an 8/4 division of the twelve columns, written
 * as `fr` ratios so the split holds at every width above it. Stacked below
 * `lg` (IA §12), the sidebar after the listing: it is a set of ways into the
 * listing, and a reader who came for the news should not scroll past it first.
 */
export const NewsScreen = ({
  locale,
  title,
  subtitle,
  heroImage,
  articles,
  covers,
  query,
  pages,
}: {
  locale: AppLocale;
  title: string;
  subtitle: string | null;
  heroImage: MediaAssetPublic | undefined;
  articles: readonly ArticlePublic[];
  covers: ReadonlyMap<string, MediaAssetPublic>;
  query: FeedQuery;
  pages: number;
}) => (
  <>
    <EditorialHero
      pageKey="news"
      locale={locale}
      title={title}
      subtitle={subtitle}
      heroImage={heroImage}
      itemNames={articles.map((article) => article.title[locale])}
    />

    <Section className="pt-12 md:pt-16">
      <div className="flex flex-col gap-5 border-b border-[color:var(--color-border-default)] pb-6">
        {/* The shelf first, then the subject within it, then the window on it:
            three questions in the order a reader narrows by them. */}
        <NewsCategoryTabs query={query} />
        <NewsTopicFilter query={query} />
        <NewsTimeFilter query={query} />
      </div>
    </Section>

    {query.tag ? (
      <Section className="pt-8">
        <TagFilterNotice tag={query.tag} empty={articles.length === 0} />
      </Section>
    ) : null}

    {/* `enter={false}`: the band's entrance animates a transform on the
        container, and a transformed ancestor becomes the containing block of a
        `sticky` descendant — the sidebar scrolled away with the page. The
        entrance moves onto the listing column, which has no sticky child. */}
    <Section enter={false} className="py-12 md:py-16">
      {/* Every track is `minmax(0, …)`, the stacked one included: a track's
          default minimum is its content's, so one long unbreakable headline
          widened the column past a 390px screen by 82px (IA §12, zero
          horizontal scroll). `min-w-0` is the same rule one level down. */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-10 lg:grid-cols-[minmax(0,840fr)_minmax(0,424fr)] lg:gap-12">
        <div data-reveal="" data-reveal-reduced="fade" className="flex min-w-0 flex-col gap-10">
          <NewsList articles={articles} covers={covers} locale={locale} />
          <NewsPagination query={query} pages={pages} />
        </div>

        <NewsSidebar query={query} locale={locale} />
      </div>
    </Section>
  </>
);
