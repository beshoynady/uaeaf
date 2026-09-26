import type { AdminAlbum, AlbumState } from "./types";

/**
 * The albums list's filters, sort and affiliation label.
 *
 * Pure and client-side, for the reason the videos list gives: the admin
 * `GET /albums` returns every album in one answer, and an editor narrowing a
 * working list is not sharing an address, so none of this is in the URL.
 */
export interface AlbumFilters {
  search: string;
  state: "all" | AlbumState;
  /** A year of `eventDate`, or "all". */
  period: string;
  /** Only the albums that sit in no season — an administrative activity, or
   *  one whose season has not been recorded yet. */
  noSeason: boolean;
}

export const NO_FILTERS: AlbumFilters = { search: "", state: "all", period: "all", noSeason: false };

export const isFiltering = (filters: AlbumFilters): boolean =>
  filters.search.trim() !== "" || filters.state !== "all" || filters.period !== "all" || filters.noSeason;

const yearOf = (instant: string | null): string | null => (instant ? instant.slice(0, 4) : null);

export const matchesFilters = (album: AdminAlbum, filters: AlbumFilters): boolean => {
  if (filters.state !== "all" && album.publicationState !== filters.state) return false;
  if (filters.period !== "all" && yearOf(album.eventDate) !== filters.period) return false;
  if (filters.noSeason && album.seasonId !== null) return false;

  const needle = filters.search.trim().toLowerCase();
  if (needle === "") return true;
  return `${album.title.ar} ${album.title.en} ${album.slug}`.toLowerCase().includes(needle);
};

/** The years the period filter offers: only those an album actually has, newest
 *  first. A year with nothing in it would be a filter that always empties the
 *  list. */
export const periodsOf = (albums: readonly AdminAlbum[]): string[] =>
  [...new Set(albums.flatMap((album) => yearOf(album.eventDate) ?? []))].sort((a, b) => b.localeCompare(a));

/**
 * Newest occasion first. Albums with no date sort after every dated one — not
 * before, which is where a naive compare puts `null` — and the title breaks a
 * tie, so the order is the same on every read.
 *
 * Exported because whoever pages the list has to apply it BEFORE slicing, for
 * the reason `byNewest` in the video table records.
 */
export const byNewestOccasion = (a: AdminAlbum, b: AdminAlbum): number => {
  if (a.eventDate !== b.eventDate) {
    if (!a.eventDate) return 1;
    if (!b.eventDate) return -1;
    return Date.parse(b.eventDate) - Date.parse(a.eventDate);
  }
  return a.title.ar.localeCompare(b.title.ar);
};

/**
 * What the affiliation chip says about an album.
 *
 * The deepest level recorded wins, because it is the most specific thing
 * known. `championshipName` is the one affiliation text that exists today —
 * the championships collection does not, so an id alone cannot be named.
 */
export type AffiliationKind = "championship" | "publicEvent" | "season" | "none";

export const affiliationKind = (album: AdminAlbum): AffiliationKind => {
  if (album.championshipId || album.championshipName) return "championship";
  if (album.publicEventId) return "publicEvent";
  if (album.seasonId) return "season";
  return "none";
};
