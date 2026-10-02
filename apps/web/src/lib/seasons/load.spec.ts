import { afterEach, describe, expect, it, vi } from "vitest";
import type { SeasonPublic } from "./types";

/** The seasons pages' reads. `fetchPublic` is replaced, so these state what is
 *  asked of the API and what a page receives when the API cannot answer. */
const fetchPublic = vi.fn();
vi.mock("@/lib/api/public-client", () => ({
  fetchPublic: (...args: unknown[]) => fetchPublic(...args),
}));

const { fetchCurrentSeasonSlug } = await import("./current-season");
const { loadSeason, loadSeasonArchive, neighboursOf } = await import("./load");

afterEach(() => fetchPublic.mockReset());

const season = (slug: string, startDate: string, isCurrent = false) =>
  ({ slug, startDate, endDate: startDate, isCurrent }) as SeasonPublic;

describe("fetchCurrentSeasonSlug", () => {
  it("answers the current season's slug", async () => {
    fetchPublic.mockResolvedValue({ slug: "2026-2027" });
    await expect(fetchCurrentSeasonSlug()).resolves.toBe("2026-2027");
    expect(fetchPublic).toHaveBeenCalledWith("/seasons/public/current", ["seasons"]);
  });

  it("answers null, never throws, when there is none or the API is down", async () => {
    fetchPublic.mockResolvedValue(null);
    await expect(fetchCurrentSeasonSlug()).resolves.toBeNull();
    fetchPublic.mockRejectedValue(new Error("down"));
    await expect(fetchCurrentSeasonSlug()).resolves.toBeNull();
  });
});

describe("loadSeason", () => {
  it("reads one season by its slug, encoded", async () => {
    fetchPublic.mockResolvedValue(null);
    await expect(loadSeason("a b")).resolves.toBeNull();
    expect(fetchPublic).toHaveBeenCalledWith("/seasons/public/a%20b", ["seasons"]);
  });
});

describe("loadSeasonArchive", () => {
  it("keeps an unreachable archive apart from an empty one", async () => {
    fetchPublic.mockResolvedValue(null);
    await expect(loadSeasonArchive()).resolves.toBeNull();
    fetchPublic.mockResolvedValue([]);
    await expect(loadSeasonArchive()).resolves.toEqual([]);
  });

  it("orders seasons newest first, whatever order they arrive in", async () => {
    fetchPublic.mockResolvedValue([
      season("2024-2025", "2024-08-31T20:00:00.000Z"),
      season("2026-2027", "2026-08-31T20:00:00.000Z"),
      season("2025-2026", "2025-08-31T20:00:00.000Z"),
    ]);
    const archive = await loadSeasonArchive();
    expect(archive?.map((entry) => entry.slug)).toEqual(["2026-2027", "2025-2026", "2024-2025"]);
  });
});

describe("neighboursOf", () => {
  const archive = [
    season("2026-2027", "2026-08-31T20:00:00.000Z"),
    season("2025-2026", "2025-08-31T20:00:00.000Z"),
    season("2024-2025", "2024-08-31T20:00:00.000Z"),
  ];

  it("names the season before and after, in time", () => {
    const { previous, next } = neighboursOf(archive, "2025-2026");
    expect(previous?.slug).toBe("2024-2025");
    expect(next?.slug).toBe("2026-2027");
  });

  it("has no neighbour past either end, or for a season the archive does not list", () => {
    expect(neighboursOf(archive, "2026-2027").next).toBeNull();
    expect(neighboursOf(archive, "2024-2025").previous).toBeNull();
    expect(neighboursOf(archive, "1999-2000")).toEqual({ previous: null, next: null });
  });
});
