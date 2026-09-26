import { describe, expect, it } from "vitest";

import {
  ALBUM_PERIODS,
  EMPTY_ALBUM_QUERY,
  activeAlbumFilters,
  albumApiParams,
  albumSearchParams,
  albumsHref,
  hasActiveAlbumFilter,
  nextAlbumQuery,
  readAlbumQuery,
  withoutAlbumFilter,
} from "./album-query";
import type { AlbumQuery } from "./album-query";

/**
 * Every filter round-trips through the address.
 *
 * The archive is server-rendered from the URL, so a filter that is written but
 * not read back — or read under a different name — is a filter that works
 * until the reader presses Back or shares the link, and then silently shows
 * the unfiltered list.
 */

/** A season is a label, en dash and all — the shape `GET /albums/public/facets`
 *  writes and `GET /albums/public?season=` reads back. */
const SEASON = "2025\u20132026";

/** How the address spells it: the dash is percent-encoded, never replaced. */
const SEASON_IN_ADDRESS = "season=2025%E2%80%932026";

const ID = {
  championship: "b".repeat(24),
  competition: "c".repeat(24),
  event: "d".repeat(24),
  athlete: "e".repeat(24),
  club: "f".repeat(24),
};

const NOW = new Date("2026-09-16T14:30:00.000Z");

const full: AlbumQuery = {
  season: SEASON,
  ...ID,
  period: "custom",
  range: { from: "2026-01-01", to: "2026-06-30" },
  q: "100m final",
  page: 3,
};

describe("the period vocabulary", () => {
  it("is the video library's, minus the seven-day window the canvas does not offer", () => {
    expect(ALBUM_PERIODS).toEqual(["any", "last30", "last90", "thisYear", "custom"]);
  });
});

describe("readAlbumQuery / albumSearchParams", () => {
  it("round-trips every filter through the query string", () => {
    const params = albumSearchParams(full);
    expect(readAlbumQuery(params)).toEqual(full);
  });

  it("writes the keys the address promises", () => {
    expect([...albumSearchParams(full).keys()]).toEqual([
      "season",
      "championship",
      "competition",
      "event",
      "athlete",
      "club",
      "period",
      "from",
      "to",
      "q",
      "page",
    ]);
  });

  it("writes nothing for the unfiltered first page", () => {
    expect(albumSearchParams(EMPTY_ALBUM_QUERY).toString()).toBe("");
    expect(albumsHref("/media/albums", EMPTY_ALBUM_QUERY)).toBe("/media/albums");
  });

  it("reads the plain object Next passes as searchParams", () => {
    expect(readAlbumQuery({ season: [SEASON, "x"], page: "2" })).toMatchObject({
      season: SEASON,
      page: 2,
    });
  });

  it("drops a value that cannot name an entity instead of refusing the page", () => {
    expect(readAlbumQuery({ athlete: "not-an-id", club: "<script>" })).toEqual(EMPTY_ALBUM_QUERY);
  });

  it("carries the season as its label, unchanged, through the address", () => {
    const query = { ...EMPTY_ALBUM_QUERY, season: SEASON };
    expect(albumSearchParams(query).toString()).toBe(SEASON_IN_ADDRESS);
    expect(albumsHref("/media/albums", query)).toBe(`/media/albums?${SEASON_IN_ADDRESS}`);
    // Read back from the encoded address, as the server receives it.
    expect(readAlbumQuery(new URLSearchParams(SEASON_IN_ADDRESS)).season).toBe(SEASON);
    expect(readAlbumQuery(albumSearchParams(query))).toEqual(query);
  });

  it("drops a season the API would not recognise, rather than showing a filter it ignores", () => {
    for (const season of ["2025-2026", "2026\u20132025", "2025\u20132027", "a".repeat(24), ""]) {
      expect(readAlbumQuery({ season }).season, season).toBeUndefined();
    }
  });

  it("drops a competition that arrives without its championship", () => {
    expect(readAlbumQuery({ competition: ID.competition }).competition).toBeUndefined();
  });

  it("drops a period this page does not offer", () => {
    expect(readAlbumQuery({ period: "last7" }).period).toBe("any");
  });

  it("reads bare dates as a custom period", () => {
    expect(readAlbumQuery({ from: "2026-01-01" })).toMatchObject({
      period: "custom",
      range: { from: "2026-01-01" },
    });
  });

  it("drops a range that ends before it starts", () => {
    expect(readAlbumQuery({ period: "custom", from: "2026-06-30", to: "2026-01-01" }).range).toEqual({});
  });

  it("drops dates under a named period, which derives its own", () => {
    expect(readAlbumQuery({ period: "last30", from: "2026-01-01" }).range).toEqual({});
  });

  it("ignores a page that is not a positive integer", () => {
    expect(readAlbumQuery({ page: "0" }).page).toBe(1);
    expect(readAlbumQuery({ page: "2.5" }).page).toBe(1);
  });

  it("trims the search and treats blank as none", () => {
    expect(readAlbumQuery({ q: "  relay " }).q).toBe("relay");
    expect(readAlbumQuery({ q: "   " }).q).toBeUndefined();
  });
});

describe("nextAlbumQuery", () => {
  it("returns to page 1 on any narrowing", () => {
    expect(nextAlbumQuery(full, { club: undefined }).page).toBe(1);
  });

  it("keeps the page it was asked to move to", () => {
    expect(nextAlbumQuery(full, { page: 4 }).page).toBe(4);
  });

  it("drops the competition when the championship changes", () => {
    expect(nextAlbumQuery(full, { championship: "9".repeat(24) }).competition).toBeUndefined();
    expect(nextAlbumQuery(full, { championship: undefined }).competition).toBeUndefined();
  });

  it("keeps the competition when something else changes", () => {
    expect(nextAlbumQuery(full, { athlete: undefined }).competition).toBe(ID.competition);
  });

  it("forgets the dates when the period stops being custom", () => {
    expect(nextAlbumQuery(full, { period: "thisYear" }).range).toEqual({});
  });
});

describe("albumApiParams", () => {
  it("asks the API under its own names, with the period made concrete", () => {
    const params = albumApiParams({ ...EMPTY_ALBUM_QUERY, event: ID.event, period: "thisYear" }, 8, NOW);
    expect(Object.fromEntries(params)).toEqual({
      page: "1",
      limit: "8",
      publicEvent: ID.event,
      from: "2026-01-01",
      to: "2026-09-16",
    });
  });

  it("asks the API for the season by the same label the address carries", () => {
    const params = albumApiParams({ ...EMPTY_ALBUM_QUERY, season: SEASON }, 8, NOW);
    expect(params.get("season")).toBe(SEASON);
    expect(params.toString()).toContain(SEASON_IN_ADDRESS);
  });

  it("passes a custom range through unchanged", () => {
    const params = albumApiParams(full, 8, NOW);
    expect(params.get("from")).toBe("2026-01-01");
    expect(params.get("to")).toBe("2026-06-30");
    expect(params.get("q")).toBe("100m final");
    expect(params.get("page")).toBe("3");
  });
});

describe("active filters", () => {
  it("lists each narrowing once, in the bar's order", () => {
    expect(activeAlbumFilters(full).map((filter) => filter.key)).toEqual([
      "season",
      "championship",
      "competition",
      "event",
      "athlete",
      "club",
      "period",
      "q",
    ]);
  });

  it("reports none for the unfiltered archive", () => {
    expect(hasActiveAlbumFilter(EMPTY_ALBUM_QUERY)).toBe(false);
    expect(hasActiveAlbumFilter({ ...EMPTY_ALBUM_QUERY, page: 5 })).toBe(false);
  });

  it("removes exactly one narrowing and returns to page 1", () => {
    const next = withoutAlbumFilter(full, "club");
    expect(next).toEqual({ ...full, club: undefined, page: 1 });
  });

  it("removes the period and its dates together", () => {
    expect(withoutAlbumFilter(full, "period")).toMatchObject({ period: "any", range: {} });
  });

  it("removes a championship's competition with it", () => {
    expect(withoutAlbumFilter(full, "championship").competition).toBeUndefined();
  });
});
