import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /**
   * A CSS width for this column, honoured because the table lays out `fixed`.
   *
   * Give one to every column that has a natural size — a badge, a date, an
   * icon button — and leave the one column that should absorb the remainder
   * without. A column with no width shares whatever is left.
   */
  width?: string;
  /** Forces LTR on a cell whose content is a technical identifier — an
   *  email address, a resource name — which must not be reordered by an
   *  Arabic paragraph direction even though the page around it is RTL. */
  ltr?: boolean;
}

/**
 * The admin list table.
 *
 * The wrapper scrolls horizontally rather than the page: CLAUDE.md §25
 * treats overflow as a visual regression, and a wide table in a narrow window
 * is exactly where that happens. `<caption>` carries the accessible name so
 * the table is announced as what it lists.
 *
 * -- The table fits its container, and truncates rather than pushing --------
 *
 * `table-layout: fixed` with a `<colgroup>`, because the browser's automatic
 * layout sizes every column to its widest cell — and one cell here holds a
 * YouTube URL, which is a single unbreakable string. That pushed the table
 * past its container at every width and produced a horizontal scrollbar under
 * a list that looked like it fitted.
 *
 * Fixed layout inverts that: the columns take the widths they are given, the
 * unsized one absorbs the rest, and text too long for its column is clipped by
 * the cell rather than widening it. The scroll container below is still there,
 * because a window narrow enough will still defeat any set of widths.
 *
 * -- The scroll container is focusable, and that is deliberate --------------
 *
 * A region that scrolls only by pointer cannot be reached by a keyboard at
 * all: at phone width every column after the first is off-screen, and without
 * a tab stop there is no key that brings them back (WCAG 2.1.1). So the
 * wrapper takes `tabIndex={0}` and a name, which is what makes the arrow keys
 * scroll it.
 *
 * Unconditionally, rather than only when it overflows. Measuring would make
 * this a client component to add or remove one tab stop, and a stop on a
 * table that happens to fit costs a keyboard user one Tab — while the missing
 * stop costs them the rest of the row.
 */
export const DataTable = <T,>({
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
}) => {
  if (rows.length === 0) {
    return (
      <p className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--color-border-default)] px-6 py-10 text-center text-body-sm text-[color:var(--color-text-muted)]">
        {empty}
      </p>
    );
  }

  return (
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className="overflow-x-auto rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--a11y-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--a11y-focus-offset)]"
    >
      <table className="w-full table-fixed border-collapse text-start">
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          {columns.map((column) => (
            <col key={column.key} style={column.width ? { width: column.width } : undefined} />
          ))}
        </colgroup>
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
};
