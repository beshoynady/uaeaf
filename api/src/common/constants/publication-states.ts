/**
 * The 4-value `publicationState` enum carried by every collection that
 * denormalizes its state from `publications` (ADR-0020) — FigJam Physical
 * Model, re-read fresh 2026-09-03, verbatim on every consuming collection:
 * `Draft | Live | Unpublished | Archived`.
 *
 * `Unpublished` (added 2026-09-01 on the board) is a temporary/reversible
 * removal from public view — content stays intact and can return to `Live`
 * without a new approval cycle — explicitly distinct from `Archived`
 * (permanent/historical; reactivating requires a full new approval cycle
 * from `Draft`).
 *
 * Note this is NOT the same vocabulary as `albums.publicationState`
 * (`Draft | Published | Archived`), which is a deliberately separate
 * self-owned state machine for a workflow-exempt collection.
 */
export const PUBLICATION_STATES = ['Draft', 'Live', 'Unpublished', 'Archived'] as const;
export type PublicationState = (typeof PUBLICATION_STATES)[number];
