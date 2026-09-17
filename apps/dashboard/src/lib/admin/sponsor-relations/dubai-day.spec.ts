import { describe, expect, it } from "vitest";
import { dubaiDayEndIso, dubaiDayStartIso, isDayString, isoToDubaiDay } from "./dubai-day";

/**
 * The contract dates an editor types (ADR-0077 D2, ADR-0085 D1): calendar days
 * in Dubai, stored as the instants that bound them. A start is Dubai midnight;
 * an end is the last second of its Dubai day, so the day it names is included.
 */
describe("Dubai calendar days", () => {
  it("stores a start day as Dubai midnight", () => {
    expect(dubaiDayStartIso("2026-09-01")).toBe("2026-08-31T20:00:00.000Z");
  });

  it("stores an end day as its last second in Dubai", () => {
    expect(dubaiDayEndIso("2027-08-31")).toBe("2027-08-31T19:59:59.000Z");
  });

  it("reads a stored instant back as the Dubai day it falls on", () => {
    expect(isoToDubaiDay("2026-08-31T20:00:00.000Z")).toBe("2026-09-01");
    expect(isoToDubaiDay("2027-08-31T19:59:59.000Z")).toBe("2027-08-31");
    expect(isoToDubaiDay("2026-08-31T19:59:59.000Z")).toBe("2026-08-31");
  });

  it("round-trips a typed day through storage", () => {
    expect(isoToDubaiDay(dubaiDayStartIso("2024-02-29"))).toBe("2024-02-29");
    expect(isoToDubaiDay(dubaiDayEndIso("2024-02-29"))).toBe("2024-02-29");
  });

  it("answers empty for an empty or unreadable value", () => {
    expect(isoToDubaiDay(null)).toBe("");
    expect(isoToDubaiDay("not a date")).toBe("");
    expect(dubaiDayStartIso("")).toBeNull();
    expect(dubaiDayEndIso("2026-13-40")).toBeNull();
  });

  it("recognises a day string", () => {
    expect(isDayString("2026-09-01")).toBe(true);
    expect(isDayString("2026-9-1")).toBe(false);
    expect(isDayString("2026-02-30")).toBe(false);
  });
});
