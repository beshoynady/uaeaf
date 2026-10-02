import { describe, expect, it } from "vitest";
import { toAdminSeason, toAdminSeasonList } from "./to-admin-season";

const raw = (overrides: Record<string, unknown> = {}) => ({
  _id: "66f0a1b2c3d4e5f607182901",
  name: { ar: "موسم 2026–2027", en: "Season 2026–2027" },
  shortName: "26/27",
  slug: "2026-2027",
  tagline: null,
  about: { ar: "نبذة", en: "About" },
  startDate: "2026-08-31T20:00:00.000Z",
  endDate: "2027-08-30T20:00:00.000Z",
  phases: [
    { name: { ar: "الإعداد", en: "Preparation" }, type: "preparation", from: "2026-08-31T20:00:00.000Z", to: "2026-11-29T20:00:00.000Z" },
  ],
  keyDates: [{ title: { ar: "فتح التسجيل", en: "Registration opens" }, date: "2026-09-30T20:00:00.000Z" }],
  documentIds: ["66f0a1b2c3d4e5f607182902"],
  isCurrent: true,
  publicationState: "Live",
  publishDate: "2026-09-15T08:00:00.000Z",
  isVisible: true,
  seo: { metaTitle: null, metaDescription: null, ogImageId: null },
  updatedAt: "2026-09-29T10:00:00.000Z",
  ...overrides,
});

describe("toAdminSeason", () => {
  it("reads the raw document the admin routes answer", () => {
    const season = toAdminSeason(raw());
    expect(season).toMatchObject({
      id: "66f0a1b2c3d4e5f607182901",
      slug: "2026-2027",
      isCurrent: true,
      publicationState: "Live",
      publishDate: "2026-09-15T08:00:00.000Z",
      updatedAt: "2026-09-29T10:00:00.000Z",
    });
    expect(season?.phases).toHaveLength(1);
    expect(season?.keyDates).toHaveLength(1);
  });

  it("drops a row with no usable range rather than drawing it with guessed dates", () => {
    expect(toAdminSeason(raw({ startDate: "not a date" }))).toBeNull();
    expect(toAdminSeason(raw({ _id: undefined }))).toBeNull();
  });

  it("drops a phase of a type the API does not have instead of placing it", () => {
    const season = toAdminSeason(raw({ phases: [{ name: { ar: "س", en: "x" }, type: "offseason", from: "2026-09-01", to: "2026-10-01" }] }));
    expect(season?.phases).toEqual([]);
  });

  it("reads an unknown state — the retired Published among them — as a draft, never as live", () => {
    expect(toAdminSeason(raw({ publicationState: "Published" }))?.publicationState).toBe("Draft");
  });

  it("keeps a taken-down season apart from a draft", () => {
    expect(toAdminSeason(raw({ publicationState: "Unpublished" }))?.publicationState).toBe("Unpublished");
  });

  it("keeps the good rows of a list with a bad one in it", () => {
    expect(toAdminSeasonList([raw(), { nonsense: true }, null])).toHaveLength(1);
    expect(toAdminSeasonList({ not: "a list" })).toEqual([]);
  });
});
