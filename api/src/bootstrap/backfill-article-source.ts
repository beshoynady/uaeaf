import type { Connection } from 'mongoose';

/**
 * Writes `sourceOutlet: null` and `sourceUrl: null` onto the articles that
 * predate the fields.
 *
 * ── Why null and not a value ───────────────────────────────────────────────
 *
 * There is nothing to derive one from. A `FederationInMedia` round-up written
 * before these fields existed recorded no outlet and no address anywhere on
 * the row, and inferring either from the headline or the body would be an
 * editorial claim about who published a story first — the one kind of claim a
 * script must never make. The newsroom fills these in by hand, from the
 * editor, which is where the dashboard's "missing source" mark points them
 * (owner decision 2026-09-22). The same shape the topic backfill has.
 *
 * ── Why write anything at all ──────────────────────────────────────────────
 *
 * A query for `{ sourceOutlet: null }` already matches a document with no key,
 * so no reader depends on this. It is written so the stored documents say what
 * they are: every article declares an attribution, and "none recorded" is a
 * value rather than an absence every reader has to know about.
 *
 * ── Why every article and not only the round-ups ───────────────────────────
 *
 * An article's category can change. Writing the pair onto `General` rows too
 * means an article converted into a round-up later already has the keys, so
 * the only thing that ever changes is their value.
 */
export interface SourceBackfillReport {
  /** Articles that had neither key; the backfill gives them both as `null`. */
  missingKey: number;
  /** Round-ups carrying no outlet — the editorial backlog this reports. */
  coverageWithoutSource: number;
  /** Round-ups that already name where they came from; untouched. */
  coverageWithSource: number;
}

const MISSING_EITHER_KEY = { $or: [{ sourceOutlet: { $exists: false } }, { sourceUrl: { $exists: false } }] };

/** What the backfill would do, without doing it. */
export const planSourceBackfill = async (connection: Connection): Promise<SourceBackfillReport> => {
  const articles = connection.collection('articles');

  return {
    missingKey: await articles.countDocuments(MISSING_EITHER_KEY),
    coverageWithoutSource: await articles.countDocuments({
      category: 'FederationInMedia',
      $or: [{ sourceOutlet: null }, { sourceOutlet: { $exists: false } }],
    }),
    coverageWithSource: await articles.countDocuments({
      category: 'FederationInMedia',
      sourceOutlet: { $ne: null, $exists: true },
    }),
  };
};

/**
 * Writes the missing keys. Scoped to documents missing one, so an attribution
 * someone recorded is never touched and running it twice is running it once.
 */
export const backfillArticleSource = async (connection: Connection): Promise<SourceBackfillReport> => {
  const plan = await planSourceBackfill(connection);

  if (plan.missingKey > 0) {
    await connection
      .collection('articles')
      // `$setOnInsert` cannot apply here — these are updates, not upserts — so
      // the filter carries the "missing" condition instead, and a row that
      // already names its outlet is outside it.
      .updateMany(MISSING_EITHER_KEY, { $set: { sourceOutlet: null, sourceUrl: null } });
  }

  return plan;
};
