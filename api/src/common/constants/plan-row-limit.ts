/**
 * How many items a list drawn as one row may hold (ADR-0075, owner decision
 * 2026-09-16).
 *
 * The strategic plan's phases stand on one rail and its execution steps on one
 * climb. Past the count a row holds at the width it is drawn, both fall back
 * to the vertical layout they already have on a phone; past ten the section is
 * a list nobody scrolls, so the API refuses the eleventh item and the
 * dashboard's add button is refused with its reason.
 *
 * The other three lists — pillars, objectives, metrics — wrap into rows on
 * their own and carry no limit.
 */
export const MAX_PLAN_ROW_ITEMS = 10;

/** The lists the limit applies to, by their field names on the page record. */
export const PLAN_ROW_LIST_KEYS = ['phases', 'executionSteps'] as const;

export type PlanRowListKey = (typeof PLAN_ROW_LIST_KEYS)[number];
