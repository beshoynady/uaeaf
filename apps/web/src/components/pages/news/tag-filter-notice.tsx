import { useTranslations } from "next-intl";
import { EmptyState } from "@uaeaf/brand-ui";
import { Link } from "@/i18n/navigation";
import { BADGE } from "@/components/ui/surface";
import { FOCUS } from "@/components/ui/interactive";

/**
 * What a reader sees when they arrived here by following a tag.
 *
 * ── Why it is stated rather than implied ───────────────────────────────────
 *
 * The listing looks the same whether it is showing everything or one label's
 * worth. A reader who followed a badge, or who was sent a link, would
 * otherwise read a shorter page as "the federation published less than I
 * thought" — and a tag nobody uses would look like a newsroom that has stopped
 * publishing. So the filter says what it is, and offers the way out.
 *
 * ── Why the empty case is here and not a 404 ───────────────────────────────
 *
 * A tag nothing carries is not a missing page; it is a true answer to a real
 * question. The hero above stays, the sentence explains, and the way back is
 * one press. The sentence is the kit's `EmptyState` (ADR-0098), so an empty
 * listing reads as a stated result on the page's own ground rather than as a
 * gap; the way back stays the one link above it rather than being repeated as
 * the state's action.
 */
export const TagFilterNotice = ({ tag, empty }: { tag: string; empty: boolean }) => {
  const t = useTranslations("News");

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h2 className="text-h4 text-[color:var(--color-text-primary)]">{t("tagHeading", { tag })}</h2>

      <Link
        href="/news"
        className={`${BADGE} min-h-11 border-[color:var(--color-border-strong)] px-4 text-[color:var(--color-text-secondary)] transition-colors duration-[var(--motion-duration-instant)] hover:border-[color:var(--color-action-default)] active:border-[color:var(--color-action-default)] hover:text-[color:var(--color-text-primary)] active:text-[color:var(--color-text-primary)] ${FOCUS}`}
      >
        {t("tagClear")}
      </Link>

      {empty ? <EmptyState title={t("tagEmpty")} className="w-full" /> : null}
    </div>
  );
};
