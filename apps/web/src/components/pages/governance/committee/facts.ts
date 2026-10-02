import type { AppLocale } from "@/i18n/routing";
import type { CommitteeView } from "@/lib/governance/types";
import { formatSeasonDate } from "@/lib/seasons/season-days";

import { count, nameOf, say } from "../shared/text";

/** Shown in a fact cell whose value the record does not have. */
export const MISSING = "—";

/** One labelled value of the hero strip and the "at a glance" aside. */
export interface CommitteeFact {
  key: "chair" | "term" | "members" | "decision";
  label: string;
  /** `MISSING` rather than empty, so the cell keeps its place. */
  value: string;
}

/** Where a committee reports, as a line and a destination. */
export interface ReportsTo {
  label: string;
  href: string;
}

export interface FactLabels {
  chair: string;
  term: string;
  members: string;
  decision: string;
}

/**
 * The four facts, always four.
 *
 * The strip is a fixed geometry — four cells on a desktop, a 2×2 grid on a
 * phone — so a missing value prints a dash in its cell instead of removing the
 * cell and sliding the others into its place, where a reader would pair a
 * value with the wrong label.
 */
export const committeeFacts = (
  committee: CommitteeView,
  locale: AppLocale,
  labels: FactLabels,
): readonly CommitteeFact[] => {
  const decision = committee.formationDecision;
  const cycle = say(committee.cycle?.label, locale);

  return [
    {
      key: "chair",
      label: labels.chair,
      value: committee.chair ? nameOf(committee.chair.person, locale) : MISSING,
    },
    { key: "term", label: labels.term, value: cycle || MISSING },
    {
      key: "members",
      label: labels.members,
      value: count(committee.members.length + (committee.chair ? 1 : 0), locale),
    },
    {
      key: "decision",
      label: labels.decision,
      value: decision
        ? `${decision.number} · ${formatSeasonDate(decision.date, locale)}`
        : MISSING,
    },
  ];
};

/**
 * The body a committee answers to, or null for a standing committee.
 *
 * A sub-committee with no parent reports to the board itself — `kind`, not
 * the empty parent, is what separates that from a standing committee.
 */
export const reportsTo = (
  committee: CommitteeView,
  locale: AppLocale,
  labels: { board: string; committee: (name: string) => string },
): ReportsTo | null => {
  if (committee.kind !== "sub") return null;

  return committee.parent
    ? {
        label: labels.committee(say(committee.parent.name, locale)),
        href: `/${locale}/about/committees/${committee.parent.slug}`,
      }
    : { label: labels.board, href: `/${locale}/about/board-members` };
};
