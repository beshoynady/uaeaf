/**
 * The album vocabulary, mirrored from the API's own closed lists.
 *
 * Restated rather than imported for the reason `videos/types.ts` gives: the
 * dashboard reaches the API over HTTP, and importing across that boundary
 * would turn a runtime contract into a build-time dependency. The API's own
 * `@IsIn` refuses anything outside these with a 400.
 */
export const ALBUM_STATES = ["Draft", "Published", "Archived"] as const;
export type AlbumState = (typeof ALBUM_STATES)[number];

/** What `POST /albums` accepts. `Published` is reachable only through
 *  `PATCH /albums/:id/publish`, behind its own permission. */
export const CREATABLE_ALBUM_STATES = ["Draft", "Archived"] as const satisfies readonly AlbumState[];

export interface LocalizedText {
  ar: string;
  en: string;
}

/** The four places an album can sit. None of their collections exists yet,
 *  so each is an id the form can hold and show but not yet offer. */
export interface Affiliation {
  seasonId: string | null;
  championshipId: string | null;
  competitionId: string | null;
  publicEventId: string | null;
}

/** An album as the admin screens read it. */
export interface AdminAlbum extends Affiliation {
  id: string;
  title: LocalizedText;
  slug: string;
  description: LocalizedText | null;
  athleteIds: string[];
  clubIds: string[];
  /** ISO instant, or null when the occasion has no recorded date. */
  eventDate: string | null;
  location: LocalizedText | null;
  isFeatured: boolean;
  championshipName: LocalizedText | null;
  coverImageId: string | null;
  displayOrder: number;
  publicationState: AlbumState;
  tags: string[];
  assetCount: number;
  publishedAt: string | null;
}

/** One photo of an album, as the grid draws it. */
export interface AlbumPhoto {
  id: string;
  url: string;
  altText: LocalizedText;
  caption: LocalizedText;
  displayOrder: number;
  photographer: string | null;
  captureDate: string | null;
  isVisible: boolean;
}

/** An athlete or a club, as the affiliation pickers offer it. */
export interface PersonOption {
  id: string;
  name: LocalizedText;
}

export type PeopleKind = "athletes" | "clubs";
