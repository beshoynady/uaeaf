import { useTranslations } from "next-intl";
import { FOCUS, TEXT_TARGET } from "@/components/ui/interactive";
import type { ArticlePublic } from "@/lib/api/types";

const ExternalIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    className="size-[13px] shrink-0"
  >
    <path d="M14 4h6v6" />
    <path d="M20 4 10 14" />
    <path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
  </svg>
);

/**
 * Whether this article is a round-up with somewhere to point.
 *
 * Both fields together, never one: an outlet with no address is a claim a
 * reader cannot check, and an address with no outlet is a bare link. The rows
 * written before the fields existed carry neither, and they are published
 * unchanged — the rule that requires both lives at creation
 * (`CreateArticleDto`), so an old round-up simply shows no attribution rather
 * than showing half of one.
 */
export const hasSource = (article: Pick<ArticlePublic, "category" | "sourceOutlet" | "sourceUrl">): boolean =>
  article.category === "FederationInMedia" && Boolean(article.sourceOutlet) && Boolean(article.sourceUrl);

/**
 * Where a media round-up came from, in one line (owner decision 2026-09-22).
 *
 * A `FederationInMedia` article is the federation reporting that somebody else
 * published something. Shown without its source it is indistinguishable from
 * the newsroom's own reporting, which is the confusion these fields exist to
 * remove.
 *
 * ── Why the card's line is not a link ──────────────────────────────────────
 *
 * The whole card is already one link to the federation's own page for the
 * story (`CARD_LINK` stretches it). A second, competing link inside that
 * target would be two destinations in one box, and on a grid of twelve it
 * would be twelve extra tab stops for an outlet name. The card names the
 * outlet; the article page carries the link out to it.
 */
export const SourceAttribution = ({
  article,
}: {
  article: Pick<ArticlePublic, "category" | "sourceOutlet" | "sourceUrl">;
}) => {
  const t = useTranslations("News");

  if (!hasSource(article)) return null;

  return (
    <p className="text-caption text-[color:var(--color-text-secondary)]">
      {t("viaOutlet", { outlet: article.sourceOutlet as string })}
    </p>
  );
};

/**
 * The same provenance on the article's own page, where it is the first thing
 * under the headline and carries the way out to the original.
 *
 * `target="_blank"` with `rel="noopener noreferrer"` and an icon, per Chapter
 * 8 L3: the link leaves the site, and the accessible name says so rather than
 * leaving a reader to discover it after the fact. `TEXT_TARGET` reaches the
 * 44px floor without pushing the line apart.
 */
export const SourceBlock = ({
  article,
}: {
  article: Pick<ArticlePublic, "category" | "sourceOutlet" | "sourceUrl">;
}) => {
  const t = useTranslations("News");

  if (!hasSource(article)) return null;

  const outlet = article.sourceOutlet as string;

  return (
    <aside
      data-testid="article-source"
      aria-label={t("sourceLabel")}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-sunken)] px-4 py-3"
    >
      <span className="text-body-sm text-[color:var(--color-text-secondary)]">
        {t("publishedFirstBy")}
      </span>
      <span className="text-body-sm font-bold text-[color:var(--color-text-primary)]">{outlet}</span>
      <a
        href={article.sourceUrl as string}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("readOriginalAt", { outlet })}
        className={`${TEXT_TARGET} ${FOCUS} inline-flex items-center gap-1 rounded-xs text-label font-bold text-[color:var(--color-text-link)] underline-offset-4 hover:underline`}
      >
        {t("readOriginal")}
        <ExternalIcon />
      </a>
    </aside>
  );
};
