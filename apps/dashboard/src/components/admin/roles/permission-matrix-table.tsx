"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  canCheck,
  isConsequential,
  type MatrixRow,
  type PermissionAction,
} from "@/lib/admin/permission-matrix";
import { RESOURCE_DOMAINS, UNCLASSIFIED_DOMAIN_KEY, domainKeyFor, domainOrder } from "@/lib/admin/resource-domains";
import type { AppLocale } from "@/i18n/routing";

/**
 * 63 resources against 8 actions, as one table.
 *
 * Three decisions worth stating, because each rejects an easier alternative:
 *
 * **A real `<table>`, not a grid of divs.** A screen-reader user moving
 * through 164 checkboxes needs to be told which row and column each one is
 * in. `scope` on the headers plus an explicit `aria-label` per box is what
 * makes "Delete, albums" audible instead of "checkbox, checkbox, checkbox".
 *
 * **Absent pairs render as an em dash, never as an empty box.** The
 * catalogue holds only the pairs the API actually guards. An unchecked box
 * for a pair that does not exist would invite a click asking for a
 * permission that guards no route.
 *
 * **The whole cell is the target.** The input itself is 18px, below WCAG 2.2
 * SC 2.5.8's 24px minimum; the `<label>` around it fills the cell, so the
 * target is the cell and the box is only what it looks like.
 */
export function PermissionMatrixTable({
  rows,
  actions: visible,
  locale,
  disabled,
  onToggle,
}: {
  rows: readonly MatrixRow[];
  /** Which columns to draw. Computed from the UNFILTERED matrix by the
   *  workbench, never from `rows` — deriving it here would make columns
   *  appear and disappear as the reader types in the search box. Two of the
   *  API's nine actions (`HardDelete`, `EditProtectedData`) guard no route
   *  at all, so drawing all nine unconditionally puts an em dash in 128
   *  cells of a table that already carries 165 real checkboxes. */
  actions: readonly PermissionAction[];
  locale: AppLocale;
  /** True for a system role, where nothing may be changed. */
  disabled: boolean;
  onToggle: (permissionId: string) => void;
}) {
  const t = useTranslations("RolesWorkbench");
  const actions = useTranslations("PermissionAction");

  // Grouped by the domain each resource belongs to (derived from the API's
  // own module layout — see lib/admin/resource-domains.ts). A flat list of 63
  // rows is a list nobody reads.
  const groups = useMemo(() => groupByDomain(rows), [rows]);

  if (rows.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-body-sm text-[color:var(--color-text-muted)]">
        {t("noMatches")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse">
        <caption className="sr-only">{t("matrixCaption")}</caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky top-0 z-10 bg-[color:var(--color-surface-raised)] px-5 py-3 text-start text-caption font-bold text-[color:var(--color-text-secondary)]"
            >
              {t("resource")}
            </th>
            {visible.map((action) => (
              <th
                key={action}
                scope="col"
                className="sticky top-0 z-10 bg-[color:var(--color-surface-raised)] px-1 py-3 text-caption font-bold text-[color:var(--color-text-secondary)]"
              >
                <span className="flex flex-col items-center gap-0.5">
                  <span>{actions(action)}</span>
                  {isConsequential(action) ? (
                    // A rule, not a coloured word: the warning hue is 2.45:1
                    // as text (see components/auth/status-message.tsx). The
                    // legend under the table says what it means.
                    <span
                      aria-hidden="true"
                      className="h-[2px] w-6 rounded-[var(--radius-full)] bg-[color:var(--color-semantic-warning)]"
                    />
                  ) : null}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        {groups.map((group) => (
          <tbody key={group.key}>
            <tr>
              <th
                scope="colgroup"
                colSpan={visible.length + 1}
                className="px-5 pb-2 pt-6 text-start"
              >
                <span className="flex flex-wrap items-baseline gap-2">
                  <span className="text-label font-bold text-[color:var(--color-text-primary)]">
                    {group.key === UNCLASSIFIED_DOMAIN_KEY
                      ? t("unclassifiedDomain")
                      : RESOURCE_DOMAINS[group.key][locale]}
                  </span>
                  <span className="font-mono text-caption font-normal text-[color:var(--color-text-muted)]">
                    {group.rows.length}
                  </span>
                </span>
              </th>
            </tr>

            {group.rows.map((row) => (
              <tr
                key={row.resourceType}
                className="border-t border-[color:var(--color-border-default)] hover:bg-[color:var(--color-surface-sunken)] active:bg-[color:var(--color-surface-skeleton)]"
              >
                <th scope="row" className="px-5 py-1 text-start font-normal">
                  <span className="flex flex-wrap items-baseline gap-2">
                    {/* The identifier is the label. It is the string the API
                        guards on and the only name that exists in both
                        languages — the seeded Arabic permission labels are
                        machine-generated and still await approved copy. */}
                    <span dir="ltr" className="font-mono text-label text-[color:var(--color-text-primary)]">
                      {row.resourceType}
                    </span>
                    <span className="text-caption tabular-nums text-[color:var(--color-text-muted)]">
                      {row.grantedCount}/{row.availableCount}
                    </span>
                  </span>
                </th>

                {visible.map((action) => (
                  <MatrixCellControl
                    key={action}
                    action={action}
                    row={row}
                    disabled={disabled}
                    label={`${actions(action)} — ${row.resourceType}`}
                    onToggle={onToggle}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

function MatrixCellControl({
  action,
  row,
  disabled,
  label,
  onToggle,
}: {
  action: PermissionAction;
  row: MatrixRow;
  disabled: boolean;
  label: string;
  onToggle: (permissionId: string) => void;
}) {
  const t = useTranslations("RolesWorkbench");
  const cell = row.cells[action];

  if (!cell) {
    return (
      <td className="px-1 py-1 text-center">
        <span
          className="text-body text-[color:var(--color-text-disabled)]"
          // Announced, because silence here would be indistinguishable from
          // an unchecked box.
          aria-label={t("notApplicable")}
        >
          —
        </span>
      </td>
    );
  }

  const locked = disabled || !canCheck(cell);

  return (
    <td className="px-1 py-1 text-center">
      <label
        // The label is the target: 40px tall, comfortably over WCAG 2.2
        // SC 2.5.8's 24px minimum, while the box itself stays 18px.
        className={`flex h-10 items-center justify-center rounded-[var(--radius-sm)] ${
          locked ? "cursor-not-allowed" : "cursor-pointer hover:bg-[color:var(--color-surface-skeleton)]"
        }`}
      >
        <input
          type="checkbox"
          checked={cell.granted}
          disabled={locked}
          onChange={() => onToggle(cell.permissionId)}
          aria-label={label}
          // Says why it is disabled. Without it a locked box is just an
          // inert square with no explanation anywhere near it.
          title={locked && !disabled ? t("cannotGrant") : undefined}
          className="size-[18px] cursor-[inherit] accent-[color:var(--color-brand-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)] disabled:opacity-[var(--opacity-disabled)]"
        />
      </label>
    </td>
  );
}

interface DomainGroup {
  key: string;
  rows: MatrixRow[];
}

function groupByDomain(rows: readonly MatrixRow[]): DomainGroup[] {
  const byKey = new Map<string, MatrixRow[]>();
  for (const row of rows) {
    const key = domainKeyFor(row.resourceType);
    const bucket = byKey.get(key);
    if (bucket) {
      bucket.push(row);
    } else {
      byKey.set(key, [row]);
    }
  }
  return [...byKey.entries()]
    .map(([key, groupRows]) => ({ key, rows: groupRows }))
    .sort((a, b) => domainOrder(a.key) - domainOrder(b.key));
}
