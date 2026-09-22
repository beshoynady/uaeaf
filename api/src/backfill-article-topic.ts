import mongoose from 'mongoose';
import { assertSafeDevTarget } from './bootstrap/dev-database.js';
import { backfillArticleTopic, planTopicBackfill } from './bootstrap/backfill-article-topic.js';

/**
 * Writes `topic: null` onto the articles that predate the field.
 *
 *   npm run backfill:article-topic              show what would be written — writes nothing
 *   npm run backfill:article-topic -- --apply   write it
 *
 * Refuses NODE_ENV=production and any MONGODB_URI that is not this machine.
 * Built with `tsc` into `dist-seed/`, never `nest build`, so it runs while the
 * API serves. The logic lives in `bootstrap/backfill-article-topic.ts`.
 */
const log = (message: string): void => {
  // eslint-disable-next-line no-console
  console.log(`[backfill] ${message}`);
};

const main = async (): Promise<void> => {
  const applying = process.argv.includes('--apply');
  assertSafeDevTarget(process.env.MONGODB_URI, process.env.NODE_ENV);

  const connection = await mongoose.createConnection(process.env.MONGODB_URI as string).asPromise();
  try {
    const plan = applying ? await backfillArticleTopic(connection) : await planTopicBackfill(connection);
    log(`articles with no topic key: ${plan.missingKey}`);
    log(`unclassified (no topic): ${plan.unclassified} · classified: ${plan.classified}`);

    if (!applying) {
      log('dry run — nothing was written. Then: npm run backfill:article-topic -- --apply');
      return;
    }
    const after = await planTopicBackfill(connection);
    log(`done: ${plan.missingKey} written; now ${after.missingKey} with no key, ${after.unclassified} unclassified`);
  } finally {
    await connection.close();
  }
};

try {
  await main();
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(`[backfill] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
