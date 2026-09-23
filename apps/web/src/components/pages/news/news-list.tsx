import { useTranslations } from "next-intl";
import { FeaturedArticleCard } from "./featured-article-card";
import { NewsCard } from "./news-card";
import type { ArticlePublic, MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * The newsroom's front page (approved canvas `NewsListing.dc.html`,
 * 2026-09-22): a cover story across the column, then one grid of three.
 *
 * ── One grid, not two shelves ──────────────────────────────────────────────
 *
 * This drew two shelves until 2026-09-22 — the federation's own stories, then
 * a separate "الاتحاد في الإعلام" row of its `FederationInMedia` articles.
 * They are one grid now (owner decision), with each card carrying its topic
 * chip and, on a round-up, the outlet that published it first.
 *
 * The homepage's own decision is unaffected and still holds: its shelf is
 * narrowed to six of one category, and `homepage-news.ts` records that the
 * federation's own round-ups "stay on /news". This page is where they stay —
 * which is why they are in the grid rather than excluded from it, and why the
 * `news-in-media` anchor the homepage links to still resolves here.
 *
 * ── No empty shelf ─────────────────────────────────────────────────────────
 *
 * Nothing live means nothing drawn — not a heading over a blank strip. The
 * page above decides what to put in the space instead; this component's job is
 * to be honest about having nothing, which is also what keeps the listing out
 * of the sitemap and the index until it has something (Chapter 14 §11 and §13,
 * decided once in `lib/pages/indexability.ts`).
 *
 * ── The heading outline ────────────────────────────────────────────────────
 *
 * The cover story is an `h2` and the grid's cards are `h3`s, under the page's
 * single `h1` in the hero. A reader moving by headings hears one section with
 * its stories in it rather than a flat run of peers, which is what the
 * composition actually is.
 *
 * ── Why three columns only from `xl` ───────────────────────────────────────
 *
 * The grid lives in the 840px column beside the sidebar, not across the page.
 * At `lg` that column is about 594px and three cards in it measure 185px —
 * narrower than a two-line headline wants. Chapter 5 §5.4 puts the public
 * experience at "2–3 content columns"; this takes two until `xl`, where the
 * column reaches the canvas's own measure, and three from there.
 */
export const NewsList = ({
  articles,
  covers,
  locale,
}: {
  articles: readonly ArticlePublic[];
  covers: ReadonlyMap<string, MediaAssetPublic>;
  locale: AppLocale;
}) => {
  const t = useTranslations("News");

  if (articles.length === 0) {
    return null;
  }

  const [lead, ...rest] = articles;
  const coverOf = (article: ArticlePublic) =>
    article.coverMediaId ? covers.get(article.coverMediaId) : undefined;

  return (
    <div className="flex flex-col gap-10">
      <FeaturedArticleCard article={lead} locale={locale} cover={coverOf(lead)} />

      {rest.length > 0 ? (
        <section aria-labelledby="news-latest" className="flex flex-col gap-5">
          <h2 id="news-latest" className="text-h4 text-[color:var(--color-text-primary)]">
            {t("generalHeading")}
          </h2>
          {/* A list, so a screen reader announces how many stories there are
              before the reader starts through them. */}
          <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 xl:grid-cols-3">
            {rest.map((article) => (
              <li key={article.id} className="relative flex">
                <NewsCard article={article} locale={locale} cover={coverOf(article)} className="w-full" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
};
