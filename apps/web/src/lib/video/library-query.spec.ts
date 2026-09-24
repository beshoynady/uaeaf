import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  apiQuery,
  libraryHref,
  periodRange,
  readLibraryQuery,
  readVideoParam,
  videoHref,
} from "./library-query";
import type { LibraryQuery } from "./library-query";

/**
 * The library's filters round-trip through the URL.
 *
 * The property being held is the one `feed-query.spec.ts` holds for the
 * newsroom: changing one filter keeps the others. Three controls write this
 * address — the tabs, the search field and the filter panel — and each copy of
 * "carry the rest untouched" is a chance for one of them to drop a filter
 * somebody set. The failure is silent: the reader simply finds themselves
 * looking at a library they did not ask for.
 */

// A Wednesday, mid-month, mid-year, so every boundary below is visibly
// different from the date itself rather than accidentally equal to it.
const NOW = new Date("2026-09-16T14:30:00.000Z");

const base: LibraryQuery = { kind: "all", period: "any", range: {}, page: 1 };

describe("readLibraryQuery", () => {
  it("reads an address with no parameters as the whole library", () => {
    expect(readLibraryQuery({})).toEqual(base);
  });

  it("reads every filter it recognises", () => {
    expect(
      readLibraryQuery({
        kind: "reel",
        platform: "tiktok",
        category: "championships",
        season: "2025-2026",
        search: " 100m ",
        period: "last30",
        page: "3",
      }),
    ).toEqual({
      kind: "reel",
      platform: "tiktok",
      category: "championships",
      season: "2025-2026",
      search: "100m",
      period: "last30",
      range: {},
      page: 3,
    });
  });

  it("drops a value no enum holds rather than refusing the page", () => {
    // A stale or hand-edited link shows the library, not an error. The API
    // makes the same choice for `season` and the date bounds.
    const query = readLibraryQuery({ kind: "vertical", platform: "myspace", category: "gossip" });

    expect(query.kind).toBe("all");
    expect(query.platform).toBeUndefined();
    expect(query.category).toBeUndefined();
  });

  it("infers the custom period from a bare from/to pair", () => {
    // So a link written by hand, or one from before the period parameter
    // existed, still shows the window it asks for.
    const query = readLibraryQuery({ from: "2026-03-01", to: "2026-03-31" });

    expect(query.period).toBe("custom");
    expect(query.range).toEqual({ from: "2026-03-01", to: "2026-03-31" });
  });

  it("ignores a custom range that closes before it opens", () => {
    // Mirroring the server, which refuses it. A control stricter than the API
    // would refuse what the API accepts; a looser one would send a 400.
    expect(readLibraryQuery({ period: "custom", from: "2026-05-01", to: "2026-04-01" }).range).toEqual({});
  });

  it("reads a nonsense page as page one", () => {
    expect(readLibraryQuery({ page: "0" }).page).toBe(1);
    expect(readLibraryQuery({ page: "-4" }).page).toBe(1);
    expect(readLibraryQuery({ page: "two" }).page).toBe(1);
  });
});

describe("libraryHref", () => {
  it("writes the library's own address for no filters at all", () => {
    expect(libraryHref(base)).toBe("/media/videos");
  });

  it("keeps every other filter when one changes", () => {
    const current: LibraryQuery = { ...base, kind: "video", platform: "youtube", search: "100m" };
    const href = libraryHref(current, { category: "interviews" });

    expect(href).toContain("kind=video");
    expect(href).toContain("platform=youtube");
    expect(href).toContain("search=100m");
    expect(href).toContain("category=interviews");
  });

  it("returns to page one on a filter change, and only a page move keeps it", () => {
    // Page 4 of an unfiltered library is usually past the end of one platform.
    expect(libraryHref({ ...base, page: 4 }, { platform: "tiktok" })).not.toContain("page=");
    expect(libraryHref({ ...base, page: 4 }, { page: 5 })).toContain("page=5");
  });

  it("never writes page=1", () => {
    // One view with two addresses is two URLs a search engine has to choose
    // between and two history entries the back button has to walk.
    expect(libraryHref({ ...base, page: 1 })).toBe("/media/videos");
  });

  it("writes the from/to pair only while the period is custom", () => {
    const custom: LibraryQuery = { ...base, period: "custom", range: { from: "2026-03-01", to: "2026-03-31" } };
    expect(libraryHref(custom)).toContain("from=2026-03-01");

    // A reader who picks "last 30 days" after a custom range does not keep the
    // old bounds hanging off the address, describing nothing.
    expect(libraryHref(custom, { period: "last30" })).not.toContain("from=");
  });
});

describe("periodRange", () => {
  it("counts the rolling windows back from today", () => {
    expect(periodRange("last7", {}, NOW)).toEqual({ from: "2026-09-09", to: "2026-09-16" });
    expect(periodRange("last30", {}, NOW)).toEqual({ from: "2026-08-17", to: "2026-09-16" });
    expect(periodRange("last90", {}, NOW)).toEqual({ from: "2026-06-18", to: "2026-09-16" });
  });

  it("takes this year from the shared calendar function", () => {
    expect(periodRange("thisYear", {}, NOW)).toEqual({ from: "2026-01-01", to: "2026-09-16" });
  });

  it("is no window at all for any time", () => {
    expect(periodRange("any", { from: "2026-01-01" }, NOW)).toEqual({});
  });

  it("never ends in the future", () => {
    // A window running past today would include days nothing can have been
    // published on, and a reader reads the empty tail as the federation having
    // stopped publishing.
    for (const period of ["last7", "last30", "last90", "thisYear"] as const) {
      expect(periodRange(period, {}, NOW).to).toBe("2026-09-16");
    }
  });
});

describe("activeFilterCount", () => {
  it("counts nothing for the whole library", () => {
    expect(activeFilterCount(base)).toBe(0);
  });

  it("does not count the tab or the page", () => {
    // The tab is a view the reader can see they are on, and a page is not a
    // narrowing. Counting either would put a badge on the Filter button of a
    // reader who has set no filters.
    expect(activeFilterCount({ ...base, kind: "reel", page: 3 })).toBe(0);
  });

  it("counts each filter once, the period included", () => {
    expect(activeFilterCount({ ...base, platform: "youtube", category: "events", period: "last7" })).toBe(3);
  });
});

describe("apiQuery", () => {
  it("resolves the period into the from/to pair the API takes", () => {
    const query = apiQuery({ ...base, period: "last7" }, 12, NOW);

    expect(query).toContain("from=2026-09-09");
    expect(query).toContain("to=2026-09-16");
    // The period name itself means nothing upstream.
    expect(query).not.toContain("period=");
  });

  it("always sends the page and the limit", () => {
    const query = apiQuery({ ...base, page: 2 }, 12, NOW);

    expect(query).toContain("page=2");
    expect(query).toContain("limit=12");
  });

  it("omits the kind for the all tab", () => {
    // `kind=all` is not a value the API's enum holds: it would be a 400.
    expect(apiQuery(base, 12, NOW)).not.toContain("kind=");
    expect(apiQuery({ ...base, kind: "reel" }, 12, NOW)).toContain("kind=reel");
  });
});

/**
 * One video's own address.
 *
 * The property: a link to a video carries the filters the reader had set, so
 * "reels from TikTok, this one" survives being sent to someone else. And the
 * player's own parameter is never a filter — changing a filter closes it.
 */
describe("readVideoParam", () => {
  it("reads a well-formed id", () => {
    expect(readVideoParam({ video: "6ab42297b8010ed304b0bf5d" })).toBe("6ab42297b8010ed304b0bf5d");
  });

  it("ignores anything that is not an id, rather than erroring", () => {
    // A hand-edited or truncated link opens the library, not an error page.
    expect(readVideoParam({ video: "not-an-id" })).toBeUndefined();
    expect(readVideoParam({ video: "" })).toBeUndefined();
    expect(readVideoParam({})).toBeUndefined();
  });

  it("takes the first of a repeated parameter", () => {
    expect(readVideoParam({ video: ["6ab42297b8010ed304b0bf5d", "6ab42297b8010ed304b0bf5e"] })).toBe(
      "6ab42297b8010ed304b0bf5d",
    );
  });
});

describe("videoHref", () => {
  const ID = "6ab42297b8010ed304b0bf5d";

  it("adds the video to the library's bare address", () => {
    expect(videoHref(base, ID)).toBe(`/media/videos?video=${ID}`);
  });

  it("carries every filter the reader had set", () => {
    const filtered: LibraryQuery = { ...base, kind: "reel", platform: "tiktok", search: "100m", page: 2 };
    const href = videoHref(filtered, ID);

    expect(href).toContain("kind=reel");
    expect(href).toContain("platform=tiktok");
    expect(href).toContain("search=100m");
    // The page matters: the video is only in the list because the reader
    // pressed "show more" to reach it.
    expect(href).toContain("page=2");
    expect(href).toContain(`video=${ID}`);
  });

  it("writes the same address without the video when there is none", () => {
    // What closing the player writes back — the view, unchanged, minus the
    // one video.
    const filtered: LibraryQuery = { ...base, platform: "youtube" };

    expect(videoHref(filtered, null)).toBe(libraryHref(filtered));
    expect(videoHref(filtered, null)).not.toContain("video=");
  });

  it("round-trips: the address it writes is one readVideoParam reads back", () => {
    const href = videoHref({ ...base, category: "interviews" }, ID);
    const params = Object.fromEntries(new URLSearchParams(href.split("?")[1]));

    expect(readVideoParam(params)).toBe(ID);
    expect(readLibraryQuery(params).category).toBe("interviews");
  });

  it("is dropped by an ordinary filter change", () => {
    // `libraryHref` never writes it, so changing a filter under an open
    // player leaves no dialog pointing at a video that is no longer listed.
    expect(libraryHref(base, { platform: "youtube" })).not.toContain("video=");
  });
});
