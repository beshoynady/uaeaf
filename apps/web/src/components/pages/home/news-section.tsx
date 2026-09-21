import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/pages/home/sponsors/section-heading";
import { NewsCard } from "@/components/pages/news/news-card";
import { BADGE } from "@/components/ui/surface";
import { FOCUS } from "@/components/ui/interactive";
import type { ArticlePublic, MediaAssetPublic, PageSectionPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * A shelf of stories on the homepage (`02-Homepage-Specification.md` §32 #7).
 *
 * ── Why one component draws both shelves ───────────────────────────────────
 *
 * "Latest news" and "UAEAF in the media" are the same shelf over the same
 * entity, narrowed differently. Two components would be two places for the
 * card count, the empty rule and the heading pattern to drift apart, and a
 * reader would see the second shelf as a different kind of thing.
 *
 * ── Why the composition is composed, not listed here ───────────────────────
 *
 * Which shelves the homepage carries, in what order, with what heading and how
 * many cards, is the CMS's answer — the same arrangement the sponsors sections
 * use. A shelf nobody composed onto the page costs no request and draws
 * nothing; a third shelf needs a CMS row, not a release.
 *
 * ── Why it is absent rather than empty ─────────────────────────────────────
 *
 * `02-Homepage-Specification.md` §11a states it for the video section and the
 * built sections all follow it: a heading over nothing is worse than no
 * heading. A newsroom that has published nothing in a category should not
 * advertise the gap on the front page.
 *
 * ── Why the CTA is at the foot and reads "all news" ────────────────────────
 *
 * §181-191 of the homepage specification gives News a "View all news" CTA, and
 * §179 allows exactly one primary call per section. The sponsors section
 * already places its single CTA at the section's foot, so this follows it
 * rather than inventing a second position for the same affordance.
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
  if (articles.length === 0) {
    return null;
  }

  const t = await getTranslations({ locale, namespace: "News" });
  const id = `home-news-${section.id}`;

  return (
    <Section labelledBy={id} className="py-16 md:py-20">
      <div className="flex flex-col gap-8">
        <SectionHeading
          id={id}
          // The CMS field first, the catalogue as the fallback: an editor who
          // has not named the shelf still gets a heading rather than a blank.
          title={section.sectionTitle?.[locale] ?? t("homeLatestHeading")}
          subtitle={section.sectionSubtitle?.[locale] ?? null}
        />

        <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <li key={article.id} className="relative flex">
              <NewsCard
                article={article}
                locale={locale}
                cover={article.coverMediaId ? covers.get(article.coverMediaId) : undefined}
                className="w-full"
              />
            </li>
          ))}
        </ul>

        <p className="flex justify-center">
          <Link
            href="/news"
            className={`${BADGE} min-h-11 border-[color:var(--color-border-strong)] px-6 text-[color:var(--color-text-primary)] transition-colors duration-[var(--motion-duration-instant)] hover:border-[color:var(--color-action-default)] active:border-[color:var(--color-action-default)] ${FOCUS}`}
          >
            {t("viewAll")}
          </Link>
        </p>
      </div>
    </Section>
  );
};
