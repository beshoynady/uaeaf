import type { AppLocale } from "@/i18n/routing";
import type {
  AlbumFacetEntry,
  AlbumFacetKey,
  AlbumFacetNames,
  AlbumFacets,
  NamedAlbumFacetKey,
} from "./album-types";
import { isSeasonLabel } from "./season-label";

/**
 * Which filter options exist, decided from the facets alone.
 *
 * The API's facets list only the values some published album actually
 * carries. A filter whose list is empty cannot narrow anything, so it is not
 * drawn — a select whose only option is "all" is a dead control, and one
 * offering invented values would let a reader filter to a list that cannot
 * exist.
 *
 * Seasons are grouped from album dates, so their facet fills as soon as a
 * dated album is published and the season filter is live. The championship,
 * competition and event facets name entities that have no module yet, so
 * there are no names to offer them by and those filters stay hidden.
 */

export interface FacetOption {
  id: string;
  label: string;
  count: number;
}

export type AlbumFilterOptions = Record<AlbumFacetKey, FacetOption[]>;

const NAMED_FACET_KEYS: readonly NamedAlbumFacetKey[] = [
  "championships",
  "competitions",
  "publicEvents",
  "athletes",
  "clubs",
];

/**
 * A season is offered by its own label, in the API's order (newest first,
 * because a reader looking for a season is far likelier to want this one than
 * one from years ago). No name lookup: the label is the name.
 *
 * A label the address would drop is not offered either, so every season a
 * reader can pick survives the round trip through the URL.
 */
const seasonOptions = (entries: readonly AlbumFacetEntry[]): FacetOption[] =>
  entries.flatMap(({ id, count }) =>
    isSeasonLabel(id) && count > 0 ? [{ id, label: id, count }] : [],
  );

const optionsFor = (
  entries: readonly AlbumFacetEntry[],
  names: AlbumFacetNames[NamedAlbumFacetKey],
  locale: AppLocale,
): FacetOption[] =>
  entries.flatMap(({ id, count }) => {
    // An id nobody can name is not offered. The count proves albums carry it;
    // it does not tell a reader what they would be choosing.
    const label = names?.find((entity) => entity.id === id)?.name[locale]?.trim();
    return label && count > 0 ? [{ id, label, count }] : [];
  });

/** Every facet as options — seasons by label, the rest joined with their
 *  names; an empty list means "do not draw". */
export const albumFilterOptions = (
  facets: AlbumFacets,
  names: AlbumFacetNames,
  locale: AppLocale,
): AlbumFilterOptions => {
  const named = Object.fromEntries(
    NAMED_FACET_KEYS.map((key) => [key, optionsFor(facets[key] ?? [], names[key], locale)]),
  ) as Record<NamedAlbumFacetKey, FacetOption[]>;
  return { seasons: seasonOptions(facets.seasons ?? []), ...named };
};

/** Nothing to filter by: an archive with nothing published, or a facets read
 *  that failed. */
export const EMPTY_ALBUM_FACETS: AlbumFacets = {
  seasons: [],
  championships: [],
  competitions: [],
  publicEvents: [],
  athletes: [],
  clubs: [],
};
