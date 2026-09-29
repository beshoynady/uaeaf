import { describe, expect, it } from "vitest";
import {
  badgeOf,
  byNewestStart,
  countInSeason,
  currentPhaseOf,
  isContentLinked,
  noteOf,
  seasonTiming,
} from "./list-filters";
import type { AdminSeason } from "./types";

const season = (overrides: Partial<AdminSeason> = {}): AdminSeason => ({
  id: "1",
  name: { ar: "موسم", en: "Season" },
  shortName: "26/27",
  slug: "2026-2027",
  tagline: null,
  logoId: null,
  bannerId: null,
  shareImageId: null,
  about: { ar: "نبذة", en: "About" },
  closingSummary: null,
  // 1 September 2026 – 31 August 2027, stored as Dubai midnights.
  startDate: "2026-08-31T20:00:00.000Z",
  endDate: "2027-08-30T20:00:00.000Z",
  phases: [],
  keyDates: [],
  calendarDocumentId: null,
  documentIds: [],
  isCurrent: false,
  publicationState: "Published",
  publishedAt: null,
  isVisible: true,
  seo: { metaTitle: null, metaDescription: null, ogImageId: null },
  updatedAt: null,
  ...overrides,
});

describe("seasonTiming — inclusive Dubai days", () => {
  it("runs from the first day's midnight through the whole of the last day", () => {
    expect(seasonTiming(season(), new Date("2026-08-31T20:00:00.000Z"))).toBe("running");
    expect(seasonTiming(season(), new Date("2027-08-31T19:59:59.999Z"))).toBe("running");
    expect(seasonTiming(season(), new Date("2027-08-31T20:00:00.000Z"))).toBe("ended");
    expect(seasonTiming(season(), new Date("2026-08-31T19:59:59.999Z"))).toBe("upcoming");
  });
});

describe("currentPhaseOf", () => {
  const phases: AdminSeason["phases"] = [
    // 1 September – 30 November, then 1 December – 28 February.
    { name: { ar: "إعداد", en: "Prep" }, type: "preparation", from: "2026-08-31T20:00:00.000Z", to: "2026-11-29T20:00:00.000Z" },
    { name: { ar: "داخلي", en: "Domestic" }, type: "domestic", from: "2026-11-30T20:00:00.000Z", to: "2027-02-27T20:00:00.000Z" },
  ];

  it("keeps a phase current through the whole of its last day", () => {
    expect(currentPhaseOf(season({ phases }), new Date("2026-11-30T12:00:00.000Z"))?.type).toBe("preparation");
  });

  it("hands the next midnight to the phase that starts there", () => {
    expect(currentPhaseOf(season({ phases }), new Date("2026-11-30T20:00:00.000Z"))?.type).toBe("domestic");
  });

  it("is null between phases", () => {
    expect(currentPhaseOf(season({ phases }), new Date("2027-05-01T00:00:00.000Z"))).toBeNull();
  });
});

describe("badgeOf and noteOf", () => {
  const now = new Date("2027-10-01T00:00:00.000Z");

  it("puts current above every other state", () => {
    expect(badgeOf(season({ isCurrent: true, isVisible: false, publicationState: "Draft" }))).toBe("current");
  });

  it("names a hidden season as hidden before its draft state", () => {
    expect(badgeOf(season({ isVisible: false, publicationState: "Draft" }))).toBe("hidden");
    expect(badgeOf(season({ publicationState: "Draft" }))).toBe("draft");
    expect(badgeOf(season({ publicationState: "Archived", isVisible: false }))).toBe("archived");
  });

  it("flags a published, ended season whose closing summary is missing", () => {
    expect(noteOf(season(), now)).toEqual({ kind: "closingMissing" });
    expect(noteOf(season({ closingSummary: { ar: "خ", en: "c" } }), now)).toBeNull();
  });

  it("says an unpublished season is not published yet", () => {
    expect(noteOf(season({ publicationState: "Draft" }), now)).toEqual({ kind: "notPublished" });
  });
});

describe("countInSeason — the delete guard's own query", () => {
  it("counts the whole last day in, and the midnight after it out", () => {
    const instants = [
      "2026-08-31T20:00:00.000Z",
      "2027-08-31T12:00:00.000Z",
      "2027-08-31T20:00:00.000Z",
      "2027-01-15T10:00:00.000Z",
      null,
    ];
    expect(countInSeason(season(), instants)).toBe(3);
  });

  it("is unknown, not zero, when the library could not be read", () => {
    expect(countInSeason(season(), null)).toBeNull();
  });
});

describe("isContentLinked", () => {
  it("is true as soon as one count is above zero, even with the other unknown", () => {
    expect(isContentLinked({ albums: 2, videos: null })).toBe(true);
  });

  it("is false only when every count is known to be zero", () => {
    expect(isContentLinked({ albums: 0, videos: 0 })).toBe(false);
    expect(isContentLinked({ albums: 0, videos: null })).toBeNull();
  });
});

describe("byNewestStart", () => {
  it("puts the most recently started season first", () => {
    const older = season({ id: "a", startDate: "2024-09-01T00:00:00.000Z" });
    const newer = season({ id: "b", startDate: "2026-09-01T00:00:00.000Z" });
    expect([older, newer].sort(byNewestStart).map((row) => row.id)).toEqual(["b", "a"]);
  });
});
