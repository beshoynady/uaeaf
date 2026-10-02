import { describe, expect, it, vi } from "vitest";

const { fetchPublic } = vi.hoisted(() => ({ fetchPublic: vi.fn() }));

vi.mock("@/lib/api/public-client", () => ({ fetchPublic }));

vi.mock("@/lib/api/articles", () => ({
  fetchArticles: vi.fn(async () => {
    throw new Error("upstream down");
  }),
}));

const videoRow = {
  id: "v1",
  title: { ar: "فيديو", en: "Video" },
  category: "championships",
  kind: "video",
  platform: "youtube",
  url: "https://youtube.com/watch?v=1",
  externalId: "1",
  thumbnailId: "thumb-1",
  publishedAt: "2026-09-01T00:00:00.000Z",
  season: null,
  tags: [],
};

vi.mock("@/lib/video/load", () => ({
  loadVideoPage: vi.fn(async () => ({ items: [videoRow], total: 1, page: 1, limit: 1 })),
  loadActiveLiveStream: vi.fn(async () => null),
}));

const { getHeaderFeatures } = await import("./features");

describe("getHeaderFeatures", () => {
  it("a failing source resolves to null for its own field, leaving the others intact", async () => {
    fetchPublic.mockResolvedValue(null);
    const features = await getHeaderFeatures("ar");
    expect(features.presidentExcerpt).toBeNull();
    expect(features.latestArticle).toBeNull();
    expect(features.latestVideo).not.toBeNull();
    expect(features.latestVideo?.title).toBe("فيديو");
  });

  it("never rejects, whatever a source does", async () => {
    fetchPublic.mockRejectedValue(new Error("network down"));
    await expect(getHeaderFeatures("ar")).resolves.toBeTruthy();
  });

  it("sources with no reader yet return null explicitly, not omitted", async () => {
    fetchPublic.mockResolvedValue(null);
    const features = await getHeaderFeatures("ar");
    expect(features).toHaveProperty("nextChampionship", null);
    expect(features).toHaveProperty("nextEvent", null);
    expect(features).toHaveProperty("currentSeasonSummary", null);
  });

  it("reads the president's pull-quote in the requested locale", async () => {
    fetchPublic.mockResolvedValue({ pullQuote: { ar: "اقتباس", en: "A quote" } });
    const features = await getHeaderFeatures("en");
    expect(features.presidentExcerpt).toEqual({ quote: "A quote", href: "/about/president" });
  });

  it("returns null for the president's excerpt when the record has no pull-quote", async () => {
    fetchPublic.mockResolvedValue({ pullQuote: null });
    const features = await getHeaderFeatures("en");
    expect(features.presidentExcerpt).toBeNull();
  });

  describe("seasons", () => {
    /** One public season as `GET /seasons/public` answers it, trimmed to what the picker reads. */
    const season = (slug: string, startDate: string, endDate: string, isCurrent = false) => ({
      slug,
      name: { ar: `موسم ${slug}`, en: `Season ${slug}` },
      shortName: slug.slice(2, 4) + "/" + slug.slice(7, 9),
      startDate,
      endDate,
      isCurrent,
    });

    it("reads every public season, newest first, in the requested locale, with the text a year is found by", async () => {
      fetchPublic.mockImplementation(async (path: string) =>
        path === "/seasons/public"
          ? [
              season("2024-2025", "2024-08-31T20:00:00.000Z", "2025-08-30T20:00:00.000Z"),
              season("2026-2027", "2026-08-31T20:00:00.000Z", "2027-08-30T20:00:00.000Z", true),
              season("2025-2026", "2025-08-31T20:00:00.000Z", "2026-08-30T20:00:00.000Z"),
            ]
          : null,
      );

      const features = await getHeaderFeatures("en");

      expect(features.seasons.map((entry) => entry.slug)).toEqual(["2026-2027", "2025-2026", "2024-2025"]);
      expect(features.seasons[0]).toEqual({
        slug: "2026-2027",
        name: "Season 2026-2027",
        shortName: "26/27",
        isCurrent: true,
        searchText: "2026 2027 26/27 2026-2027",
      });
    });

    it("is an empty list, not null, when the archive cannot be read, and costs no other field", async () => {
      fetchPublic.mockImplementation(async (path: string) =>
        path === "/seasons/public" ? null : { pullQuote: { ar: "اقتباس", en: "A quote" } },
      );

      const features = await getHeaderFeatures("ar");

      expect(features.seasons).toEqual([]);
      expect(features.presidentExcerpt?.quote).toBe("اقتباس");
      expect(features.latestVideo?.title).toBe("فيديو");
    });

    it("is an empty list when reading the archive throws", async () => {
      fetchPublic.mockRejectedValue(new Error("network down"));
      await expect(getHeaderFeatures("ar")).resolves.toMatchObject({ seasons: [] });
    });
  });
});
