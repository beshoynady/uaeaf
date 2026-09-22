import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CARD_INTERACTIVE } from "@/components/ui/surface";
import { CARD_LINK } from "@/components/ui/interactive";
import { ArticleCover } from "./cover";
import { PublishDate } from "./publish-date";
import { TopicBadge } from "./topic-badge";
import type { ArticlePublic, MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * One story in the news grid (Figma `2775:125`, and the related-articles row
 * `1739:2509`).
 *
 * ── One link, named by the headline ────────────────────────────────────────
 *
 * The design draws a picture, a headline and a "المزيد ←" affordance, all
 * pointing at the same article. Rendered as three links that would be three
 * stops on one destination, and the third would announce as "more" six times
 * down a grid — which tells a screen-reader user which of six identical links
 * they are on: none of them. So the headline is the link, the picture and the
 * arrow sit inside it, and the arrow is hidden from assistive technology
 * because it repeats what the link already says (WCAG 2.4.4).
 *
 * ── The badge, and the picture that is always there ────────────────────────
 *
 * The design puts a category badge above the headline. That was recorded here
 * as a scope conflict while `articles` had no category to draw it from; the
 * field shipped on 2026-09-20 and the badge is now real data.
 *
 * The cover is drawn through `ArticleCover`, which never renders nothing: a
 * card with no uploaded picture used to collapse to text beside cards that had
 * one, which is the hole this batch was told to close.
 *
 * Tags are deliberately NOT here. The design carries them on the article page
 * and one category badge on the card, and four chips under a headline in a
 * grid of twelve would bury the headline they are meant to label.
 */
export const NewsCard = ({
  article,
  locale,
  cover,
  /** The related row draws the same card at a smaller measure; the grid's own
   *  sizing comes from its parent. */
  className = "",
}: {
  article: ArticlePublic;
  locale: AppLocale;
  cover?: MediaAssetPublic;
  className?: string;
}) => {
  const t = useTranslations("News");

  return (
    <article className={`${CARD_INTERACTIVE} flex flex-col overflow-hidden p-0 ${className}`}>
      {/* A fixed ratio rather than a fixed height: the card is fluid below
          the grid's breakpoints, and a fixed height would letterbox it there. */}
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <ArticleCover
          article={article}
          cover={cover}
          locale={locale}
          sizes="(min-width: 1024px) 282px, (min-width: 640px) 45vw, 100vw"
        />
      </div>

      <div className="flex flex-1 flex-col items-start gap-3 p-5">
        <TopicBadge topic={article.topic} />

        <h3 className="text-body font-bold text-balance text-[color:var(--color-text-primary)]">
          <Link
            href={`/news/${article.slug}`}
            className={CARD_LINK}
          >
            {article.title[locale]}
          </Link>
        </h3>

        {/* Pushed to the card's foot so a two-line headline and a three-line
            one still align their dates across a row. */}
        <div className="mt-auto flex items-center justify-between gap-3">
          <span aria-hidden className="text-label font-medium text-[color:var(--color-text-link)]">
            {t("more")}
          </span>
          <PublishDate
            date={article.publishDate}
            className="text-caption text-[color:var(--color-text-secondary)]"
          />
        </div>
      </div>
    </article>
  );
};
