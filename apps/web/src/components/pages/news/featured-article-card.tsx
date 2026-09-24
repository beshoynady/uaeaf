import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CARD_INTERACTIVE_LG } from "@/components/ui/surface";
import { CARD_LINK } from "@/components/ui/interactive";
import { coverScrim, coverScrimFade } from "@uaeaf/content/hero";
import { readingMinutes } from "@/lib/news/reading-time";
import { ArticleCover } from "./cover";
import { PublishDate } from "./publish-date";
import { TopicBadge } from "./topic-badge";
import type { ArticlePublic, MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * The cover story, in the magazine treatment (approved canvas
 * `NewsListing.dc.html`, 2026-09-22): the words stand on the picture rather
 * than beside it.
 *
 * This replaced the picture-beside-text composition in place rather than
 * gaining a `variant` for it. There is exactly one call site — the newsroom's
 * own listing — so a second branch would be a layout nothing renders, kept
 * alive by a prop nobody passes (owner decision 2026-09-22).
 *
 * ── The wash, and why it is on the text ────────────────────────────────────
 *
 * `coverScrim` hugs the text block, so every glyph stands on at least 64% of
 * the overlay token however the headline wraps — 6.70:1 white-on-white,
 * measured against the lightest image that can exist by `cover-scrim.spec.ts`.
 * The canvas's own gradient covers the whole frame instead and measures
 * 1.43:1 at the top of the text over a light photograph; that is the defect
 * this composition exists to avoid, not a detail of it.
 *
 * ── Geometry: a ratio that is a floor, not a ceiling ───────────────────────
 *
 * One grid cell holds three layers — the picture, an empty spacer carrying the
 * ratio, and the text. The row is as tall as the tallest of them, so the card
 * is the canvas's frame when the words fit inside it and grows when they do
 * not. Measured: at 390px the panel needs 276px where a 4:3 box is 257px, and
 * an absolutely positioned panel simply ran 19px off the top of the card.
 *
 * `7/4` is the canvas's own 840×480 frame, so from `md` the card IS that frame
 * at the approved width. Below `md` it is `4/3`, because the canvas has no
 * narrow frame and a 7:4 box at that width is mostly text; reported as
 * PENDING FIGMA BACK-SYNC, and nothing depends on the number now that it is a
 * minimum rather than the height.
 *
 * The line clamps stay, for a different reason: they bound how far the panel
 * can climb over the picture it is standing on.
 *
 * ── Recorded deviations from the canvas ────────────────────────────────────
 *
 * The canvas sets this headline at 36px and pads the text block at 36px.
 * Neither is a step of the approved scale — the type scale's neighbours are
 * 32px (`text-h2`) and 40px, and the spacing scale's are 32px and 40px. Both
 * take the documented role rather than the nearest number (Chapter 4 §8): the
 * cover story is the page's section-level heading, which is `text-h2`.
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
  const t = useTranslations("News");

  return (
    <article className={`${CARD_INTERACTIVE_LG} relative grid overflow-hidden p-0`}>
      <ArticleCover
        article={article}
        cover={cover}
        locale={locale}
        sizes="(min-width: 1280px) 840px, 100vw"
        // The cover story is the first picture on the page and the likely
        // Largest Contentful Paint (Chapter 14 §7).
        priority
      />

      {/* Nothing but a height. It holds the frame open to the canvas's ratio
          when the words are short, and is simply overtaken by the panel when
          they are long — which is how the ratio became a floor. */}
      <div aria-hidden="true" className="col-start-1 row-start-1 aspect-[4/3] w-full md:aspect-[7/4]" />

      <div
        className="relative col-start-1 row-start-1 flex flex-col items-start gap-3.5 self-end p-6 md:p-8"
        style={{ backgroundImage: coverScrim() }}
      >
        {/* The panel's upper edge, carried out to nothing so the wash reads as
            light falling across the picture rather than a box pasted onto it.
            Decorative only — no text stands here, which is why it is the one
            layer with no contrast floor. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-full h-24"
          style={{ backgroundImage: coverScrimFade() }}
        />

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-overline text-[color:var(--color-text-on-brand)]">{t("featuredLabel")}</span>
          <TopicBadge topic={article.topic} />
        </div>

        <h2 className="line-clamp-3 text-h2 text-balance text-[color:var(--color-text-on-brand)]">
          <Link href={`/news/${article.slug}`} className={CARD_LINK}>
            {article.title[locale]}
          </Link>
        </h2>

        <p className="line-clamp-2 text-body text-pretty text-[color:var(--color-text-on-brand)]">
          {article.excerpt[locale]}
        </p>

        <div className="flex flex-wrap items-center gap-2 text-caption text-[color:var(--color-text-on-brand)]">
          {article.publishDate ? (
            <>
              <PublishDate date={article.publishDate} />
              <span aria-hidden="true">·</span>
            </>
          ) : null}
          <span>{t("readingTime", { minutes: readingMinutes(article.body[locale]) })}</span>
        </div>
      </div>
    </article>
  );
};
