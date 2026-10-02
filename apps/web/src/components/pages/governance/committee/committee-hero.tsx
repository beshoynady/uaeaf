import Link from "next/link";
import { BrandAccentBar, Surface } from "@uaeaf/brand-ui";

import { CONTAINER } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { AppointmentView } from "@/lib/governance/types";
import { revealStep } from "@/lib/motion/reveal";

import { Portrait } from "../shared/portrait";
import { nameOf, say } from "../shared/text";
import type { CommitteeFact, ReportsTo } from "./facts";
import { MISSING } from "./facts";
import { ReportsToPill } from "./reports-to-pill";

export interface HeroLabels {
  /** Null for a committee nobody has classified: no eyebrow rather than a guessed one. */
  kind: string | null;
  factsLabel: string;
  photoPending: string;
  noChair: string;
  reportsTo: string;
}

/**
 * The chair, as the pill that leads to their profile.
 *
 * A committee with no chair keeps the pill's place with a plain statement of
 * that, rather than dropping it: an absent chair is the ordinary state while
 * committees are being formed, and saying so answers the reader's question.
 */
const ChairPill = ({
  chair,
  locale,
  labels,
}: {
  chair: AppointmentView | null;
  locale: AppLocale;
  labels: HeroLabels;
}) => {
  const pill =
    "inline-flex min-h-[var(--space-12)] items-center gap-[var(--space-3)] rounded-[var(--radius-full)] border border-[color:var(--surface-border)] py-[var(--space-2)] ps-[var(--space-2)] pe-[var(--space-5)] text-[color:var(--surface-text)]";

  if (!chair) {
    return (
      <span data-field="chair" className={`${pill} ps-[var(--space-5)] text-body-sm`}>
        {labels.noChair}
      </span>
    );
  }

  return (
    <Link
      href={`/${locale}/about/people/${chair.person.slug}`}
      data-field="chair"
      className={`brand-focusable ${pill}`}
    >
      <Portrait shape="circle" label={labels.photoPending} className="size-[var(--space-12)] shrink-0" />
      <span className="flex flex-col">
        <span className="text-label text-[color:var(--surface-text-muted)]">
          {say(chair.position.title, locale)}
        </span>
        <span className="text-body-sm font-bold">{nameOf(chair.person, locale)}</span>
      </span>
    </Link>
  );
};

/**
 * The opening scene: the committee's name, its line, who chairs it, who it
 * answers to, and the four facts.
 *
 * Ink, as the design's dark opening scene; the accent bar is the cue that
 * separates it from a dark page (ADR-0098 §8.4). The facts strip keeps four
 * cells whatever the record holds — a missing value is a dash in its own cell —
 * and folds to a 2×2 grid on a phone, as the mobile file draws it.
 */
export const CommitteeHero = ({
  name,
  summary,
  chair,
  reportsTo,
  facts,
  locale,
  labels,
}: {
  name: string;
  summary: string;
  chair: AppointmentView | null;
  reportsTo: ReportsTo | null;
  facts: readonly CommitteeFact[];
  locale: AppLocale;
  labels: HeroLabels;
}) => (
  <Surface kind="ink" mesh className="relative overflow-hidden">
    <BrandAccentBar />
    <div className={`${CONTAINER} flex flex-col gap-[var(--space-8)] py-12 md:py-16 lg:py-24`}>
      <div className="flex max-w-[68ch] flex-col gap-[var(--space-4)]">
        {labels.kind ? (
          <span data-field="kind" className="text-overline text-[color:var(--surface-text-muted)]">
            {labels.kind}
          </span>
        ) : null}
        <h1 data-field="name" className="text-h1 md:text-display-l text-[color:var(--surface-text)]">
          {name}
        </h1>
        {summary ? (
          <p data-field="summary" className="text-body-lg text-[color:var(--surface-text-muted)]">
            {summary}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-[var(--space-3)]">
        <ChairPill chair={chair} locale={locale} labels={labels} />
        <ReportsToPill target={reportsTo} label={labels.reportsTo} />
      </div>

      <dl
        aria-label={labels.factsLabel}
        data-field="facts"
        className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--surface-border)] bg-[color:var(--surface-divider)] md:grid-cols-4"
      >
        {facts.map((fact, index) => (
          <div
            key={fact.key}
            data-part={fact.key}
            className="gov-pop flex flex-col gap-[var(--space-1)] bg-[color:var(--surface-bg)] p-[var(--space-4)] md:p-[var(--space-6)]"
            style={revealStep(index)}
          >
            <dt className="text-label text-[color:var(--surface-text-muted)]">{fact.label}</dt>
            <dd
              className={`text-body font-bold ${
                fact.value === MISSING ? "text-[color:var(--surface-text-muted)]" : "text-[color:var(--surface-text)]"
              }`}
            >
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  </Surface>
);
