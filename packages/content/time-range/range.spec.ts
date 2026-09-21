import { describe, expect, it } from "vitest";
import { TIME_RANGE_PRESETS, activePreset, presetRange, rangeIsPossible } from "./range";

/**
 * What "this week" means, in one place.
 *
 * Shared by the public news filter and the newsroom's own list, because the
 * two must agree: an editor narrowing their list to "this month" and a visitor
 * narrowing the feed to "this month" have to be looking at the same window, or
 * the editor cannot tell what the public sees.
 *
 * Every boundary here is UTC. The API compares against `publishDate`, which it
 * stamps in UTC and bounds with `endOfDay` in UTC — a local-midnight boundary
 * would drop or add a day at every timezone offset, silently, and the result
 * would still look like a list.
 */

// A Wednesday, mid-month, mid-year — so every boundary below is visibly
// different from the date itself rather than accidentally equal to it.
const NOW = new Date("2026-09-16T14:30:00.000Z");

describe("presetRange", () => {
  it("reads today as that one day", () => {
    expect(presetRange("today", NOW)).toEqual({ from: "2026-09-16", to: "2026-09-16" });
  });

  it("reads this week as Monday to today", () => {
    // Monday, because that is the working week the federation's calendar is
    // published on. Sunday-first would put a Sunday result in "last week" for
    // a reader who filed it as this week's.
    expect(presetRange("thisWeek", NOW)).toEqual({ from: "2026-09-14", to: "2026-09-16" });
  });

  it("reads this week as one day when today IS Monday", () => {
    expect(presetRange("thisWeek", new Date("2026-09-14T00:05:00.000Z"))).toEqual({
      from: "2026-09-14",
      to: "2026-09-14",
    });
  });

  it("reads this week correctly on a Sunday, which is its last day", () => {
    // The off-by-one a Monday-first week invites: `getUTCDay()` is 0 on
    // Sunday, so a naive subtraction sends the reader back six days into the
    // week before.
    expect(presetRange("thisWeek", new Date("2026-09-20T10:00:00.000Z"))).toEqual({
      from: "2026-09-14",
      to: "2026-09-20",
    });
  });

  it("reads this month from its first day", () => {
    expect(presetRange("thisMonth", NOW)).toEqual({ from: "2026-09-01", to: "2026-09-16" });
  });

  it("reads this year from its first day", () => {
    expect(presetRange("thisYear", NOW)).toEqual({ from: "2026-01-01", to: "2026-09-16" });
  });

  it("never ends in the future", () => {
    // A range running to the end of the month would include days nothing can
    // have been published on, and a reader would read the empty tail as the
    // newsroom having stopped.
    for (const preset of TIME_RANGE_PRESETS) {
      expect(presetRange(preset, NOW).to).toBe("2026-09-16");
    }
  });
});

describe("activePreset", () => {
  it("recognises a range it would have produced itself", () => {
    // So a page arrived at by a shared link shows the right button pressed
    // rather than "custom" over a range that is exactly this month.
    expect(activePreset({ from: "2026-09-01", to: "2026-09-16" }, NOW)).toBe("thisMonth");
  });

  it("calls anything else custom", () => {
    expect(activePreset({ from: "2026-03-01", to: "2026-04-01" }, NOW)).toBeNull();
  });

  it("calls an empty range no filter at all", () => {
    expect(activePreset({}, NOW)).toBeNull();
  });
});

describe("rangeIsPossible", () => {
  it("accepts a range of one day", () => {
    // The commonest filter there is. `to` runs to the end of its day upstream,
    // so equal bounds are the normal case rather than an edge one.
    expect(rangeIsPossible("2026-06-30", "2026-06-30")).toBe(true);
  });

  it("refuses a range that ends before it starts", () => {
    expect(rangeIsPossible("2026-06-30", "2026-01-01")).toBe(false);
  });

  it("accepts a half-open range", () => {
    expect(rangeIsPossible("2026-06-30", undefined)).toBe(true);
    expect(rangeIsPossible(undefined, "2026-06-30")).toBe(true);
    expect(rangeIsPossible(undefined, undefined)).toBe(true);
  });

  it("accepts a bound that is not a date, because the API ignores it", () => {
    // Mirrors the server: a malformed bound is not applied at all. Calling it
    // impossible here would make the control refuse what the API accepts.
    expect(rangeIsPossible("not-a-date", "2026-01-01")).toBe(true);
  });
});
