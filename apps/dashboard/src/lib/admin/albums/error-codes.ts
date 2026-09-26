/**
 * The refusals only the album screens can meet.
 *
 * Here rather than in `WRITE_ERROR_CODES` because only these screens can reach
 * them, and that list's guard asks for copy on every surface a code can reach.
 * Their words live in `Albums.errors`, and `album-copy.spec.ts` checks every
 * one has them in both languages.
 */
export const ALBUM_ERROR_CODES = [
  /** The API's 422: the season / championship / competition / public event
   *  combination is not one the domain has. */
  "affiliationIncoherent",
  /** The order sent no longer lists every photo of the album exactly once —
   *  a photo was added or removed under the editor. */
  "photoOrderStale",
  /** Another album already holds this address. */
  "albumSlugTaken",
] as const;
export type AlbumErrorCode = (typeof ALBUM_ERROR_CODES)[number];

export const isAlbumErrorCode = (code: unknown): code is AlbumErrorCode =>
  typeof code === "string" && (ALBUM_ERROR_CODES as readonly string[]).includes(code);
