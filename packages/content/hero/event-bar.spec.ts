import { describe, expect, it } from "vitest";
import { dubaiLocalToIso, eventBarState, formatEventDateTime, isoToDubaiLocal } from "./event-bar";
import type { NextEventLike } from "./event-bar";

const event = (overrides: Partial<NextEventLike> = {}): NextEventLike => ({
  isVisible: true,
  label: { ar: "البطولة القادمة", en: "Next championship" },
  name: { ar: "بطولة الإمارات", en: "UAE Championship" },
  venue: { ar: "أبوظبي", en: "Abu Dhabi" },
  startsAt: "2026-10-16T18:00:00+04:00",
  endsAt: "2026-10-18T22:00:00+04:00",
  ...overrides,
});

const dubai = (local: string) => new Date(`${local}+04:00`);

describe("the next-event bar's state", () => {
  it("counts days, hours and minutes to the start, rounded down to the minute", () => {
    expect(eventBarState(event(), dubai("2026-10-15T15:29:30"))).toEqual({
      state: "before",
      days: 1,
      hours: 2,
      minutes: 30,
    });
  });

  it("is live from the start, inclusive, until the end", () => {
    expect(eventBarState(event(), dubai("2026-10-16T18:00:00"))).toEqual({ state: "live" });
    expect(eventBarState(event(), dubai("2026-10-18T21:59:59"))).toEqual({ state: "live" });
  });

  it("disappears at the end, inclusive", () => {
    expect(eventBarState(event(), dubai("2026-10-18T22:00:00"))).toEqual({ state: "hidden" });
  });

  it("reads instants, so a UTC evening before a Dubai midnight start is already live", () => {
    const midnight = event({ startsAt: "2026-09-18T00:00:00+04:00" });
    expect(eventBarState(midnight, new Date("2026-09-17T20:00:00Z"))).toEqual({ state: "live" });
    expect(eventBarState(midnight, new Date("2026-09-17T19:59:00Z"))).toMatchObject({ state: "before", minutes: 1 });
  });

  it.each([
    ["switched off", { isVisible: false }],
    ["without a name in one language", { name: { ar: "بطولة", en: "" } }],
    ["without a venue", { venue: { ar: "", en: "" } }],
    ["with a blank label", { label: { ar: " ", en: "Next" } }],
    ["with an unreadable start", { startsAt: "soon" }],
    ["ending before it starts", { endsAt: "2026-10-16T17:59:00+04:00" }],
  ])("is hidden when %s", (_why, overrides) => {
    expect(eventBarState(event(overrides as Partial<NextEventLike>), dubai("2026-10-01T00:00:00"))).toEqual({
      state: "hidden",
    });
  });

  it("is hidden when there is no event at all", () => {
    expect(eventBarState(null, dubai("2026-10-01T00:00:00"))).toEqual({ state: "hidden" });
  });
});

describe("Dubai wall-clock time, in and out", () => {
  it("turns a datetime-local value into the instant it names in Dubai", () => {
    expect(dubaiLocalToIso("2026-10-16T18:00")).toBe("2026-10-16T14:00:00.000Z");
  });

  it("turns an instant back into the Dubai wall-clock value an input shows", () => {
    expect(isoToDubaiLocal("2026-10-16T14:00:00.000Z")).toBe("2026-10-16T18:00");
  });

  it("refuses to invent a value from nothing", () => {
    expect(dubaiLocalToIso("")).toBeNull();
    expect(isoToDubaiLocal("soon")).toBe("");
  });

  it("writes the date and time as each language writes them, Western digits in Arabic", () => {
    expect(formatEventDateTime("2026-10-16T14:00:00.000Z", "en")).toBe("16 October 2026, 18:00");
    expect(formatEventDateTime("2026-10-16T14:00:00.000Z", "ar")).toBe("16 أكتوبر 2026، 18:00");
  });
});
