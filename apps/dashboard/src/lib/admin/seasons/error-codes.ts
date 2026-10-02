/**
 * The refusals only the season screens can meet.
 *
 * Here rather than in `WRITE_ERROR_CODES` for the reason `albums/error-codes.ts`
 * gives: only these screens reach them, and that list's guard asks for copy on
 * every surface a code can reach. Their words live in `Seasons.errors`, and
 * `season-copy.spec.ts` checks each has them in both languages.
 *
 * The API names both overlaps by their own codes (`seasonOverlap`,
 * `seasonPhaseOverlap`); a create's plain `conflict` is then the taken
 * address, the one other conflict a create can meet.
 */
export const SEASON_ERROR_CODES = [
  /** The API's 422: the season ends before it starts. */
  "seasonRangeInvalid",
  /** A create's plain `conflict`: another season already holds the address. */
  "seasonSlugTaken",
  /** The API's `seasonOverlap`: the season's days overlap another season's. */
  "seasonOverlap",
  /** The API's `seasonPhaseOverlap`: two phases of the same type share a day. */
  "seasonPhaseOverlap",
  /** The API's `seasonPhaseOutOfRange`: one phase leaves the season's days or
   *  ends before it starts. */
  "seasonPhaseOutOfRange",
  /** The API's `stillReferenced` on a delete: albums or videos still fall
   *  inside the season's dates. */
  "seasonHasContent",
  /** The API's `workflowRequired` on a publish: the approval policy asks for a
   *  review, so the season goes through "send for approval". */
  "seasonNeedsReview",
  /** The API's `conflict` on a submit: the policy requires no approval, so
   *  the season is published directly. */
  "seasonPublishDirectly",
  /** The API's `activeWorkflowExists` on a submit: a review of this season is
   *  already running. */
  "seasonReviewInProgress",
  /** The API's `missingRequiredField` on a publish or a submit: the banner,
   *  the one field `PUBLISH_REQUIREMENTS.seasons` asks for. */
  "seasonBannerMissing",
] as const;
export type SeasonErrorCode = (typeof SEASON_ERROR_CODES)[number];

export const isSeasonErrorCode = (code: unknown): code is SeasonErrorCode =>
  typeof code === "string" && (SEASON_ERROR_CODES as readonly string[]).includes(code);
