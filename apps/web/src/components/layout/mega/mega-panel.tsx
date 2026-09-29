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
  /** A second content track (design spec §5's "عمود روابط أو محتوى"): a
   *  season summary, a season picker, or (Media) the latest article — never a
   *  plain link column. Counted as one more grid track alongside `columns`
   *  when present; absent, the links column(s) expand to fill the freed
   *  space (spec §8's fallback rule). Follows the same drawer-visibility rule
   *  as `feature`. */
  middle?: ReactNode;
  currentPath: string;
  /** The running broadcast, or `null` while none is on air. Forwarded to
   *  every column; only the one carrying the live-stream item does anything
   *  with it. */
  live?: { title: string; href: string } | null;
  /** In-flow (drawer) visibility, independent of `open`: the row layout keeps
   *  this panel in the DOM and animates it with CSS instead. Omitted for a
   *  caller with no stacked layout of its own. */
  hidden?: boolean;
  /**
   * Which surface this render sits on. The drawer drops the promoted feature
   * card for every panel except Athletics, where it is the panel's own
   * call to action rather than a promoted article. Defaults to `"row"` so a
   * caller with no stacked layout keeps its existing card.
   */
  layout?: "row" | "drawer";
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
  middle,
  currentPath,
  hidden,
  layout = "row",
  onKeyDown,
  live = null,
}: MegaPanelProps) => {
  const t = useTranslations("Nav");
  // The drawer drops the feature cards: a promoted destination below eight
  // links on a phone is a second screen of scrolling before the list ends.
  // A panel flagged `keepsCardInDrawer` is exempt: its card is its own call
  // to action, not a promoted article. `middle` is promotional content on the
  // same terms as `feature`, never a plain link column, so it follows the
  // same rule.
  const showFeature = layout === "row" || item.keepsCardInDrawer === true;
  // `middle` occupies its own grid track alongside the real link columns
  // (spec §5's "عمود روابط أو محتوى"); absent, the track does not exist and
  // the link column(s) expand into the space (spec §8's fallback rule for
  // the season summary applies identically here).
  const trackCount = columns.length + (middle ? 1 : 0);

  return (
    <div
      id={id}
      role="region"
      aria-label={t(item.key)}
      data-open={open}
      data-columns={trackCount}
      hidden={hidden}
      onKeyDown={onKeyDown}
      className="mega-panel xl:nav-float"
    >
      <div data-columns={trackCount} className="grid gap-[var(--grid-gutter-xl)] p-[var(--space-6)]">
        {columns.map((column) => (
          <MegaColumn key={column.key} column={column} currentPath={currentPath} live={live} />
        ))}
        {showFeature ? middle : null}
        {showFeature ? feature : null}
      </div>
    </div>
  );
};
