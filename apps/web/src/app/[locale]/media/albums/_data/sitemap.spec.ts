import { afterEach, describe, expect, it, vi } from "vitest";

const fetchPublic = vi.fn();
vi.mock("@/lib/api/public-client", () => ({
  fetchPublic: (...args: unknown[]) => fetchPublic(...args),
}));

const { albumSitemapEntries } = await import("./sitemap");

afterEach(() => fetchPublic.mockReset());

describe("albumSitemapEntries", () => {
  it("lists every published album in both languages, reading every page of the archive", async () => {
    fetchPublic.mockImplementation(async (path: string) =>
      path.includes("page=1")
        ? {
            items: [{ slug: "one", publishedAt: "2026-03-14T00:00:00.000Z" }],
            total: 49,
            page: 1,
            limit: 48,
          }
        : {
            items: [{ slug: "two", publishedAt: null }],
            total: 49,
            page: 2,
            limit: 48,
          },
    );

    const entries = await albumSitemapEntries();

    expect(fetchPublic).toHaveBeenCalledTimes(2);
    expect(entries.map((entry) => entry.url)).toEqual([
      expect.stringMatching(/\/ar\/media\/albums\/one$/),
      expect.stringMatching(/\/en\/media\/albums\/one$/),
      expect.stringMatching(/\/ar\/media\/albums\/two$/),
      expect.stringMatching(/\/en\/media\/albums\/two$/),
    ]);
    // The publication date, never "now"; nothing at all where there is none.
    expect(entries[0].lastModified).toEqual(
      new Date("2026-03-14T00:00:00.000Z"),
    );
    expect(entries[2]).not.toHaveProperty("lastModified");
  });

  it("is empty when the archive cannot be read", async () => {
    fetchPublic.mockResolvedValue(null);

    expect(await albumSitemapEntries()).toEqual([]);
  });
});
