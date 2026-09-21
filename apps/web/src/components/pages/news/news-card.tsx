import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CARD_INTERACTIVE } from "@/components/ui/surface";
import { FOCUS } from "@/components/ui/interactive";
import { altOf, isExternalMedia } from "@/lib/api/media";
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
 * ── What is drawn and what is not ──────────────────────────────────────────
 *
 * The design puts a category badge above the headline. `articles` has no
 * category — categories and tags are out of scope for this batch by the
 * owner's own instruction — so there is no field to draw it from and no badge
 * is invented. Recorded as a scope conflict rather than filled with a
 * placeholder.
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
  const format = useFormatter();
  const t = useTranslations("News");

  return (
    <article className={`${CARD_INTERACTIVE} flex flex-col overflow-hidden p-0 ${className}`}>
      {cover ? (
        // A fixed ratio rather than a fixed height: the card is fluid below
        // the grid's breakpoints, and a fixed height would letterbox it there.
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <Image
            src={cover.file.url}
            alt={altOf(cover, locale)}
            fill
            sizes="(min-width: 1024px) 282px, (min-width: 640px) 45vw, 100vw"
            className="object-cover"
            unoptimized={isExternalMedia(cover.file.url)}
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-body font-bold text-balance text-[color:var(--color-text-primary)]">
          <Link
            href={`/news/${article.slug}`}
            className={`rounded-xs after:absolute after:inset-0 after:content-[''] ${FOCUS}`}
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
          {article.publishDate ? (
            <time
              dateTime={article.publishDate}
              className="text-caption text-[color:var(--color-text-secondary)]"
            >
              {format.dateTime(new Date(article.publishDate), { dateStyle: "long" })}
            </time>
          ) : null}
        </div>
      </div>
    </article>
  );
};
