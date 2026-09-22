import type { Connection } from 'mongoose';

/**
 * Writes `topic: null` onto the articles that predate the field.
 *
 * ── Why null and not a topic ───────────────────────────────────────────────
 *
 * Unlike `category`, the topic has no honest default. `General` was already
 * the answer the application gave for an unfiled article; no topic is the
 * answer for an unclassified one, and choosing one from the headline would be
 * an editorial decision nobody made (owner decision 2026-09-22). The newsroom
 * classifies these by hand, from the editor.
 *
 * ── Why write anything at all ──────────────────────────────────────────────
 *
 * A query for `{ topic: null }` already matches a document with no key, so no
 * reader depends on this. It is written so the stored documents say what they
 * are: every article declares a topic, and "none yet" is a value rather than
 * an absence someone has to know about.
 */
export interface TopicBackfillReport {
  /** Articles that had no `topic` key; the backfill gives them `null`. */
  missingKey: number;
  /** Articles with no topic, the key-less ones included. */
  unclassified: number;
  /** Articles someone has already classified; untouched. */
  classified: number;
}

/** What the backfill would do, without doing it. */
export const planTopicBackfill = async (connection: Connection): Promise<TopicBackfillReport> => {
  const articles = connection.collection('articles');

  return {
    missingKey: await articles.countDocuments({ topic: { $exists: false } }),
    unclassified: await articles.countDocuments({ topic: null }),
    classified: await articles.countDocuments({ topic: { $ne: null } }),
  };
};

/**
 * Writes the missing values. Scoped to documents with no `topic` key, so a
 * topic someone chose is never touched and running it twice is running it
 * once.
 */
export const backfillArticleTopic = async (connection: Connection): Promise<TopicBackfillReport> => {
  const plan = await planTopicBackfill(connection);

  if (plan.missingKey > 0) {
    await connection.collection('articles').updateMany({ topic: { $exists: false } }, { $set: { topic: null } });
  }

  return plan;
};
