import type { KeyboardEvent, ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { NavItem } from "@/lib/navigation";
import { MegaColumn } from "@/components/layout/mega/mega-column";

export interface MegaPanelProps {
  /** DOM id, matched by a trigger's `aria-controls`. */
  id: string;
  /** The top-level nav item this panel discloses; its `key` names the region. */
  item: NavItem;
  open: boolean;
  /** The item's columns, rendered in order with nothing standing in for one
   *  a data source failed to return. */
  columns: readonly NavItem[];
  /** The featured card slot, laid out after the columns. */
  feature: ReactNode;
  currentPath: string;
  /** In-flow (drawer) visibility, independent of `open`: the row layout keeps
   *  this panel in the DOM and animates it with CSS instead. Omitted for a
   *  caller with no stacked layout of its own. */
  hidden?: boolean;
  /** Roving focus and Escape inside the panel's links. */
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
}

/**
 * One panel: its columns, then the feature card at the end.
 *
 * `data-columns` carries the count to CSS rather than a class per number: a
 * panel whose data source returned nothing has fewer columns, and the grid has
 * to close up rather than leave the gap where the missing one would have been.
 */
export const MegaPanel = ({
  id,
  item,
  open,
  columns,
  feature,
  currentPath,
  hidden,
  onKeyDown,
}: MegaPanelProps) => {
  const t = useTranslations("Nav");

  return (
    <div
      id={id}
      role="region"
      aria-label={t(item.key)}
      data-open={open}
      data-columns={columns.length}
      hidden={hidden}
      onKeyDown={onKeyDown}
      className="mega-panel xl:nav-float"
    >
      <div className="grid gap-[var(--grid-gutter-xl)] p-[var(--space-6)]">
        {columns.map((column) => (
          <MegaColumn key={column.key} column={column} currentPath={currentPath} />
        ))}
        {feature}
      </div>
    </div>
  );
};
