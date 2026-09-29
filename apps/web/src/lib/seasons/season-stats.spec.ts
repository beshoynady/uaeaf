import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The counts under a season's hero and on its archive card. `fetchPublic` is
 * replaced, so these state what the site asks the API for without an API.
 */
const fetchPublic = vi.fn();
vi.mock("@/lib/api/public-client", () => ({
  fetchPublic: (...args: unknown[]) => fetchPublic(...args),
}));

const { fetchSeasonStats, seasonLabelOf } = await import("./season-stats");

afterEach(() => fetchPublic.mockReset());

describe("seasonLabelOf", () => {
  it("turns a slug into the label the media filters read", () => {
    expect(seasonLabelOf("2026-2027")).toBe("2026–2027");
  });

  it("refuses a slug the filters could not read, rather than sending it", () => {
    expect(seasonLabelOf("2026-2028")).toBeNull();
    expect(seasonLabelOf("summer-camp")).toBeNull();
  });
});

describe("fetchSeasonStats", () => {
  it("reads the album and video totals for the season's label, and never counts events", async () => {
    fetchPublic.mockImplementation(async (path: string) =>
      path.startsWith("/albums/public") ? { items: [], total: 2 } : { items: [], total: 4 },
    );

    await expect(fetchSeasonStats("2026-2027")).resolves.toEqual({ events: null, albums: 2, videos: 4 });

    const paths = fetchPublic.mock.calls.map(([path]) => path as string);
    expect(paths).toHaveLength(2);
    for (const path of paths) {
      expect(new URLSearchParams(path.split("?")[1]).get("season")).toBe("2026–2027");
    }
    expect(paths.some((path) => path.startsWith("/albums/public?"))).toBe(true);
    expect(paths.some((path) => path.startsWith("/videos/public?"))).toBe(true);
  });

  it("reports a count it could not read as unknown, never as zero", async () => {
    fetchPublic.mockResolvedValue(null);
    await expect(fetchSeasonStats("2026-2027")).resolves.toEqual({ events: null, albums: null, videos: null });
  });

  it("asks nothing for a slug with no media label", async () => {
    await expect(fetchSeasonStats("summer-camp")).resolves.toEqual({ events: null, albums: null, videos: null });
    expect(fetchPublic).not.toHaveBeenCalled();
  });
});
