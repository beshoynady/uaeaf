import { describe, expect, it } from "vitest";
import { MIN_COLUMN, maxPerRow, planRowLayout, ROW_BREAKPOINTS } from "./row-capacity";

/**
 * How many items the plan's two one-row lists hold at each width, and what
 * they do when they hold more (ADR-0075, owner decisions 2026-09-16).
 *
 * The arithmetic is the only thing decided here; the browser checks that a
 * column never comes out narrower than the measured minimum
 * (`strategic-plan-geometry.spec.ts`).
 */

describe("maxPerRow", () => {
  // Derived from the container's usable width at the START of each breakpoint
  // (the narrowest the range can be) and the gap the list uses there:
  // floor((content + gap) / (minColumn + gap)).
  it.each([
    ["phases", "lg", 4],
    ["phases", "xl", 4],
    ["phases", "2xl", 5],
    ["steps", "md", 5],
    ["steps", "lg", 6],
    ["steps", "xl", 7],
    ["steps", "2xl", 8],
  ] as const)("%s at %s hold %i", (list, breakpoint, expected) => {
    expect(maxPerRow(list, breakpoint)).toBe(expected);
  });

  it("counts only the breakpoints where each list draws a row today", () => {
    // The phases have no row below `lg` (two columns at `md`, stacked on a
    // phone); the steps climb from `md`.
    expect(ROW_BREAKPOINTS.phases).toEqual(["lg", "xl", "2xl"]);
    expect(ROW_BREAKPOINTS.steps).toEqual(["md", "lg", "xl", "2xl"]);
  });

  it("keeps the measured minimums beside their gaps", () => {
    expect(MIN_COLUMN.phases).toBe(214);
    expect(MIN_COLUMN.steps).toBe(128);
  });
});

describe("planRowLayout", () => {
  // The rule: the row is drawn from the first breakpoint whose capacity the
  // count fits, and never below it — a list that goes vertical as the screen
  // narrows never returns to a row further down.
  it.each([
    [1, "lg"],
    [4, "lg"],
    [5, "2xl"],
    [6, null],
    [7, null],
    [10, null],
  ] as const)("phases: %i items draw their row from %s", (count, rowFrom) => {
    expect(planRowLayout("phases", count).rowFrom).toBe(rowFrom);
  });

  it.each([
    [1, "md"],
    [5, "md"],
    [6, "lg"],
    [7, "xl"],
    [8, "2xl"],
    [9, null],
    [10, null],
  ] as const)("steps: %i items draw their row from %s", (count, rowFrom) => {
    expect(planRowLayout("steps", count).rowFrom).toBe(rowFrom);
  });

  // Owner decision 2026-09-16: the tablet's two columns count as a row of
  // their own and stay while the list still fits the `lg` row — so the seed
  // keeps today's layout at every width. Past that, the list is vertical
  // everywhere below the breakpoint that fits it.
  it("keeps the phases' tablet columns only while the list fits the lg row", () => {
    expect(planRowLayout("phases", 4).tabletColumns).toBe(true);
    expect(planRowLayout("phases", 5).tabletColumns).toBe(false);
    expect(planRowLayout("phases", 10).tabletColumns).toBe(false);
  });

  it("gives the steps no tablet form: below their row they are the phone's list", () => {
    expect(planRowLayout("steps", 5).tabletColumns).toBe(false);
    expect(planRowLayout("steps", 9).tabletColumns).toBe(false);
  });

  // The seed the page ships with, at every width: unchanged by this rule.
  it("leaves the seeded four phases and five steps exactly as they are drawn today", () => {
    expect(planRowLayout("phases", 4)).toEqual({ rowFrom: "lg", tabletColumns: true, stacked: false });
    expect(planRowLayout("steps", 5)).toEqual({ rowFrom: "md", tabletColumns: false, stacked: false });
  });

  it("says a list fits nowhere, rather than guessing a row that would be too narrow", () => {
    expect(planRowLayout("phases", 6)).toEqual({ rowFrom: null, tabletColumns: false, stacked: true });
    expect(planRowLayout("steps", 10)).toEqual({ rowFrom: null, tabletColumns: false, stacked: true });
  });
});
