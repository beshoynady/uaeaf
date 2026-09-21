import { useTranslations } from "next-intl";
import { FeaturedArticleCard } from "./featured-article-card";
import { NewsCard } from "./news-card";
import type { ArticlePublic, MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * The newsroom's front page (Figma `2775:102`): a lead story across the
 * measure, then a grid of six.
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
 * The lead is an `h2` and the grid's cards are `h3`s, under the page's single
 * `h1` in the hero. A reader moving by headings hears one section with six
 * stories in it rather than seven peers, which is what the composition
 * actually is.
 *
 * ── What the design draws that there is no data for ────────────────────────
 *
 * The approved frame puts category tabs above this block and a category badge
 * on every card, and a sidebar carrying "الاتحاد في الإعلام" beside it.
 * Categories and tags are out of scope for this batch by the owner's own
 * instruction, and `externalMediaCoverage` has no module and no public read —
 * so none of the three has a field to draw from. They are reported as scope
 * conflicts rather than filled with placeholder content.
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

  // The lead is the newest item on either shelf, not the newest General one: a
  // reader opening the page wants what just happened, not what just happened
  // in one category.
  const general = rest.filter((article) => article.category === "General");
  const inMedia = rest.filter((article) => article.category === "FederationInMedia");

  const shelf = (id: string, heading: string, items: readonly ArticlePublic[]) =>
    // No empty shelf: a heading over nothing is worse than no heading.
    items.length === 0 ? null : (
      <section aria-labelledby={id} className="flex flex-col gap-5">
        <h2 id={id} className="text-h4 text-[color:var(--color-text-primary)]">
          {heading}
        </h2>
        {/* A list, so a screen reader announces how many stories there are
            before the reader starts through them. */}
        <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((article) => (
            <li key={article.id} className="relative flex">
              <NewsCard article={article} locale={locale} cover={coverOf(article)} className="w-full" />
            </li>
          ))}
        </ul>
      </section>
    );

  return (
    <div className="flex flex-col gap-10 md:gap-14">
      <FeaturedArticleCard article={lead} locale={locale} cover={coverOf(lead)} />
      {shelf("news-latest", t("generalHeading"), general)}
      {shelf("news-in-media", t("inMediaHeading"), inMedia)}
    </div>
  );
};
