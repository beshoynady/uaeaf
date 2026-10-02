import Link from "next/link";

import type { ReportsTo } from "./facts";
import { ReportsIcon } from "./icons";

/**
 * The body this committee answers to, as a pill beside the chair's.
 *
 * Not in the design file, which drew only standing committees: a sub-committee
 * page without it gives no way back up the tree. Nothing renders for a
 * standing committee, which answers to the general structure rather than to
 * one body.
 */
export const ReportsToPill = ({ target, label }: { target: ReportsTo | null; label: string }) => {
  if (!target) return null;

  return (
    <Link
      href={target.href}
      data-field="reports-to"
      className="brand-focusable inline-flex min-h-[var(--space-12)] items-center gap-[var(--space-3)] rounded-[var(--radius-full)] border border-[color:var(--surface-border)] px-[var(--space-5)] py-[var(--space-2)] text-[color:var(--surface-text)]"
    >
      <ReportsIcon className="text-[color:var(--surface-icon)]" />
      <span className="flex flex-col">
        <span className="text-label text-[color:var(--surface-text-muted)]">{label}</span>
        <span className="text-body-sm font-bold">{target.label}</span>
      </span>
    </Link>
  );
};
