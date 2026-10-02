import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `/seasons` meets Chapter 14 §11's content threshold the moment one season is
 * published, and not before: an empty archive stays out of the index and the
 * sitemap together.
 */
const fetchPublic = vi.fn();
vi.mock("@/lib/api/public-client", () => ({
  fetchPublic: (path: string) => fetchPublic(path) as unknown,
}));

const { isIndexable } = await import("./indexability");
const { PUBLIC_PAGES } = await import("./public-pages");

const SEASONS = PUBLIC_PAGES.find((page) => page.key === "seasons")!;

beforeEach(() => fetchPublic.mockReset());

describe("the seasons archive's indexability", () => {
  it("is registered as a public collection page reading the public list", () => {
    expect(SEASONS).toMatchObject({ route: "/seasons", schemaType: "CollectionPage", listEndpoint: "/seasons/public" });
  });

  it("is indexable once a season is published", async () => {
    fetchPublic.mockResolvedValue([{ slug: "2026-2027" }]);
    await expect(isIndexable(SEASONS)).resolves.toBe(true);
  });

  it("is held back while nothing is published, or while the API cannot say", async () => {
    fetchPublic.mockResolvedValue([]);
    await expect(isIndexable(SEASONS)).resolves.toBe(false);
    fetchPublic.mockResolvedValue(null);
    await expect(isIndexable(SEASONS)).resolves.toBe(false);
  });
});
