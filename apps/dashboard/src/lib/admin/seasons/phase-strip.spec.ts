import { describe, expect, it } from "vitest";
import { phaseLanes } from "./phase-strip";
import { dayAfter, daysIncluded, dayToInstant, nextDay } from "./season-dates";
import { emptyPhase } from "./season-draft";
import type { PhaseDraft } from "./season-draft";

const phase = (type: PhaseDraft["type"], from: string, to: string): PhaseDraft => ({
  ...emptyPhase(),
  nameAr: "م",
  nameEn: "p",
  type,
  from,
  to,
});

describe("inclusive Dubai days", () => {
  it("counts both ends of a range", () => {
    expect(daysIncluded("2026-09-01", "2026-09-01")).toBe(1);
    expect(daysIncluded("2026-09-01", "2027-08-31")).toBe(365);
  });

  it("ends a stored last day at the midnight that starts the next day", () => {
    const lastDay = dayToInstant("2027-08-31") ?? "";
    expect(new Date(dayAfter(lastDay)).toISOString()).toBe("2027-08-31T20:00:00.000Z");
  });

  it("rolls the calendar across months and years", () => {
    expect(nextDay("2026-12-31")).toBe("2027-01-01");
    expect(nextDay("2028-02-28")).toBe("2028-02-29");
  });
});

describe("phaseLanes", () => {
  it("reaches the strip's end with a phase ending on the season's last day", () => {
    const [lane] = phaseLanes("2026-09-01", "2026-09-10", [phase("rest", "2026-09-06", "2026-09-10")]);
    expect(lane.spans[0].startPercent).toBe(50);
    expect(lane.spans[0].widthPercent).toBe(50);
  });

  it("gives a one-day phase a width", () => {
    const [lane] = phaseLanes("2026-09-01", "2026-09-10", [phase("rest", "2026-09-01", "2026-09-01")]);
    expect(lane.spans[0].widthPercent).toBe(10);
  });

  it("puts phases of different types in their own lanes, in the type order", () => {
    const lanes = phaseLanes("2026-09-01", "2027-08-31", [
      phase("domestic", "2026-12-01", "2027-02-28"),
      phase("preparation", "2026-09-01", "2026-11-30"),
      phase("domestic", "2027-03-01", "2027-04-30"),
    ]);
    expect(lanes.map((lane) => [lane.type, lane.spans.length])).toEqual([
      ["preparation", 1],
      ["domestic", 2],
    ]);
  });

  it("leaves out a phase outside the season or not yet complete", () => {
    expect(phaseLanes("2026-09-01", "2027-08-31", [phase("rest", "2027-08-01", "2027-09-15"), phase("", "2026-09-01", "2026-09-02")])).toEqual([]);
  });
});

describe("the phase treatments", () => {
  it("uses the owner's identity tokens, one treatment per type", async () => {
    const { PHASE_TREATMENT } = await import("@/components/admin/seasons/phase-type-chip");
    expect(PHASE_TREATMENT.preparation).toContain("var(--color-neutral-warm-200)");
    expect(PHASE_TREATMENT.preparation).toContain("var(--color-neutral-warm-900)");
    expect(PHASE_TREATMENT.domestic).toContain("var(--color-green-700)");
    expect(PHASE_TREATMENT.international).toContain("var(--color-brand-black)");
    expect(PHASE_TREATMENT.rest).toContain("border-dashed");
    expect(PHASE_TREATMENT.rest).toContain("var(--color-neutral-warm-400)");
    expect(new Set(Object.values(PHASE_TREATMENT)).size).toBe(4);
  });

  it("spends no red on routine chrome (ADR-0050)", async () => {
    const { PHASE_TREATMENT } = await import("@/components/admin/seasons/phase-type-chip");
    for (const treatment of Object.values(PHASE_TREATMENT)) {
      expect(treatment).not.toMatch(/red|brand-secondary|semantic-error/);
    }
  });
});
