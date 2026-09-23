import mongoose from 'mongoose';
import { assertSafeDevTarget } from './bootstrap/dev-database.js';
import { backfillArticleSource, planSourceBackfill } from './bootstrap/backfill-article-source.js';

/**
 * Writes `sourceOutlet: null` and `sourceUrl: null` onto the articles that
 * predate the fields.
 *
 *   npm run backfill:article-source              show what would be written — writes nothing
 *   npm run backfill:article-source -- --apply   write it
 *
 * Refuses NODE_ENV=production and any MONGODB_URI that is not this machine.
 * Built with `tsc` into `dist-seed/`, never `nest build`, so it runs while the
 * API serves. The logic lives in `bootstrap/backfill-article-source.ts`.
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
    const plan = applying ? await backfillArticleSource(connection) : await planSourceBackfill(connection);
    log(`articles missing a source key: ${plan.missingKey}`);
    // The number an editor acts on. The backfill cannot reduce it — only
    // someone who knows where each round-up came from can.
    log(
      `FederationInMedia round-ups with no outlet: ${plan.coverageWithoutSource} · ` +
        `with one: ${plan.coverageWithSource}`,
    );

    if (!applying) {
      log('dry run — nothing was written. Then: npm run backfill:article-source -- --apply');
      return;
    }
    const after = await planSourceBackfill(connection);
    log(
      `done: ${plan.missingKey} written; now ${after.missingKey} missing a key, ` +
        `${after.coverageWithoutSource} round-ups still awaiting an outlet from the newsroom`,
    );
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
