import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The counts under a season's hero and on its archive card. `fetchPublic` is
 * replaced, so these state what the site asks the API for without an API.
 */
const fetchPublic = vi.fn();
vi.mock("@/lib/api/public-client", () => ({
  fetchPublic: (...args: unknown[]) => fetchPublic(...args),
}));

const { fetchSeasonStats, knownCounts, seasonLabelOf } = await import("./season-stats");

afterEach(() => fetchPublic.mockReset());

describe("knownCounts", () => {
  it("keeps the known counts in order, a real zero included, and drops the unknown", () => {
    expect(knownCounts({ events: null, albums: 0, videos: 4 })).toEqual([
      { key: "albums", value: 0 },
      { key: "videos", value: 4 },
    ]);
  });

  it("is empty when no count is known", () => {
    expect(knownCounts({ events: null, albums: null, videos: null })).toEqual([]);
  });
});

describe("seasonLabelOf", () => {
  it("turns a slug into the label the album library reads", () => {
    expect(seasonLabelOf("2026-2027")).toBe("2026–2027");
  });

  it("has no label for a slug that is not a year pair", () => {
    expect(seasonLabelOf("2026-2028")).toBeNull();
    expect(seasonLabelOf("summer-camp")).toBeNull();
  });
});

describe("fetchSeasonStats", () => {
  it("reads the album and video totals by the season's slug, which the API resolves to its own days, and never counts events", async () => {
    fetchPublic.mockImplementation(async (path: string) =>
      path.startsWith("/albums/public") ? { items: [], total: 2 } : { items: [], total: 4 },
    );

    await expect(fetchSeasonStats("2026-2027")).resolves.toEqual({ events: null, albums: 2, videos: 4 });

    const paths = fetchPublic.mock.calls.map(([path]) => path as string);
    expect(paths).toHaveLength(2);
    for (const path of paths) {
      expect(new URLSearchParams(path.split("?")[1]).get("season")).toBe("2026-2027");
    }
    expect(paths.some((path) => path.startsWith("/albums/public?"))).toBe(true);
    expect(paths.some((path) => path.startsWith("/videos/public?"))).toBe(true);
  });

  it("reports a count it could not read as unknown, never as zero", async () => {
    fetchPublic.mockResolvedValue(null);
    await expect(fetchSeasonStats("2026-2027")).resolves.toEqual({ events: null, albums: null, videos: null });
  });

  it("counts a season whose slug is not a year pair, by that slug", async () => {
    fetchPublic.mockResolvedValue({ items: [], total: 1 });

    await expect(fetchSeasonStats("summer-camp")).resolves.toEqual({ events: null, albums: 1, videos: 1 });
    for (const [path] of fetchPublic.mock.calls) {
      expect(new URLSearchParams((path as string).split("?")[1]).get("season")).toBe("summer-camp");
    }
  });
});
