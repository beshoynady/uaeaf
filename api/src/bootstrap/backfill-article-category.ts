import type { Connection } from 'mongoose';

/**
 * Writes `category` onto the articles that predate the field.
 *
 * ── Why a backfill is needed at all ────────────────────────────────────────
 *
 * A Mongoose `default` is applied when a document is CREATED and when one is
 * hydrated for reading — never to what is already stored. So an article
 * written before `category` existed reads back as `General` and is stored with
 * no such field, and the two disagree in exactly one place that matters: a
 * query. `{ category: 'General' }` does not match a document that has no
 * `category` key, so the categorised feed silently omits every older article
 * while the uncategorised feed still shows them.
 *
 * That is the worst shape a data defect can take — every screen looks right,
 * and the only symptom is a list that is quietly shorter than it should be.
 *
 * ── Why `General` and not a guess ──────────────────────────────────────────
 *
 * `General` is not a guess about what these articles are; it is the same
 * answer the application has already been giving for them since the field was
 * added. Writing it down changes no reader's experience and makes the query
 * agree with the read. Anything cleverer — inferring a shelf from the text —
 * would be inventing editorial decisions nobody made.
 */
export interface CategoryBackfillReport {
  /** Articles that had no `category` key and now carry `General`. */
  filled: number;
  /** Articles that already declared one; untouched. */
  alreadySet: number;
}

/** What the backfill would do, without doing it. */
export async function planCategoryBackfill(connection: Connection): Promise<CategoryBackfillReport> {
  const articles = connection.collection('articles');

  return {
    filled: await articles.countDocuments({ category: { $exists: false } }),
    alreadySet: await articles.countDocuments({ category: { $exists: true } }),
  };
}

/**
 * Writes the missing values.
 *
 * Scoped to documents with no `category` key at all. An article whose category
 * someone deliberately set — including one set back to `General` — is matched
 * by `$exists: true` and is never rewritten, so running this twice is the same
 * as running it once.
 */
export async function backfillArticleCategory(connection: Connection): Promise<CategoryBackfillReport> {
  const plan = await planCategoryBackfill(connection);

  if (plan.filled > 0) {
    await connection.collection('articles').updateMany(
      { category: { $exists: false } },
      { $set: { category: 'General' } },
    );
  }

  return plan;
}
