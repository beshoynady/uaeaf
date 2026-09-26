import { describe, expect, it } from "vitest";
import { AFFILIATION_MODULES_BUILT, affiliationProblems, pickerLock } from "./affiliation";
import type { Affiliation } from "./types";

/**
 * The form states the API's four affiliation rules before a save, so the
 * editor meets them beside the field instead of as a refused 422.
 */
const ID = (n: number) => `66f0a1b2c3d4e5f6071829${String(n).padStart(2, "0")}`;
const none: Affiliation = { seasonId: null, championshipId: null, competitionId: null, publicEventId: null };

describe("affiliationProblems — the API's assertAffiliationShape, mirrored", () => {
  it("accepts an album that sits nowhere: an administrative activity", () => {
    expect(affiliationProblems(none)).toEqual([]);
  });

  it("accepts each coherent branch", () => {
    expect(affiliationProblems({ ...none, seasonId: ID(1) })).toEqual([]);
    expect(affiliationProblems({ ...none, seasonId: ID(1), championshipId: ID(2), competitionId: ID(3) })).toEqual([]);
    expect(affiliationProblems({ ...none, seasonId: ID(1), publicEventId: ID(4) })).toEqual([]);
  });

  it("refuses a championship without a season", () => {
    expect(affiliationProblems({ ...none, championshipId: ID(2) })).toEqual(["championshipNeedsSeason"]);
  });

  it("refuses a public event without a season", () => {
    expect(affiliationProblems({ ...none, publicEventId: ID(4) })).toEqual(["publicEventNeedsSeason"]);
  });

  it("refuses a competition without a championship", () => {
    expect(affiliationProblems({ ...none, seasonId: ID(1), competitionId: ID(3) })).toEqual([
      "competitionNeedsChampionship",
    ]);
  });

  it("refuses a championship and a public event together, first — the API checks that one first", () => {
    const problems = affiliationProblems({ ...none, championshipId: ID(2), publicEventId: ID(4) });
    expect(problems[0]).toBe("championshipOrPublicEvent");
    expect(problems).toContain("championshipNeedsSeason");
    expect(problems).toContain("publicEventNeedsSeason");
  });
});

describe("pickerLock", () => {
  it("locks every picker while the four modules are not built", () => {
    expect(AFFILIATION_MODULES_BUILT).toBe(false);
    for (const key of ["seasonId", "championshipId", "competitionId", "publicEventId"] as const) {
      expect(pickerLock(none, key)).toBe("moduleMissing");
    }
  });

  it("once built, asks for the parent before the child", () => {
    expect(pickerLock(none, "seasonId", true)).toBeNull();
    expect(pickerLock(none, "championshipId", true)).toBe("needsSeason");
    expect(pickerLock(none, "publicEventId", true)).toBe("needsSeason");
    expect(pickerLock({ ...none, seasonId: ID(1) }, "competitionId", true)).toBe("needsChampionship");
  });

  it("once built, locks each branch while the other is chosen", () => {
    expect(pickerLock({ ...none, seasonId: ID(1), publicEventId: ID(4) }, "championshipId", true)).toBe(
      "exclusiveWithPublicEvent",
    );
    expect(pickerLock({ ...none, seasonId: ID(1), championshipId: ID(2) }, "publicEventId", true)).toBe(
      "exclusiveWithChampionship",
    );
  });

  it("never locks a picker that holds a value, so an incoherent value can still be cleared", () => {
    // Season cleared under a stored championship: the championship picker
    // must stay open, or the one move that fixes the problem is unreachable.
    expect(pickerLock({ ...none, championshipId: ID(2) }, "championshipId", true)).toBeNull();
  });
});
