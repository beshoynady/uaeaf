import Link from "next/link";
import { Surface } from "@uaeaf/brand-ui";

import type { CommitteeFact, ReportsTo } from "./facts";
import { MISSING } from "./facts";

/**
 * "At a glance": the hero's facts again, beside the text they summarise.
 *
 * The reports-to line leads, because it is the one fact the hero strip does
 * not carry. Sticky from `lg`, where it sits in its own column; below that it
 * follows the about text at full width and scrolls with it, as the mobile
 * file draws it.
 */
export const CommitteeGlance = ({
  title,
  facts,
  reportsTo,
  reportsToLabel,
}: {
  title: string;
  facts: readonly CommitteeFact[];
  reportsTo: ReportsTo | null;
  reportsToLabel: string;
}) => (
  <aside
    data-field="glance"
    aria-labelledby="committee-glance-title"
    className="lg:sticky lg:top-[calc(var(--header-height)+var(--space-20))] lg:self-start"
  >
    <Surface
      kind="raised"
      as="div"
      className="flex flex-col gap-[var(--space-4)] rounded-[var(--radius-lg)] border border-[color:var(--surface-border)] p-[var(--space-6)]"
    >
      <h3 id="committee-glance-title" className="text-h4">
        {title}
      </h3>

      <dl className="flex flex-col">
        {reportsTo ? (
          <div data-part="reports-to" className="flex flex-col gap-[var(--space-1)] border-b border-[color:var(--surface-divider)] py-[var(--space-3)]">
            <dt className="text-label text-[color:var(--surface-text-muted)]">{reportsToLabel}</dt>
            <dd className="text-body-sm font-bold">
              <Link
                href={reportsTo.href}
                className="brand-focusable inline-flex min-h-[var(--space-12)] items-center text-[color:var(--surface-link)]"
              >
                {reportsTo.label}
              </Link>
            </dd>
          </div>
        ) : null}

        {facts.map((fact) => (
          <div
            key={fact.key}
            data-part={fact.key}
            className="flex flex-col gap-[var(--space-1)] border-b border-[color:var(--surface-divider)] py-[var(--space-3)] last:border-b-0"
          >
            <dt className="text-label text-[color:var(--surface-text-muted)]">{fact.label}</dt>
            <dd
              className={`text-body-sm font-bold ${
                fact.value === MISSING ? "text-[color:var(--surface-text-muted)]" : ""
              }`}
            >
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
    </Surface>
  </aside>
);
