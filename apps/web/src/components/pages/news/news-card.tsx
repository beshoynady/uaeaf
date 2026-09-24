import { useTranslations } from "next-intl";
import { BRAND_DRAW_LINE, BrandBorder } from "@uaeaf/brand-ui";
import { Link } from "@/i18n/navigation";
import { CARD_INTERACTIVE } from "@/components/ui/surface";
import { CARD_LINK } from "@/components/ui/interactive";
import { ArticleCover } from "./cover";
import { PublishDate } from "./publish-date";
import { SourceAttribution } from "./source-attribution";
import { TopicBadge } from "./topic-badge";
import { topicTone } from "./topic-tone";
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
 * ── The attribution, on the round-ups only ─────────────────────────────────
 *
 * A `FederationInMedia` card says which outlet published the story first. It
 * is one muted line rather than a second badge, so the grid stays one grid:
 * the round-ups now sit among the federation's own stories (owner decision
 * 2026-09-22) and a card that announced itself with a second chip would read
 * as a different kind of card rather than as the same card with a source.
 *
 * ── The identity edge ──────────────────────────────────────────────────────
 *
 * The card sits inside the kit's `BrandBorder` (ADR-0098 D5), `static`, in the
 * tone its topic maps to (`topic-tone.ts`), with the kit's draw line along the
 * foot as the hover rule. `static` rather than `hover`: the draw line is
 * already the card's hover response, and two motions on one pointer is noise.
 * The border wraps the `<article>` rather than replacing it, so the element
 * and its semantics are unchanged.
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
  /** What the picture is asked to be, at each width. The listing's grid and
   *  the article page's related row are different measures, and a card that
   *  guesses one of them downloads the wrong file on the other. */
  sizes = "(min-width: 1280px) 266px, (min-width: 640px) 45vw, 100vw",
}: {
  article: ArticlePublic;
  locale: AppLocale;
  cover?: MediaAssetPublic;
  className?: string;
  sizes?: string;
}) => {
  const t = useTranslations("News");

  return (
    // `*:flex *:flex-1` stretches the ring's clipping wrapper, so cards in one
    // grid row keep one height and their dates keep one baseline.
    <BrandBorder
      variant="static"
      tone={topicTone(article.topic)}
      className={`${BRAND_DRAW_LINE} flex *:flex *:flex-1 ${className}`}
    >
    <article className={`${CARD_INTERACTIVE} flex flex-1 flex-col overflow-hidden p-0`}>
      {/* A fixed ratio rather than a fixed height: the card is fluid below
          the grid's breakpoints, and a fixed height would letterbox it there. */}
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <ArticleCover article={article} cover={cover} locale={locale} sizes={sizes} />
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

        <SourceAttribution article={article} />

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
    </BrandBorder>
  );
};
