import { SLUG_PATTERN } from "@/lib/admin/articles";
import { affiliationProblems } from "./affiliation";
import type { AffiliationProblem } from "./affiliation";
import type { Affiliation, AdminAlbum, AlbumState, LocalizedText } from "./types";

/**
 * The album form's draft, and the two request bodies it becomes.
 *
 * Flat strings, because a form is flat: each input edits one string, and the
 * nested shapes the API stores are rebuilt only when a save leaves.
 *
 * -- Pairs are both-or-neither ------------------------------------------------
 *
 * Every bilingual field goes through `LocalizedTextDto`, whose two halves are
 * each `@MinLength(1)`. So a description written in Arabic only is not a
 * partial description the API will keep — it is a 400 that refuses the whole
 * save. The optional pairs are therefore checked here as a pair: both halves,
 * or neither.
 *
 * -- Some pairs cannot be cleared --------------------------------------------
 *
 * `UpdateAlbumDto` declares `location` and `eventDate` nullable, so emptying
 * them clears them. `description` and `championshipName` are optional but NOT
 * nullable: a patch can replace them and cannot remove them. Emptying one that
 * is stored would send nothing and keep the old text while the form showed it
 * gone — so that state is a problem the editor is told about, not a save that
 * quietly does something else.
 */
export interface AlbumDraft {
  titleAr: string;
  titleEn: string;
  slug: string;
  descriptionAr: string;
  descriptionEn: string;
  /** `YYYY-MM-DD`, as a date input holds it, or empty. */
  eventDate: string;
  locationAr: string;
  locationEn: string;
  championshipNameAr: string;
  championshipNameEn: string;
  affiliation: Affiliation;
  athleteIds: string[];
  clubIds: string[];
  /** The state the editor wants the album in after the save. */
  state: AlbumState;
  featured: boolean;
}

export const EMPTY_AFFILIATION: Affiliation = {
  seasonId: null,
  championshipId: null,
  competitionId: null,
  publicEventId: null,
};

export const draftFromAlbum = (album: AdminAlbum | null): AlbumDraft => ({
  titleAr: album?.title.ar ?? "",
  titleEn: album?.title.en ?? "",
  slug: album?.slug ?? "",
  descriptionAr: album?.description?.ar ?? "",
  descriptionEn: album?.description?.en ?? "",
  eventDate: album?.eventDate ? album.eventDate.slice(0, 10) : "",
  locationAr: album?.location?.ar ?? "",
  locationEn: album?.location?.en ?? "",
  championshipNameAr: album?.championshipName?.ar ?? "",
  championshipNameEn: album?.championshipName?.en ?? "",
  affiliation: album
    ? {
        seasonId: album.seasonId,
        championshipId: album.championshipId,
        competitionId: album.competitionId,
        publicEventId: album.publicEventId,
      }
    : EMPTY_AFFILIATION,
  athleteIds: album?.athleteIds ?? [],
  clubIds: album?.clubIds ?? [],
  state: album?.publicationState ?? "Draft",
  featured: album?.isFeatured ?? false,
});

export type DraftProblem =
  | "titleArRequired"
  | "titleEnRequired"
  | "slugInvalid"
  | "descriptionPair"
  | "descriptionCannotClear"
  | "locationPair"
  | "championshipNamePair"
  | "championshipNameCannotClear"
  | AffiliationProblem;

type PairState = "empty" | "complete" | "half";

const pairState = (ar: string, en: string): PairState => {
  const hasAr = ar.trim() !== "";
  const hasEn = en.trim() !== "";
  if (hasAr && hasEn) return "complete";
  return hasAr || hasEn ? "half" : "empty";
};

/**
 * Everything that would make the save fail, in the order the form draws it.
 *
 * A function of the draft and the stored album, called at the press rather
 * than memoised at render: the state it judges is the state when the editor
 * asked to save (CLAUDE.md §31).
 */
export const draftProblems = (draft: AlbumDraft, stored: AdminAlbum | null): DraftProblem[] => {
  const problems: DraftProblem[] = [];
  if (draft.titleAr.trim() === "") problems.push("titleArRequired");
  if (draft.titleEn.trim() === "") problems.push("titleEnRequired");
  // The address is set once, at creation: `UpdateAlbumDto` omits it.
  if (stored === null && !SLUG_PATTERN.test(draft.slug)) problems.push("slugInvalid");

  const description = pairState(draft.descriptionAr, draft.descriptionEn);
  if (description === "half") problems.push("descriptionPair");
  else if (description === "empty" && stored?.description) problems.push("descriptionCannotClear");

  if (pairState(draft.locationAr, draft.locationEn) === "half") problems.push("locationPair");

  const championshipName = pairState(draft.championshipNameAr, draft.championshipNameEn);
  if (championshipName === "half") problems.push("championshipNamePair");
  else if (championshipName === "empty" && stored?.championshipName) problems.push("championshipNameCannotClear");

  return [...problems, ...affiliationProblems(draft.affiliation)];
};

const trimmedPair = (ar: string, en: string): LocalizedText | null =>
  pairState(ar, en) === "complete" ? { ar: ar.trim(), en: en.trim() } : null;

/** A date input's day, as the instant the API stores: midnight UTC, so the
 *  day reads the same in every zone the public site is opened in. */
const toInstant = (day: string): string | null => (day === "" ? null : new Date(`${day}T00:00:00.000Z`).toISOString());

/**
 * `POST /albums`'s body.
 *
 * `publicationState` is never `Published` here — the API refuses it, and
 * publishing is the separate `PATCH :id/publish` the route handler makes
 * afterwards. `displayOrder` is required by the DTO and read by nothing that
 * orders albums today (the gallery sorts by date), so a new album is 0.
 */
export const toCreateBody = (draft: AlbumDraft): Record<string, unknown> => {
  const description = trimmedPair(draft.descriptionAr, draft.descriptionEn);
  const location = trimmedPair(draft.locationAr, draft.locationEn);
  const championshipName = trimmedPair(draft.championshipNameAr, draft.championshipNameEn);
  const eventDate = toInstant(draft.eventDate);
  const { seasonId, championshipId, competitionId, publicEventId } = draft.affiliation;

  return {
    title: { ar: draft.titleAr.trim(), en: draft.titleEn.trim() },
    slug: draft.slug,
    displayOrder: 0,
    publicationState: draft.state === "Archived" ? "Archived" : "Draft",
    athleteIds: draft.athleteIds,
    clubIds: draft.clubIds,
    // Absent rather than null: the create DTO's optional fields are not
    // nullable, and a null would be a 400.
    ...(description ? { description } : {}),
    ...(location ? { location } : {}),
    ...(championshipName ? { championshipName } : {}),
    ...(eventDate ? { eventDate } : {}),
    ...(seasonId ? { seasonId } : {}),
    ...(championshipId ? { championshipId } : {}),
    ...(competitionId ? { competitionId } : {}),
    ...(publicEventId ? { publicEventId } : {}),
  };
};

/**
 * `PATCH /albums/:id`'s body: every editable field, with `null` where the API
 * accepts a clear.
 *
 * Sent whole rather than diffed. The API re-checks the affiliation against the
 * merged album anyway, and a diff would add a second place for "what changed"
 * to be computed wrongly; a full body is last-write-wins, which is what an
 * editor pressing Save means.
 */
export const toPatchBody = (draft: AlbumDraft): Record<string, unknown> => {
  const description = trimmedPair(draft.descriptionAr, draft.descriptionEn);
  const championshipName = trimmedPair(draft.championshipNameAr, draft.championshipNameEn);

  return {
    title: { ar: draft.titleAr.trim(), en: draft.titleEn.trim() },
    location: trimmedPair(draft.locationAr, draft.locationEn),
    eventDate: toInstant(draft.eventDate),
    athleteIds: draft.athleteIds,
    clubIds: draft.clubIds,
    ...draft.affiliation,
    ...(description ? { description } : {}),
    ...(championshipName ? { championshipName } : {}),
  };
};
