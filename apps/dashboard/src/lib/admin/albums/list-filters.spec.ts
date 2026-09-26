import { describe, expect, it } from "vitest";
import { affiliationKind, byNewestOccasion, isFiltering, matchesFilters, NO_FILTERS, periodsOf } from "./list-filters";
import type { AdminAlbum } from "./types";

const album = (overrides: Partial<AdminAlbum>): AdminAlbum => ({
  id: "a",
  title: { ar: "ألبوم", en: "Album" },
  slug: "album",
  description: null,
  seasonId: null,
  championshipId: null,
  competitionId: null,
  publicEventId: null,
  athleteIds: [],
  clubIds: [],
  eventDate: null,
  location: null,
  isFeatured: false,
  championshipName: null,
  coverImageId: null,
  displayOrder: 0,
  publicationState: "Draft",
  tags: [],
  assetCount: 0,
  publishedAt: null,
  ...overrides,
});

describe("matchesFilters", () => {
  const dubai = album({ title: { ar: "ماراثون دبي", en: "Dubai Marathon" }, slug: "dubai-marathon", eventDate: "2026-01-10T00:00:00.000Z", seasonId: "s", publicationState: "Published" });
  const board = album({ title: { ar: "اجتماع المجلس", en: "Board meeting" }, eventDate: "2025-05-01T00:00:00.000Z" });

  it("searches both languages and the address", () => {
    expect(matchesFilters(dubai, { ...NO_FILTERS, search: "ماراثون" })).toBe(true);
    expect(matchesFilters(dubai, { ...NO_FILTERS, search: "marathon" })).toBe(true);
    expect(matchesFilters(dubai, { ...NO_FILTERS, search: "dubai-mar" })).toBe(true);
    expect(matchesFilters(board, { ...NO_FILTERS, search: "marathon" })).toBe(false);
  });

  it("narrows by state, by year of the occasion, and to albums with no season", () => {
    expect(matchesFilters(dubai, { ...NO_FILTERS, state: "Draft" })).toBe(false);
    expect(matchesFilters(board, { ...NO_FILTERS, period: "2025" })).toBe(true);
    expect(matchesFilters(dubai, { ...NO_FILTERS, period: "2025" })).toBe(false);
    expect(matchesFilters(dubai, { ...NO_FILTERS, noSeason: true })).toBe(false);
    expect(matchesFilters(board, { ...NO_FILTERS, noSeason: true })).toBe(true);
  });

  it("knows when anything is narrowing the list", () => {
    expect(isFiltering(NO_FILTERS)).toBe(false);
    expect(isFiltering({ ...NO_FILTERS, noSeason: true })).toBe(true);
  });
});

describe("periodsOf", () => {
  it("offers only years that hold an album, newest first", () => {
    const albums = [
      album({ eventDate: "2024-02-01T00:00:00.000Z" }),
      album({ eventDate: "2026-02-01T00:00:00.000Z" }),
      album({ eventDate: "2026-09-01T00:00:00.000Z" }),
      album({ eventDate: null }),
    ];
    expect(periodsOf(albums)).toEqual(["2026", "2024"]);
  });
});

describe("byNewestOccasion", () => {
  it("puts the newest first and the undated last", () => {
    const rows = [
      album({ id: "undated" }),
      album({ id: "old", eventDate: "2024-01-01T00:00:00.000Z" }),
      album({ id: "new", eventDate: "2026-01-01T00:00:00.000Z" }),
    ];
    expect(rows.sort(byNewestOccasion).map((row) => row.id)).toEqual(["new", "old", "undated"]);
  });
});

describe("affiliationKind", () => {
  it("names the deepest level recorded", () => {
    expect(affiliationKind(album({}))).toBe("none");
    expect(affiliationKind(album({ seasonId: "s" }))).toBe("season");
    expect(affiliationKind(album({ seasonId: "s", publicEventId: "p" }))).toBe("publicEvent");
    expect(affiliationKind(album({ championshipName: { ar: "ب", en: "C" } }))).toBe("championship");
  });
});
