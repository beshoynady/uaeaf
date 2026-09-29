import { describe, expect, it } from "vitest";
import {
  dayIndex,
  dubaiDayOf,
  dubaiDayStart,
  formatSeasonDate,
  formatSeasonRange,
  inclusiveDayCount,
  isWithinDays,
  seasonWindow,
} from "./season-days";

/**
 * A season's dates are inclusive calendar days in Asia/Dubai (owner decision
 * 2026-09-29). The API stores each as Dubai midnight of its day, so 1 September
 * 2026 is `2026-08-31T20:00:00Z` and 31 August 2027 is `2027-08-30T20:00:00Z`.
 */
const START = "2026-08-31T20:00:00.000Z";
const END = "2027-08-30T20:00:00.000Z";

describe("Dubai calendar days", () => {
  it("reads the Dubai day of an instant, not its UTC day", () => {
    expect(dubaiDayOf(START)).toEqual({ year: 2026, month: 9, day: 1 });
    // 23:30 UTC on 31 August is already 1 September in Dubai.
    expect(dubaiDayOf("2026-08-31T23:30:00Z")).toEqual({ year: 2026, month: 9, day: 1 });
  });

  it("starts a day at Dubai midnight", () => {
    expect(dubaiDayStart({ year: 2026, month: 9, day: 1 }).toISOString()).toBe(START);
  });

  it("covers the whole of the last day, and nothing after it", () => {
    const { from, to } = seasonWindow(START, END);
    expect(from.toISOString()).toBe(START);
    expect(to.toISOString()).toBe("2027-08-31T20:00:00.000Z");
    expect(isWithinDays(new Date("2027-08-31T19:59:59Z"), START, END)).toBe(true);
    expect(isWithinDays(new Date("2027-08-31T20:00:00Z"), START, END)).toBe(false);
    expect(isWithinDays(new Date("2026-08-31T19:59:59Z"), START, END)).toBe(false);
  });

  it("counts both ends of the range", () => {
    expect(inclusiveDayCount(START, END)).toBe(365);
    expect(inclusiveDayCount(START, START)).toBe(1);
  });

  it("indexes a day from the season's first day", () => {
    expect(dayIndex(START, START)).toBe(0);
    expect(dayIndex(START, END)).toBe(364);
  });

  it("prints the Dubai day with Latin digits in both languages", () => {
    expect(formatSeasonDate(START, "en", "long")).toBe("September 1, 2026");
    expect(formatSeasonDate(START, "ar", "long")).toMatch(/^1 سبتمبر 2026$/);
    expect(formatSeasonRange(START, END, "ar")).toMatch(/1 سبتمبر 2026.*31 أغسطس 2027/);
    expect(formatSeasonRange(START, END, "en")).not.toMatch(/[٠-٩]/);
  });
});
