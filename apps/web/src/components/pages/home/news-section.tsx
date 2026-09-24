import { getTranslations } from "next-intl/server";
import { BRAND_DRAW_LINE, BrandBorder, Surface } from "@uaeaf/brand-ui";
import { Section } from "@/components/ui/section";
import { LeadArticleCard } from "@/components/pages/news/lead-article-card";
import { ArticleListItem } from "@/components/pages/news/article-list-item";
import { revealStep } from "@/lib/motion/reveal";
import { HomeSectionHeader } from "./home-section-header";
import type { ArticlePublic, MediaAssetPublic, PageSectionPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/** The stories beside the lead, as the canvas draws them. */
const LIST_LENGTH = 5;

/**
 * "Latest news" on the homepage (`02-Homepage-Specification.md` §32 #7), as
 * the approved canvas draws it (2026-09-22): the newest story as the lead,
 * the five after it in a list beside it from `lg`, one above the other below.
 *
 * Two equal columns, as drawn. The specification records a 1.35fr/1fr split
 * as built; the canvas is the reference for this section and replaces it.
 *
 * How many stories, and the heading, are the CMS row's: the catalogue speaks
 * only when the row is silent. A newsroom that has published nothing draws no
 * section, since a heading over nothing is worse than no heading (§11a).
 *
 * It enters once (`reveal-once.tsx`): the heading, then the lead story, then
 * the list one story at a time, in reading order. Under reduced motion it
 * fades in instead, with nothing moving.
 */
export const HomeNewsSection = async ({
  section,
  articles,
  covers,
  locale,
}: {
  section: PageSectionPublic;
  articles: readonly ArticlePublic[];
  covers: ReadonlyMap<string, MediaAssetPublic>;
  locale: AppLocale;
}) => {
  const [lead, ...rest] = articles;
  if (!lead) {
    return null;
  }

  const t = await getTranslations({ locale, namespace: "News" });
  const id = `home-news-${section.id}`;
  const coverOf = (article: ArticlePublic) =>
    article.coverMediaId ? covers.get(article.coverMediaId) : undefined;

  return (
    <Section labelledBy={id} enter={false} className="py-16">
      {/*
        The neutral ground with the mesh tint over it (ADR-0098 §5-D). Nested
        inside `Section` rather than replacing it: `Section` still owns the
        register, the landmark and the entrance, and this adds the tint and the
        on-surface variables the kit's components read. Same ground, one extra
        layer.
      */}
      <Surface kind="canvas" mesh as="div" className="flex flex-col gap-10">
        <div data-reveal="" data-reveal-reduced="fade" className="contents">
        <HomeSectionHeader
          id={id}
          title={section.sectionTitle?.[locale] ?? t("homeLatestHeading")}
          subtitle={section.sectionSubtitle?.[locale] ?? t("homeLatestSubtitle")}
          link={{ href: "/news", label: t("homeViewAll") }}
        />

        <div className="grid items-start gap-12 lg:grid-cols-2">
          {/* The lead article carries a static tricolour edge instead of an
              accent bar — one mark, not two stacked (ADR-0098 §5-D). */}
          <div data-reveal-part="rise" style={revealStep(2)}>
            <BrandBorder variant="static">
              <LeadArticleCard article={lead} cover={coverOf(lead)} locale={locale} />
            </BrandBorder>
          </div>
          {rest.length > 0 ? (
            <ul className="flex list-none flex-col divide-y divide-[color:var(--color-border-default)] p-0">
              {rest.slice(0, LIST_LENGTH).map((article, index) => (
                /* The draw line is applied here rather than inside
                   `ArticleListItem`, which `/news` also renders: this section's
                   treatment is not that page's, and `/news` is a separate task. */
                <li
                  key={article.id}
                  className={BRAND_DRAW_LINE}
                  data-reveal-part="rise"
                  style={revealStep(3 + index)}
                >
                  <ArticleListItem article={article} cover={coverOf(article)} locale={locale} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        </div>
      </Surface>
    </Section>
  );
};
