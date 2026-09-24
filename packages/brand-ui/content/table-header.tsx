import type { ReactNode } from "react";

export type TableHeaderProps = {
  children: ReactNode;
  className?: string;
};

/**
 * A table's head row, with the tricolour rule under it.
 *
 * A `<thead>` wrapper rather than a styled `<tr>`: the rule belongs to the
 * boundary between the head and the body, and that boundary is the `<thead>`
 * element's own edge. Styling the last `<th>` instead leaves the rule broken
 * at every column gap.
 *
 * The caller still writes its own `<tr>` and `<th>`s, so column semantics —
 * `scope`, `aria-sort`, the header ids a complex table needs — stay where the
 * table can express them.
 *
 * Server Component.
 */
export const TableHeader = ({ children, className }: TableHeaderProps) => (
  <thead className={["brand-table-header", className].filter(Boolean).join(" ")}>
    {children}
  </thead>
);
