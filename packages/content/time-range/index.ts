/**
 * Narrowing a list by date, shared by the public news filter and the
 * newsroom's own list (the `@uaeaf/content` pattern, ADR-0083): one source for
 * what "this week" means, so the two screens cannot disagree about it.
 */
export { TIME_RANGE_PRESETS, activePreset, presetRange, rangeIsPossible } from "./range";
export type { TimeRange, TimeRangePreset } from "./range";
