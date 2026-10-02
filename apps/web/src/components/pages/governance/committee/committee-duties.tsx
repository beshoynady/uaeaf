import { Surface } from "@uaeaf/brand-ui";

import { CONTAINER } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import type { CommitteeDuty } from "@/lib/governance/types";
import { revealStep } from "@/lib/motion/reveal";

import { ordinal, say } from "../shared/text";
import { ChapterHeading } from "./chapter-heading";
import { ANCHOR_OFFSET } from "./sections";

/**
 * `#duties`: what the formation decision charges the committee with.
 *
 * An ordered list, because the decision numbers its clauses and a reader
 * quoting one quotes its number. Three columns from `lg`, one below. On the
 * raised ground, as the design alternates it against the sections around it.
 */
export const CommitteeDuties = ({
  duties,
  number,
  title,
  lead,
  locale,
}: {
  duties: readonly CommitteeDuty[];
  number: number;
  title: string;
  lead: string;
  locale: AppLocale;
}) => {
  const ordered = [...duties].sort((a, b) => a.order - b.order);
  if (ordered.length === 0) return null;

  return (
    <Surface kind="raised" id="duties" className={ANCHOR_OFFSET}>
      <div className={`${CONTAINER} flex flex-col gap-[var(--space-8)] py-12 md:py-16 lg:py-24`}>
        <ChapterHeading number={number} title={title} lead={lead} />

        <ol data-field="duties" className="grid gap-[var(--space-5)] lg:grid-cols-3">
          {ordered.map((duty, index) => {
            const description = say(duty.description, locale);
            return (
              <li
                key={duty.id}
                data-part="duty"
                className="gov-pop flex flex-col gap-[var(--space-3)] rounded-[var(--radius-lg)] border border-[color:var(--surface-border)] bg-[color:var(--surface-bg)] p-[var(--space-6)]"
                style={revealStep(index)}
              >
                <span
                  aria-hidden="true"
                  className="text-display-l leading-none text-[color:var(--surface-text-muted)] opacity-40"
                >
                  {ordinal(index + 1)}
                </span>
                <h3 className="text-h4">{say(duty.title, locale)}</h3>
                {description ? (
                  <p className="text-body-sm text-[color:var(--surface-text-muted)]">{description}</p>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </Surface>
  );
};
