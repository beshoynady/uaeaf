import { Link } from "@/i18n/navigation";
import { CARD_LINK, TRANSITION } from "@/components/ui/interactive";
import { ArticleCover } from "./cover";
import { PublishDate } from "./publish-date";
import { TopicBadge } from "./topic-badge";
import type { ArticlePublic, MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * One story in the list beside the lead (approved canvas 2026-09-22): a
 * thumbnail, the topic, the headline and the date. A row rather than a card,
 * so it has no edge of its own; the whole row is one link and lights its
 * ground on hover.
 *
 * The headline is an `h3`, a peer of the lead story's, where the canvas draws
 * an `h4`: under one section heading the six stories stand side by side, and
 * an `h4` would file five of them under the first.
 */
export const ArticleListItem = ({
  article,
  cover,
  locale,
}: {
  article: ArticlePublic;
  cover?: MediaAssetPublic;
  locale: AppLocale;
}) => (
  <article
    className={`relative flex items-start gap-4 rounded-[var(--radius-md)] px-1 py-4 ${TRANSITION} hover:bg-[color:var(--color-surface-sunken)] focus-within:bg-[color:var(--color-surface-sunken)] active:bg-[color:var(--color-surface-sunken)]`}
  >
    <div className="relative h-20 w-[120px] shrink-0 overflow-hidden rounded-[var(--radius-md)]">
      <ArticleCover article={article} cover={cover} locale={locale} sizes="120px" />
    </div>
    <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
      <TopicBadge topic={article.topic} />
      <h3 className="line-clamp-2 text-subtitle font-bold text-[color:var(--color-text-primary)]">
        <Link href={`/news/${article.slug}`} className={CARD_LINK}>
          {article.title[locale]}
        </Link>
      </h3>
      <PublishDate date={article.publishDate} className="text-caption text-[color:var(--color-text-secondary)]" />
    </div>
  </article>
);
