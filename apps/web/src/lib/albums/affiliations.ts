import type { AppLocale } from "@/i18n/routing";
import type { AlbumListItem, NamedEntity } from "./album-types";

/**
 * What occasion an album belongs to, as the chips name it.
 *
 * Three kinds, and the kind is information rather than decoration: the chip's
 * colour is chosen from it, so the kind has to be known before anything is
 * drawn. A name is never invented — an affiliation whose name cannot be
 * resolved is left out, because a chip reading as a raw id says nothing and a
 * guessed label says something false.
 */
export type AffiliationKind = "championship" | "competition" | "publicEvent";

export interface AlbumAffiliation {
  kind: AffiliationKind;
  id: string;
  label: string;
  /** The entity's own page. Only a chip outside a card link may use it. */
  href?: string;
}

/**
 * Names for the ids an album carries.
 *
 * The championship is named on the album itself (`championshipName`, captured
 * because no championship entity exists yet); a competition and a public
 * event have no name on the record, so their names come from here once those
 * entities ship.
 */
export interface AffiliationNames {
  championships?: readonly NamedEntity[];
  competitions?: readonly NamedEntity[];
  publicEvents?: readonly NamedEntity[];
}

type Affiliated = Pick<
  AlbumListItem,
  "championshipId" | "competitionId" | "publicEventId" | "championshipName"
>;

const nameIn = (list: readonly NamedEntity[] | undefined, id: string, locale: AppLocale) =>
  list?.find((entity) => entity.id === id)?.name[locale]?.trim() || undefined;

/**
 * An album's affiliations, broadest first: championship, then the competition
 * inside it; or the public event, which excludes a championship upstream.
 */
export const albumAffiliations = (
  album: Affiliated,
  locale: AppLocale,
  names: AffiliationNames = {},
): AlbumAffiliation[] => {
  const found: AlbumAffiliation[] = [];

  if (album.championshipId) {
    const label =
      album.championshipName?.[locale]?.trim() ||
      nameIn(names.championships, album.championshipId, locale);
    if (label) found.push({ kind: "championship", id: album.championshipId, label });
  }
  if (album.competitionId) {
    const label = nameIn(names.competitions, album.competitionId, locale);
    if (label) found.push({ kind: "competition", id: album.competitionId, label });
  }
  if (album.publicEventId) {
    const label = nameIn(names.publicEvents, album.publicEventId, locale);
    if (label) found.push({ kind: "publicEvent", id: album.publicEventId, label });
  }

  return found;
};

/**
 * The one affiliation a card has room for: the narrowest.
 *
 * "100m final" says more about a photograph than "UAE Championship 2026",
 * and the approved card shows the competition over the championship whenever
 * both exist — the championship is already in most album titles.
 */
export const narrowestAffiliation = (
  affiliations: readonly AlbumAffiliation[],
): AlbumAffiliation | undefined =>
  affiliations.find((item) => item.kind === "competition") ??
  affiliations.find((item) => item.kind === "publicEvent") ??
  affiliations.find((item) => item.kind === "championship");
