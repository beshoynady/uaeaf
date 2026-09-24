import { useTranslations } from "next-intl";
import { StatCard, type StatTone } from "@uaeaf/brand-ui";
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

  // The tone is what the figure means (ADR-0098, StatCard): a queue that is
  // waiting on somebody is `action`, published work is `positive`, and a plain
  // tally is `neutral`. A zero is not waiting on anyone, so it stays neutral —
  // an edge that says "act" over a nought would be a claim with nothing behind it.
  const waiting = (value: number): StatTone => (value > 0 ? "action" : "neutral");

  const figures = [
    { key: "draft", value: summary.byState.Draft ?? 0, tone: "neutral" },
    { key: "live", value: summary.byState.Live ?? 0, tone: "positive" },
    { key: "inReview", value: summary.inReview, tone: waiting(summary.inReview) },
    {
      key: "awaitingPublication",
      value: summary.awaitingPublication,
      tone: waiting(summary.awaitingPublication),
    },
    { key: "changesRequested", value: summary.changesRequested, tone: waiting(summary.changesRequested) },
    { key: "hidden", value: summary.archived, tone: "neutral" },
  ] as const satisfies readonly { key: string; value: number; tone: StatTone }[];

  return (
    // A list rather than the former `<dl>`: the library card draws its figure
    // and label as paragraphs, and a list still tells a screen reader how many
    // figures the row holds. The figure still comes first in the source.
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {figures.map((figure) => (
        <li key={figure.key} className="flex">
          <StatCard
            className="flex-1"
            value={String(figure.value)}
            label={t(`summary_${figure.key}`)}
            tone={figure.tone}
          />
        </li>
      ))}
    </ul>
  );
};
