import type { SeasonPhaseType } from "@/lib/seasons/types";

/**
 * A phase type's colour as a small square, for the timeline's legend and the
 * hero's current-phase badge. Decorative: every place that draws one prints
 * the type's name beside it.
 */
export const PhaseSwatch = ({ type }: { type: SeasonPhaseType }) => (
  <span aria-hidden="true" data-phase={type} className="season-phase-tone season-timeline__swatch inline-block shrink-0" />
);
