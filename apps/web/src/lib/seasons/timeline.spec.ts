import { describe, expect, it } from "vitest";
import { layoutTimeline } from "./timeline";
import type { SeasonPhase } from "./types";

/**
 * Where the timeline draws each phase, month and marker. The grid has one
 * column per day of the season; a placement's `start` and `end` are grid lines,
 * so a phase that ends on the season's last day ends on line `days + 1`.
 */

// 1 September 2026 – 31 August 2027, each stored as Dubai midnight of its day.
const START = "2026-08-31T20:00:00.000Z";
const END = "2027-08-30T20:00:00.000Z";

const phase = (type: SeasonPhase["type"], from: string, to: string): SeasonPhase => ({
  name: { ar: type, en: type },
  type,
  from,
  to,
});

const layout = (phases: SeasonPhase[], now = new Date("2026-10-15T08:00:00Z"), keyDates = []) =>
  layoutTimeline({ startDate: START, endDate: END, phases, keyDates }, now, "en");

describe("layoutTimeline", () => {
  it("gives the season one column per day, both ends included", () => {
    expect(layout([]).days).toBe(365);
  });

  it("keeps a phase that ends on the season's last day inside the grid", () => {
    const [placed] = layout([phase("rest", "2027-06-30T20:00:00.000Z", END)]).phases;
    expect(placed.end).toBe(366);
    expect(placed.start).toBe(304);
  });

  it("starts a phase that opens on the first day at the first line", () => {
    const [placed] = layout([phase("preparation", START, "2026-10-30T20:00:00.000Z")]).phases;
    expect(placed.start).toBe(1);
    // 1 September to 31 October inclusive is 61 days.
    expect(placed.end - placed.start).toBe(61);
  });

  it("clips a phase that runs past either edge of the season", () => {
    const [placed] = layout([phase("rest", "2026-07-31T20:00:00.000Z", "2027-12-30T20:00:00.000Z")]).phases;
    expect(placed.start).toBe(1);
    expect(placed.end).toBe(366);
  });

  it("drops a phase that lies wholly outside the season", () => {
    expect(layout([phase("rest", "2027-09-30T20:00:00.000Z", "2027-10-30T20:00:00.000Z")]).phases).toEqual([]);
  });

  it("puts phases that share a day in separate lanes, and consecutive ones in one", () => {
    const { phases, lanes } = layout([
      phase("preparation", START, "2026-10-30T20:00:00.000Z"),
      // Starts the day after the first ends: same lane.
      phase("domestic", "2026-10-31T20:00:00.000Z", "2027-01-30T20:00:00.000Z"),
      // Overlaps the domestic phase: a lane of its own.
      phase("international", "2026-12-31T20:00:00.000Z", "2027-02-27T20:00:00.000Z"),
    ]);
    expect(phases.map((placed) => placed.lane)).toEqual([1, 1, 2]);
    expect(lanes).toBe(2);
  });

  it("names twelve months from September to August, covering every day once", () => {
    const { months, days } = layout([]);
    expect(months.map((month) => month.label)).toEqual([
      "September", "October", "November", "December", "January", "February",
      "March", "April", "May", "June", "July", "August",
    ]);
    expect(months[0].start).toBe(1);
    expect(months.at(-1)?.end).toBe(days + 1);
    for (let index = 1; index < months.length; index += 1) {
      expect(months[index].start).toBe(months[index - 1].end);
    }
  });

  it("marks today only while it falls inside the season", () => {
    expect(layout([], new Date("2026-08-31T20:00:00Z")).today).toBe(1);
    expect(layout([], new Date("2027-08-31T19:00:00Z")).today).toBe(365);
    expect(layout([], new Date("2027-08-31T20:00:00Z")).today).toBeNull();
  });

  it("places key dates on their day, in date order, dropping any outside the season", () => {
    const { keyDates } = layoutTimeline(
      {
        startDate: START,
        endDate: END,
        phases: [],
        keyDates: [
          { title: { ar: "ب", en: "b" }, date: "2026-10-19T20:00:00.000Z" },
          { title: { ar: "أ", en: "a" }, date: START },
          { title: { ar: "ج", en: "c" }, date: "2027-09-30T20:00:00.000Z" },
        ],
      },
      new Date("2026-10-15T08:00:00Z"),
      "en",
    );
    expect(keyDates.map((entry) => [entry.keyDate.title.en, entry.column])).toEqual([
      ["a", 1],
      ["b", 50],
    ]);
  });

  it("reads a late key date back towards its day, so its label stays on the grid", () => {
    const { keyDates } = layoutTimeline(
      {
        startDate: START,
        endDate: END,
        phases: [],
        keyDates: [
          { title: { ar: "أ", en: "early" }, date: START },
          { title: { ar: "ب", en: "late" }, date: END },
        ],
      },
      new Date("2026-10-15T08:00:00Z"),
      "en",
    );
    expect(keyDates.map((entry) => entry.side)).toEqual(["start", "end"]);
  });
});
