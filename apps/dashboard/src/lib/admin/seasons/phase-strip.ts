import { daysIncluded, isDay } from "./season-dates";
import { SEASON_PHASE_TYPES } from "./types";
import type { PhaseDraft } from "./season-draft";
import type { SeasonPhaseType } from "./types";

/**
 * Where each phase sits on the season's strip, as percentages of the season's
 * days — both ends of every range included, so a phase ending on the
 * season's last day reaches the strip's end and a one-day phase still has a
 * width.
 *
 * One lane per phase type, in the type order: phases of one type may not
 * share a day, so a lane never draws two bars on top of each other, while
 * phases of different types — which may run together — each keep their own
 * lane. Only phases that are complete and inside the season are placed; the
 * rest are the form's problems, not the strip's.
 */
export interface PhaseSpan {
  key: string;
  type: SeasonPhaseType;
  startPercent: number;
  widthPercent: number;
}

export interface PhaseLane {
  type: SeasonPhaseType;
  spans: PhaseSpan[];
}

export const phaseLanes = (start: string, end: string, phases: readonly PhaseDraft[]): PhaseLane[] => {
  const total = isDay(start) && isDay(end) ? daysIncluded(start, end) : 0;
  if (total <= 0) return [];

  const placed = phases.flatMap((phase): PhaseSpan[] => {
    if (phase.type === "" || !isDay(phase.from) || !isDay(phase.to)) return [];
    if (phase.to < phase.from || phase.from < start || phase.to > end) return [];
    return [
      {
        key: phase.key,
        type: phase.type,
        startPercent: ((daysIncluded(start, phase.from) - 1) / total) * 100,
        widthPercent: (daysIncluded(phase.from, phase.to) / total) * 100,
      },
    ];
  });

  return SEASON_PHASE_TYPES.flatMap((type) => {
    const spans = placed.filter((span) => span.type === type);
    return spans.length > 0 ? [{ type, spans }] : [];
  });
};
