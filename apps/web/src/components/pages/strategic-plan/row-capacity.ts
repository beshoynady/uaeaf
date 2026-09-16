/**
 * How many items the plan's two one-row lists hold at each width, and what
 * they do when the row cannot hold them (ADR-0075, owner decisions
 * 2026-09-16).
 *
 * The phases stand on one rail and the execution steps on one climb. Every
 * item added narrows every column, so past the count a row holds the list
 * takes the layout it already has on a phone — vertical, the line along the
 * reading-start edge — rather than a new composition nobody has approved.
 *
 * Nothing here is measured at run time: the two minimums below were measured
 * once in the browser, and the widths come from the grid tokens. A layout
 * decided from `window` would need JavaScript to settle, which is a layout
 * shift on a page whose guard forbids one.
 */

export type PlanRowList = "phases" | "steps";

/** The breakpoints the page's own classes use (Chapter 5 §5.2). */
export type PlanBreakpoint = "md" | "lg" | "xl" | "2xl";

/**
 * The narrowest column the approved layout already draws, measured in the
 * browser on 2026-09-16 in both languages, on the seeded page:
 *
 * - `phases`: 214px, at 1024 with four phases (the width their row starts at).
 * - `steps`: 128px, at 768 with five steps (likewise).
 *
 * Narrower than these is a column no approved screen has ever shown, so the
 * row is not drawn there. `strategic-plan-geometry.spec.ts` measures the
 * rendered columns against these numbers.
 */
export const MIN_COLUMN: Record<PlanRowList, number> = { phases: 214, steps: 128 };

/** Where each list draws a row today: the phases from `lg` (two columns at
 *  `md`, stacked on a phone), the steps from `md`. */
export const ROW_BREAKPOINTS: Record<PlanRowList, readonly PlanBreakpoint[]> = {
  phases: ["lg", "xl", "2xl"],
  steps: ["md", "lg", "xl", "2xl"],
};

/**
 * The container's usable width at the **start** of each breakpoint — the
 * narrowest the range can be, which is the only width a capacity may be
 * promised at. The viewport (capped at `--container-public-max`, 1440) less
 * the page margin on both sides (`--grid-margin-*`: 32 · 48 · 64 · 64).
 *
 * Measured without a classic scrollbar, as the browser checks run. A scrollbar
 * takes about 15px from the viewport, which narrows each column by a few
 * pixels in the layout the seed already ships; it changes no capacity here,
 * because every capacity below clears its minimum by more than that.
 */
const CONTENT_WIDTH: Record<PlanBreakpoint, number> = { md: 704, lg: 928, xl: 1152, "2xl": 1312 };

/** The column gap each list uses at each width, as the page's classes set it. */
const GAP: Record<PlanRowList, Record<PlanBreakpoint, number>> = {
  phases: { md: 24, lg: 24, xl: 32, "2xl": 32 },
  steps: { md: 16, lg: 24, xl: 24, "2xl": 24 },
};

/** How many columns of at least `MIN_COLUMN` fit, gaps included. */
export const maxPerRow = (list: PlanRowList, breakpoint: PlanBreakpoint): number => {
  const gap = GAP[list][breakpoint];
  return Math.floor((CONTENT_WIDTH[breakpoint] + gap) / (MIN_COLUMN[list] + gap));
};

export interface PlanRowLayout {
  /** The first breakpoint whose row holds the count, or `null` when none does. */
  rowFrom: PlanBreakpoint | null;
  /** The phases' two columns in the tablet range, kept only while the list
   *  still fits the `lg` row — so the seeded four never change shape. */
  tabletColumns: boolean;
  /** Vertical at every width: no row holds this many. */
  stacked: boolean;
}

/**
 * The row the count earns, and never below it: a list that goes vertical as
 * the screen narrows never returns to a row further down. The first fitting
 * breakpoint is taken, because capacity only grows with width.
 */
export const planRowLayout = (list: PlanRowList, count: number): PlanRowLayout => {
  const rowFrom = ROW_BREAKPOINTS[list].find((breakpoint) => count <= maxPerRow(list, breakpoint)) ?? null;
  return {
    rowFrom,
    tabletColumns: list === "phases" && rowFrom === "lg",
    stacked: rowFrom === null,
  };
};
