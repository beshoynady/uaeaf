import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Forces LTR on a cell whose content is a technical identifier — an
   *  email address, a resource name — which must not be reordered by an
   *  Arabic paragraph direction even though the page around it is RTL. */
  ltr?: boolean;
}

/**
 * The one table used across the admin screens.
 *
 * The wrapper scrolls horizontally rather than the page: CLAUDE.md §25
 * treats overflow as a visual regression, and a wide permissions table on a
 * narrow window is exactly where that happens. `<caption>` carries the
 * accessible name so the table is announced as what it lists.
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  empty,
}: {
  caption: string;
  columns: readonly Column<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--color-border-default)] px-6 py-10 text-center text-body-sm text-[color:var(--color-text-muted)]">
        {empty}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[color:var(--color-border-default)]">
      <table className="w-full border-collapse text-start">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-[color:var(--color-surface-sunken)]">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-start text-label font-medium text-[color:var(--color-text-secondary)]"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-t border-[color:var(--color-border-default)] align-top"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  dir={column.ltr ? "ltr" : undefined}
                  className={`px-4 py-3 text-body-sm text-[color:var(--color-text-primary)] ${
                    column.ltr ? "text-start" : ""
                  }`}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
