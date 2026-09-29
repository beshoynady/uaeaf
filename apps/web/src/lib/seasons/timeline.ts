import type { AppLocale } from "@/i18n/routing";
import { dayIndex, dubaiDayOf, dubaiDayStart, formatSeasonDate, inclusiveDayCount, isWithinDays } from "./season-days";
import type { SeasonKeyDate, SeasonPhase } from "./types";

/**
 * Where the season timeline draws everything, as grid positions.
 *
 * The grid has one column per day of the season, so a phase's width is its
 * share of the season's days rather than a rounding of it to months. Positions
 * are CSS grid lines: `start` is the line before the first day, `end` the line
 * after the last, so a phase ending on the season's final day ends on
 * `days + 1` and never spills past the grid.
 *
 * Phases of the same type never overlap (the API refuses it); phases of
 * different types may. Any two that share a day go in separate lanes, so an
 * overlap is drawn as two rows rather than one bar painted over another.
 */

export interface PlacedPhase {
  phase: SeasonPhase;
  start: number;
  end: number;
  /** 1-based row within the phase band. */
  lane: number;
}

export interface PlacedMonth {
  label: string;
  start: number;
  end: number;
}

export interface PlacedKeyDate {
  keyDate: SeasonKeyDate;
  /** The grid column of its day. */
  column: number;
}

export interface TimelineLayout {
  days: number;
  months: PlacedMonth[];
  phases: PlacedPhase[];
  lanes: number;
  /** Today's column, or `null` outside the season. */
  today: number | null;
  keyDates: PlacedKeyDate[];
}

interface TimelineInput {
  startDate: string;
  endDate: string;
  phases: readonly SeasonPhase[];
  keyDates: readonly SeasonKeyDate[];
}

const clampDay = (index: number, days: number): number => Math.min(days - 1, Math.max(0, index));

const placePhases = (input: TimelineInput, days: number): PlacedPhase[] => {
  const spans = input.phases
    .map((phase) => ({ phase, first: dayIndex(input.startDate, phase.from), last: dayIndex(input.startDate, phase.to) }))
    .filter(({ first, last }) => last >= 0 && first <= days - 1 && last >= first)
    .map(({ phase, first, last }) => ({
      phase,
      start: clampDay(first, days) + 1,
      end: clampDay(last, days) + 2,
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end);

  // Greedy: each phase takes the first lane whose last phase has ended.
  const laneEnds: number[] = [];
  return spans.map((span) => {
    const free = laneEnds.findIndex((end) => end <= span.start);
    const lane = free === -1 ? laneEnds.length : free;
    laneEnds[lane] = span.end;
    return { ...span, lane: lane + 1 };
  });
};

const placeMonths = (input: TimelineInput, days: number, locale: AppLocale): PlacedMonth[] => {
  const first = dubaiDayOf(input.startDate);
  const last = dubaiDayOf(input.endDate);
  const months: PlacedMonth[] = [];

  for (let year = first.year, month = first.month; year < last.year || (year === last.year && month <= last.month); ) {
    const opens = dubaiDayStart({ year, month, day: 1 });
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const closes = dubaiDayStart({ year: nextYear, month: nextMonth, day: 1 });
    months.push({
      label: formatSeasonDate(opens, locale, "month"),
      start: clampDay(dayIndex(input.startDate, opens), days) + 1,
      end: clampDay(dayIndex(input.startDate, closes) - 1, days) + 2,
    });
    year = nextYear;
    month = nextMonth;
  }
  return months;
};

/** Every position the timeline draws, for one season at one moment. */
export const layoutTimeline = (input: TimelineInput, now: Date, locale: AppLocale): TimelineLayout => {
  const days = inclusiveDayCount(input.startDate, input.endDate);
  const phases = placePhases(input, days);

  return {
    days,
    months: placeMonths(input, days, locale),
    phases,
    lanes: Math.max(1, ...phases.map((placed) => placed.lane)),
    today: isWithinDays(now, input.startDate, input.endDate) ? dayIndex(input.startDate, now) + 1 : null,
    keyDates: input.keyDates
      .map((keyDate) => ({ keyDate, index: dayIndex(input.startDate, keyDate.date) }))
      .filter(({ index }) => index >= 0 && index < days)
      .sort((a, b) => a.index - b.index)
      .map(({ keyDate, index }) => ({ keyDate, column: index + 1 })),
  };
};

/** The phases running today — more than one where phases of different types overlap. */
export const currentPhases = (phases: readonly SeasonPhase[], now: Date): SeasonPhase[] =>
  phases.filter((phase) => isWithinDays(now, phase.from, phase.to));
