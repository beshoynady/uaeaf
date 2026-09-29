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
});
