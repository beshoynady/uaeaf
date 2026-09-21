import { useTranslations } from "next-intl";
import type { NewsroomSummary } from "@/lib/admin/newsroom-screen";

/**
 * The newsroom's own numbers, above its list.
 *
 * ── What is counted, and what each number is for ───────────────────────────
 *
 * Six figures, each answering a question somebody actually arrives with:
 * how much is unpublished, how much is live, what is waiting on a reviewer,
 * what is approved and waiting on a publisher, what has been sent back, and
 * how much is hidden from the feed. A card row that reported only the stored
 * two states would say nothing about the queue, which is the thing a newsroom
 * runs on.
 *
 * ── Why zeroes are drawn ───────────────────────────────────────────────────
 *
 * A row that omits "waiting on a reviewer: 0" reads as a screen that failed to
 * load, and a reader cannot tell that from one still loading. Every figure is
 * present, always, and absence means the read was refused — which is why the
 * whole row is gone in that case rather than showing zeros it does not know.
 *
 * ── Why it is not a link ───────────────────────────────────────────────────
 *
 * The filters are immediately below and do the same narrowing with feedback
 * this cannot give. Six cards that each silently rewrote the filter row would
 * leave an editor unsure which control was in charge.
 */
export const NewsroomSummaryCards = ({ summary }: { summary: NewsroomSummary }) => {
  const t = useTranslations("Newsroom");

  const figures = [
    { key: "draft", value: summary.byState.Draft ?? 0 },
    { key: "live", value: summary.byState.Live ?? 0 },
    { key: "inReview", value: summary.inReview },
    { key: "awaitingPublication", value: summary.awaitingPublication },
    { key: "changesRequested", value: summary.changesRequested },
    { key: "hidden", value: summary.archived },
  ] as const;

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {figures.map((figure) => (
        <div
          key={figure.key}
          className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-4"
        >
          {/* The number first in the source as well as on screen, so a screen
              reader reads "12, drafts" rather than making the listener hold a
              label while waiting for its figure. */}
          <dd className="text-h3 font-bold text-[color:var(--color-text-primary)]">{figure.value}</dd>
          <dt className="text-caption text-[color:var(--color-text-secondary)]">
            {t(`summary_${figure.key}`)}
          </dt>
        </div>
      ))}
    </dl>
  );
};
