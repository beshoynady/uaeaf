import { describe, expect, it } from "vitest";
import { draftFromAlbum, draftProblems, toCreateBody, toPatchBody } from "./album-draft";
import type { AdminAlbum } from "./types";

const stored = (overrides: Partial<AdminAlbum> = {}): AdminAlbum => ({
  id: "66f0a1b2c3d4e5f607182901",
  title: { ar: "بطولة الإمارات", en: "UAE Championship" },
  slug: "uae-championship",
  description: null,
  seasonId: null,
  championshipId: null,
  competitionId: null,
  publicEventId: null,
  athleteIds: [],
  clubIds: [],
  eventDate: "2026-03-14T00:00:00.000Z",
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

describe("draftProblems", () => {
  it("asks for both title halves, because LocalizedTextDto refuses an empty one", () => {
    const draft = { ...draftFromAlbum(null), slug: "ok" };
    expect(draftProblems(draft, null)).toEqual(["titleArRequired", "titleEnRequired"]);
  });

  it("asks for a lowercase hyphenated address on a new album only", () => {
    const draft = { ...draftFromAlbum(null), titleAr: "أ", titleEn: "A", slug: "Not A Slug" };
    expect(draftProblems(draft, null)).toContain("slugInvalid");
    // The address cannot change after creation, so it is not judged on an edit.
    expect(draftProblems({ ...draftFromAlbum(stored()), slug: "Whatever" }, stored())).not.toContain("slugInvalid");
  });

  it("treats every optional pair as both-or-neither", () => {
    const draft = { ...draftFromAlbum(stored()), descriptionAr: "وصف", locationEn: "Dubai", championshipNameAr: "بطولة" };
    expect(draftProblems(draft, stored())).toEqual(["descriptionPair", "locationPair", "championshipNamePair"]);
  });

  it("refuses to empty a stored description or championship name, which the API cannot clear", () => {
    const album = stored({ description: { ar: "و", en: "d" }, championshipName: { ar: "ب", en: "c" } });
    const draft = { ...draftFromAlbum(album), descriptionAr: "", descriptionEn: "", championshipNameAr: "", championshipNameEn: "" };
    expect(draftProblems(draft, album)).toEqual(["descriptionCannotClear", "championshipNameCannotClear"]);
  });

  it("lets a stored location be emptied: the API accepts null for it", () => {
    const album = stored({ location: { ar: "دبي", en: "Dubai" } });
    const draft = { ...draftFromAlbum(album), locationAr: "", locationEn: "" };
    expect(draftProblems(draft, album)).toEqual([]);
  });

  it("carries the affiliation rules after the field problems", () => {
    const draft = { ...draftFromAlbum(stored()), titleAr: "" };
    draft.affiliation = { ...draft.affiliation, championshipId: "66f0a1b2c3d4e5f607182902" };
    expect(draftProblems(draft, stored())).toEqual(["titleArRequired", "championshipNeedsSeason"]);
  });
});

describe("toCreateBody", () => {
  it("never asks the create for Published — that is the separate publish call", () => {
    const draft = { ...draftFromAlbum(null), titleAr: "أ", titleEn: "A", slug: "a", state: "Published" as const };
    expect(toCreateBody(draft).publicationState).toBe("Draft");
    expect(toCreateBody({ ...draft, state: "Archived" }).publicationState).toBe("Archived");
  });

  it("leaves optional fields absent rather than null: the create DTO does not accept null", () => {
    const body = toCreateBody({ ...draftFromAlbum(null), titleAr: "أ", titleEn: "A", slug: "a" });
    expect(body).toEqual({
      title: { ar: "أ", en: "A" },
      slug: "a",
      displayOrder: 0,
      publicationState: "Draft",
      athleteIds: [],
      clubIds: [],
    });
  });

  it("stores the chosen day as midnight UTC, so it reads the same day in every zone", () => {
    const body = toCreateBody({ ...draftFromAlbum(null), titleAr: "أ", titleEn: "A", slug: "a", eventDate: "2026-03-14" });
    expect(body.eventDate).toBe("2026-03-14T00:00:00.000Z");
  });
});

describe("toPatchBody", () => {
  it("clears the clearable fields with null and never sends the address or the state", () => {
    const album = stored({ location: { ar: "دبي", en: "Dubai" } });
    const body = toPatchBody({ ...draftFromAlbum(album), locationAr: "", locationEn: "", eventDate: "" });
    expect(body.location).toBeNull();
    expect(body.eventDate).toBeNull();
    expect(body).not.toHaveProperty("slug");
    expect(body).not.toHaveProperty("publicationState");
    expect(body.seasonId).toBeNull();
  });
});
