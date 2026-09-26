import type { Connection } from 'mongoose';

/**
 * Makes every page written before `isActive` explicitly served.
 *
 * ── Why this exists at all ────────────────────────────────────────────────
 *
 * Mongoose applies a schema default when it *creates* a document, never to one
 * already stored. `HeroPageSchema.isActive` defaults to `true`, and every one
 * of these rows predates it — so without this backfill each reads back
 * `undefined`, the public gate sees "not true", and fifteen live pages go dark
 * the moment the gate ships. This is part of the same change as the field
 * (ADR-0102 §D3), not a follow-up.
 *
 * ── Why the collections are written out ───────────────────────────────────
 *
 * A migration must name the collections it intends to touch. Deriving the list
 * from the connection's registered models would make it depend on which modules
 * happen to be loaded, which is not a migration anybody can read before running
 * it.
 *
 * `aboutFederationPage` is deliberately absent: it declares its own `isActive`
 * at `default: false` and its page has never been live, so there is nothing to
 * preserve and switching it on would be this script making an editorial
 * decision.
 */
export const ACTIVATABLE_COLLECTIONS = [
  'athletesPage',
  'clubsPage',
  'coachesPage',
  'disciplinesPage',
  'newsPage',
  'recordsPage',
  'resultsRankingsPage',
  'albumsPage',
  'videosPage',
  'boardMembersPage',
  'committeesPage',
  'contactUsPage',
  'presidentMessagePage',
  'visionMissionPage',
  'strategicPlansPage',
] as const;

export interface PageActivationReport {
  /** Rows lacking the key, per collection. Every collection appears, including
   *  the ones with nothing to write — a name missing from the report would read
   *  as "nothing to do there" whether or not anything was looked at. */
  missingKey: Record<string, number>;
  total: number;
}

/** Only the rows that have no `isActive` key at all. A page an editor has
 *  already switched off matches neither this filter nor any write below. */
const MISSING_KEY = { isActive: { $exists: false } } as const;

const report = (missingKey: Record<string, number>): PageActivationReport => ({
  missingKey,
  total: Object.values(missingKey).reduce((sum, count) => sum + count, 0),
});

/** What the backfill would write, without writing it. */
export const planPageActivationBackfill = async (
  connection: Connection,
): Promise<PageActivationReport> => {
  const counts: Record<string, number> = {};

  for (const name of ACTIVATABLE_COLLECTIONS) {
    counts[name] = await connection.collection(name).countDocuments(MISSING_KEY);
  }

  return report(counts);
};

/**
 * Writes `isActive: true` onto every row that lacks the key.
 *
 * Scoped to the missing key, so an editor who has already switched a page off
 * does not have that undone, and running it twice is running it once.
 *
 * `$set` alone, with no `$currentDate`: `updatedAt` is load-bearing.
 * `publishDirect` uses it for optimistic concurrency, so a migration that moves
 * it invalidates the `expectedUpdatedAt` every open editor is holding.
 *
 * Sequential rather than `Promise.all`: this machine runs one mongod with a
 * small cache (see `project_dev_environment_limits`), and fifteen concurrent
 * `updateMany` calls buy nothing on collections that hold one row each.
 */
export const backfillPageActivation = async (
  connection: Connection,
): Promise<PageActivationReport> => {
  const counts: Record<string, number> = {};

  for (const name of ACTIVATABLE_COLLECTIONS) {
    const result = await connection.collection(name).updateMany(MISSING_KEY, { $set: { isActive: true } });
    counts[name] = result.modifiedCount;
  }

  return report(counts);
};
