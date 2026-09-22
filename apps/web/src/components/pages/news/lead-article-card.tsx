import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CARD_INTERACTIVE_LG } from "@/components/ui/surface";
import { CARD_LINK } from "@/components/ui/interactive";
import { readingMinutes } from "@/lib/news/reading-time";
import { ArticleCover } from "./cover";
import { PublishDate } from "./publish-date";
import { TopicBadge } from "./topic-badge";
import type { ArticlePublic, MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

const ClockIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    className="size-3.5 shrink-0"
  >
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 16 14" />
  </svg>
);

/**
 * The first story of the homepage news section (approved canvas 2026-09-22):
 * its picture with the topic on it, the headline, the opening, and when it
 * went live beside how long it takes to read. The whole card is one link.
 *
 * The picture is 300px tall from `lg`, where the canvas draws it beside the
 * list; below that it keeps the grid card's 16:10, since the canvas has no
 * narrower frame. PENDING FIGMA BACK-SYNC.
 */
export const LeadArticleCard = ({
  article,
  cover,
  locale,
}: {
  article: ArticlePublic;
  cover?: MediaAssetPublic;
  locale: AppLocale;
}) => {
  const t = useTranslations("News");

  return (
    <article className={`${CARD_INTERACTIVE_LG} relative flex flex-col overflow-hidden p-0`}>
      <div className="relative aspect-[16/10] w-full overflow-hidden lg:aspect-auto lg:h-[300px]">
        <ArticleCover
          article={article}
          cover={cover}
          locale={locale}
          sizes="(min-width: 1024px) 632px, 100vw"
        />
        <div className="absolute start-5 top-5">
          <TopicBadge topic={article.topic} />
        </div>
      </div>

      <div className="flex flex-col gap-3.5 p-7">
        <h3 className="line-clamp-2 text-h3 text-balance text-[color:var(--color-text-primary)]">
          <Link href={`/news/${article.slug}`} className={CARD_LINK}>
            {article.title[locale]}
          </Link>
        </h3>
        <p className="line-clamp-3 text-body text-pretty text-[color:var(--color-text-secondary)]">
          {article.excerpt[locale]}
        </p>
        <p className="mt-1 flex items-center gap-2 border-t border-[color:var(--color-border-default)] pt-3.5 text-caption text-[color:var(--color-text-secondary)]">
          <ClockIcon />
          <span>
            <PublishDate date={article.publishDate} />
            {article.publishDate ? <span aria-hidden="true"> · </span> : null}
            {t("readingTime", { minutes: readingMinutes(article.body[locale]) })}
          </span>
        </p>
      </div>
    </article>
  );
};
