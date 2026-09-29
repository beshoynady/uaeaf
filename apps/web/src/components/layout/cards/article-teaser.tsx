import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import { ArticleCover } from "@/components/pages/news/cover";
import { PublishDate } from "@/components/pages/news/publish-date";
import type { ArticleCategory, MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

export interface ArticleTeaserProps {
  slug: string;
  title: string;
  date: string;
  category: ArticleCategory;
  href: string;
  cover: MediaAssetPublic | null;
}

/**
 * The Media panel's middle slot: the newsroom's latest live story (design
 * spec §3.5). A visible `h2` heading, on the same terms as a link column's
 * (§5), then one link around the cover, headline and meta line — never a
 * link per line, the same rule `FeatureCard` follows.
 *
 * Renders nothing when there is no article to show: an empty box is worse
 * than a shorter panel.
 */
export const ArticleTeaser = ({ slug, title, date, category, href, cover }: ArticleTeaserProps) => {
  const t = useTranslations("News");
  const locale = useLocale() as AppLocale;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h2 className="text-overline text-[color:var(--color-text-muted)]">{t("latestHeading")}</h2>
      <Link
        href={href}
        data-nav-focusable=""
        className={`flex min-h-11 flex-col gap-2 rounded-[var(--radius-md)] ${TRANSITION} ${FOCUS}`}
      >
        <div className="relative aspect-video w-full overflow-hidden rounded-[var(--radius-md)]">
          {/* `ArticleCover`'s type asks for a bilingual `title` only to satisfy
              `Pick<ArticlePublic, ...>` — it never reads it. The placeholder it
              may draw instead (no cover uploaded) keys off `slug` and
              `category` alone. */}
          <ArticleCover
            article={{ slug, category, title: { ar: title, en: title } }}
            cover={cover ?? undefined}
            locale={locale}
            sizes="(min-width: 1280px) 33vw, 100vw"
          />
        </div>
        <span className="line-clamp-2 text-body font-bold text-[color:var(--color-text-primary)]">{title}</span>
        <span className="text-caption text-[color:var(--color-text-muted)]">
          {category === "General" ? t("categoryGeneral") : t("inMediaHeading")}
          <span aria-hidden="true"> · </span>
          <PublishDate date={date} />
        </span>
      </Link>
    </div>
  );
};
