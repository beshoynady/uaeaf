import { describe, expect, it } from "vitest";
import { draftFromSeason, draftProblems, emptyKeyDate, emptyPhase, toCreateBody, toPatchBody } from "./season-draft";
import type { SeasonDraft } from "./season-draft";

const valid = (overrides: Partial<SeasonDraft> = {}): SeasonDraft => ({
  ...draftFromSeason(null),
  nameAr: "موسم 2026–2027",
  nameEn: "Season 2026–2027",
  slug: "2026-2027",
  shortName: "26/27",
  aboutAr: "نبذة",
  aboutEn: "About",
  start: "2026-09-01",
  end: "2027-08-31",
  ...overrides,
});

const phase = (from: string, to: string) => ({
  ...emptyPhase(),
  nameAr: "الإعداد",
  nameEn: "Preparation",
  type: "preparation" as const,
  from,
  to,
});

const codes = (draft: SeasonDraft, creating = true) => draftProblems(draft, creating).map((problem) => problem.code);

describe("draftProblems", () => {
  it("passes a complete draft", () => {
    expect(draftProblems(valid({ phases: [phase("2026-09-01", "2026-11-30")] }), true)).toEqual([]);
  });

  it("refuses a season that ends before it starts", () => {
    expect(codes(valid({ start: "2027-08-31", end: "2027-08-30" }))).toContain("rangeInverted");
  });

  it("accepts a one-day season: the day is both its first and its last", () => {
    expect(codes(valid({ start: "2027-08-31", end: "2027-08-31" }))).toEqual([]);
  });

  it("refuses a real-looking day that does not exist", () => {
    expect(codes(valid({ end: "2027-02-31" }))).toContain("endRequired");
  });

  it("blocks two phases of the same type that share a day, on the later row", () => {
    expect(draftProblems(valid({ phases: [phase("2026-09-01", "2026-11-30"), phase("2026-11-30", "2027-01-31")] }), true)).toEqual([
      { code: "phaseSameTypeOverlap", row: 1 },
    ]);
  });

  it("lets phases of different types run together", () => {
    const registration = { ...phase("2026-10-01", "2026-10-31"), type: "domestic" as const };
    expect(codes(valid({ phases: [phase("2026-09-01", "2026-11-30"), registration] }))).toEqual([]);
  });

  it("lets two same-type phases meet on consecutive days", () => {
    expect(codes(valid({ phases: [phase("2026-09-01", "2026-11-30"), phase("2026-12-01", "2027-01-31")] }))).toEqual([]);
  });

  it("blocks a phase whose end precedes its start, on its own row", () => {
    expect(draftProblems(valid({ phases: [phase("2026-09-01", "2026-11-30"), phase("2026-12-01", "2026-11-01")] }), true)).toEqual([
      { code: "phaseInverted", row: 1 },
    ]);
  });

  it("blocks a phase entirely outside the season", () => {
    expect(draftProblems(valid({ phases: [phase("2028-01-01", "2028-02-01")] }), true)).toEqual([
      { code: "phaseOutsideSeason", row: 0 },
    ]);
  });

  it("blocks a phase that starts inside the season and runs past its end", () => {
    expect(codes(valid({ phases: [phase("2027-07-01", "2027-09-15")] }))).toEqual(["phaseOutsideSeason"]);
  });

  it("accepts a phase ending exactly on the season's last day", () => {
    expect(codes(valid({ phases: [phase("2027-07-01", "2027-08-31")] }))).toEqual([]);
  });

  it("blocks a key date outside the season and an incomplete one", () => {
    const outside = { ...emptyKeyDate(), titleAr: "موعد", titleEn: "Date", date: "2027-09-02" };
    const incomplete = { ...emptyKeyDate(), titleAr: "موعد" };
    expect(draftProblems(valid({ keyDates: [outside, incomplete] }), true)).toEqual([
      { code: "keyDateOutsideSeason", row: 0 },
      { code: "keyDateIncomplete", row: 1 },
    ]);
  });

  it("refuses half a tagline, which the API would refuse as a 400", () => {
    expect(codes(valid({ taglineAr: "شعار" }))).toEqual(["taglinePair"]);
  });

  it("checks the address only when creating", () => {
    expect(codes(valid({ slug: "Not A Slug" }), true)).toEqual(["slugInvalid"]);
    expect(codes(valid({ slug: "Not A Slug" }), false)).toEqual([]);
  });
});

describe("the request bodies", () => {
  it("creates as a draft, with days as Dubai-midnight instants and empty optionals left out", () => {
    const body = toCreateBody(valid({ phases: [phase("2026-09-01", "2026-11-30")] }));
    expect(body).toMatchObject({
      slug: "2026-2027",
      publicationState: "Draft",
      startDate: "2026-08-31T20:00:00.000Z",
      endDate: "2027-08-30T20:00:00.000Z",
    });
    expect(body).not.toHaveProperty("tagline");
    expect(body).not.toHaveProperty("logoId");
    expect((body.phases as { from: string }[])[0].from).toBe("2026-08-31T20:00:00.000Z");
  });

  it("clears an emptied optional on an edit with null, and never sends the address", () => {
    const body = toPatchBody(valid({ bannerId: "", calendarDocumentId: "" }));
    expect(body.bannerId).toBeNull();
    expect(body.calendarDocumentId).toBeNull();
    expect(body.tagline).toBeNull();
    expect(body).not.toHaveProperty("slug");
    expect(body).not.toHaveProperty("publicationState");
  });

  it("leaves an empty search field out, which the API stores as cleared", () => {
    const body = toPatchBody(valid());
    expect(body.seo).toEqual({});
  });
});
