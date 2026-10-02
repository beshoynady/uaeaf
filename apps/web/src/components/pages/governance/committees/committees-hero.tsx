import { PageHero } from "@uaeaf/brand-ui";

import type { AppLocale } from "@/i18n/routing";
import type { CommitteesIndexView, GovernancePageSettings } from "@/lib/governance/types";

import { count, say } from "../shared/text";

/**
 * The listing's hero: the stored eyebrow, title and subtitle, and one figure.
 *
 * The figure is counted from the two lists the page actually draws, never
 * stored or written into copy, so the hero cannot claim a number of committees
 * the page below does not show. With nothing published it is left out rather
 * than printed as a zero beside the empty state.
 *
 * The tile paints with the surface variables rather than `StatCard`, whose
 * text colours are the page ground's and read dark on the ink band.
 */
export const CommitteesHero = ({
  index,
  locale,
  statLabel,
}: {
  index: CommitteesIndexView & { page: GovernancePageSettings };
  locale: AppLocale;
  statLabel: string;
}) => {
  const { hero } = index.page;
  const eyebrow = say(hero.eyebrow, locale);
  const subtitle = say(hero.subtitle, locale);
  const cycle = say(index.cycle?.label, locale);
  const total = index.standing.length + index.boardSubCommittees.length;

  const slot =
    total > 0 ? (
      <div className="flex flex-col items-start gap-[var(--space-4)]">
        {total > 0 ? (
          <div
            data-field="heroStat"
            className="gov-pop flex min-w-[var(--space-32)] flex-col gap-[var(--space-1)] rounded-[var(--radius-md)] border border-[color:var(--surface-tile-edge)] bg-[color:var(--surface-tile-fill)] p-[var(--space-5)] text-[color:var(--surface-text)]"
          >
            <span data-part="value" className="text-display-l leading-none tabular-nums">
              {count(total, locale)}
            </span>
            <span data-part="label" className="text-label font-bold">
              {statLabel}
            </span>
            {cycle ? (
              <span data-part="cycle" className="text-body-sm text-[color:var(--surface-text-muted)]">
                {cycle}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    ) : undefined;

  return (
    <PageHero
      title={
        <>
          {/* Above the title and hidden from assistive technology, so the h1
              names the page alone -- the board hero does the same. */}
          {eyebrow ? (
            <span aria-hidden="true" data-field="heroEyebrow" className="block text-label">
              {eyebrow}
            </span>
          ) : null}
          <span data-field="heroTitle">{say(hero.title, locale)}</span>
        </>
      }
      description={subtitle ? <span data-field="heroSubtitle">{subtitle}</span> : undefined}
      slot={slot}
    />
  );
};
