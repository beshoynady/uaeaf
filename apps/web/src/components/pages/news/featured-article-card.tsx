import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CARD_INTERACTIVE } from "@/components/ui/surface";
import { FOCUS } from "@/components/ui/interactive";
import { ArticleCover } from "./cover";
import { CategoryBadge } from "./category-badge";
import type { ArticlePublic, MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * The lead story (Figma `2775:103`): a picture beside its text at the grid's
 * full measure, above the six-card grid.
 *
 * Two columns from `md` and stacked below it. The picture leads in the stacked
 * order because it is what the card is composed around — Chapter 5 §5.10's
 * "most important first" is satisfied either way, since the heading is a
 * heading and a reader jumping by headings reaches it without passing the
 * image at all.
 *
 * ── One deviation, recorded ────────────────────────────────────────────────
 *
 * The design sets this headline at 22px. The typography scale has no 22px
 * step — 20px (`text-h4`) and 24px (`text-h3`) are its neighbours — and this is
 * the same missing step already recorded as an open design-system gap for the
 * athlete personal-best values. `text-h3` is used here, being the nearest
 * documented heading role, and the 2px difference is reported rather than
 * resolved by inventing a token.
 */
export const FeaturedArticleCard = ({
  article,
  locale,
  cover,
}: {
  article: ArticlePublic;
  locale: AppLocale;
  cover?: MediaAssetPublic;
}) => {
  const format = useFormatter();
  const t = useTranslations("News");

  return (
    <article className={`${CARD_INTERACTIVE} grid gap-0 overflow-hidden p-0 md:grid-cols-[minmax(0,484fr)_minmax(0,396fr)]`}>
      <div className="relative aspect-[16/10] w-full md:aspect-auto md:min-h-[320px]">
        <ArticleCover
          article={article}
          cover={cover}
          locale={locale}
          sizes="(min-width: 768px) 484px, 100vw"
          // The lead story is the first picture on the page and the likely
          // Largest Contentful Paint (Chapter 14 §7).
          priority
        />
      </div>

      <div className="flex flex-col items-start gap-3.5 p-6 md:p-8">
        <CategoryBadge category={article.category} tone="solid" />

        {article.publishDate ? (
          <time
            dateTime={article.publishDate}
            className="text-caption text-[color:var(--color-text-secondary)]"
          >
            {format.dateTime(new Date(article.publishDate), { dateStyle: "long" })}
          </time>
        ) : null}

        <h2 className="text-h3 text-balance text-[color:var(--color-text-primary)]">
          <Link
            href={`/news/${article.slug}`}
            className={`rounded-xs after:absolute after:inset-0 after:content-[''] ${FOCUS}`}
          >
            {article.title[locale]}
          </Link>
        </h2>

        <p className="text-body-sm text-pretty text-[color:var(--color-text-secondary)]">
          {article.excerpt[locale]}
        </p>

        {/* Repeats the link the headline already is, so it is hidden from
            assistive technology rather than announced a second time. */}
        <span
          aria-hidden
          className="mt-auto text-body-sm font-bold text-[color:var(--color-text-link)]"
        >
          {t("readMore")}
        </span>
      </div>
    </article>
  );
};
