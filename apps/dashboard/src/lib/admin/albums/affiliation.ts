import type { Affiliation } from "./types";

/**
 * The affiliation coherence rules, as the form states them before a save.
 *
 * The API enforces exactly these four with a 422 (`album-affiliation.ts`,
 * `assertAffiliationShape`), and checks them against the album as it will be
 * after the patch. The form holds the whole album, so checking the draft here
 * is checking the same merged shape — and the editor learns about the problem
 * beside the field that causes it, rather than from a refused save.
 *
 * The order matches the API's, so the first problem the form names is the
 * first one the API would have refused with.
 */
export const AFFILIATION_PROBLEMS = [
  "championshipOrPublicEvent",
  "championshipNeedsSeason",
  "publicEventNeedsSeason",
  "competitionNeedsChampionship",
] as const;
export type AffiliationProblem = (typeof AFFILIATION_PROBLEMS)[number];

export type AffiliationKey = keyof Affiliation;

export const AFFILIATION_KEYS: readonly AffiliationKey[] = [
  "seasonId",
  "championshipId",
  "competitionId",
  "publicEventId",
];

/**
 * Whether the collections behind the four pickers exist.
 *
 * Seasons, championships, competitions and public events have no module yet,
 * so there is nothing to choose from and every picker is drawn disabled with
 * the reason beside it. Everything below this line already works against the
 * ids: the day the modules land, this becomes true and the pickers start
 * offering options with their rules already in place.
 */
export const AFFILIATION_MODULES_BUILT = false;

export const affiliationProblems = (affiliation: Affiliation): AffiliationProblem[] => {
  const { seasonId, championshipId, competitionId, publicEventId } = affiliation;
  const problems: AffiliationProblem[] = [];
  if (championshipId && publicEventId) problems.push("championshipOrPublicEvent");
  if (championshipId && !seasonId) problems.push("championshipNeedsSeason");
  if (publicEventId && !seasonId) problems.push("publicEventNeedsSeason");
  if (competitionId && !championshipId) problems.push("competitionNeedsChampionship");
  return problems;
};

/** Which field each problem is drawn under: the one the editor would change
 *  to resolve it, which is always the deeper or the later of the two. */
export const PROBLEM_FIELD: Record<AffiliationProblem, AffiliationKey> = {
  championshipOrPublicEvent: "publicEventId",
  championshipNeedsSeason: "championshipId",
  publicEventNeedsSeason: "publicEventId",
  competitionNeedsChampionship: "competitionId",
};

/** Why a picker cannot be used yet, if it cannot. */
export type PickerLock = "moduleMissing" | "needsSeason" | "needsChampionship" | "exclusiveWithPublicEvent" | "exclusiveWithChampionship";

/**
 * The reason a picker is locked, or `null` when it is open.
 *
 * A picker that already holds a value is never locked by its parent: locking
 * it would leave the editor unable to clear a value the rules now refuse,
 * which is the one move that fixes the problem. It stays open, and the
 * problem is drawn beneath it instead.
 */
export const pickerLock = (
  affiliation: Affiliation,
  key: AffiliationKey,
  /** Injectable so the rules below can be exercised before the modules exist. */
  modulesBuilt: boolean = AFFILIATION_MODULES_BUILT,
): PickerLock | null => {
  if (!modulesBuilt) return "moduleMissing";
  if (affiliation[key]) return null;

  switch (key) {
    case "seasonId":
      return null;
    case "championshipId":
      if (!affiliation.seasonId) return "needsSeason";
      return affiliation.publicEventId ? "exclusiveWithPublicEvent" : null;
    case "competitionId":
      return affiliation.championshipId ? null : "needsChampionship";
    case "publicEventId":
      if (!affiliation.seasonId) return "needsSeason";
      return affiliation.championshipId ? "exclusiveWithChampionship" : null;
  }
};
