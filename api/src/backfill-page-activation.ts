import mongoose from 'mongoose';
import { assertSafeDevTarget } from './bootstrap/dev-database.js';
import {
  ACTIVATABLE_COLLECTIONS,
  backfillPageActivation,
  planPageActivationBackfill,
} from './bootstrap/backfill-page-activation.js';

/**
 * Writes `isActive: true` onto every page row written before the field existed.
 *
 *   npm run backfill:page-activation              show what would be written — writes nothing
 *   npm run backfill:page-activation -- --apply   write it
 *
 * Run this in the same deployment as the change that adds the field: a default
 * does not reach a stored document, so until it runs, fifteen live pages read
 * back as withheld (ADR-0102 §D3).
 *
 * Refuses NODE_ENV=production and any MONGODB_URI that is not this machine.
 * Built with `tsc` into `dist-seed/`, never `nest build`, so it runs while the
 * API serves. The logic lives in `bootstrap/backfill-page-activation.ts`.
 */
const log = (message: string): void => {
  // eslint-disable-next-line no-console
  console.log(`[backfill] ${message}`);
};

const listCounts = (counts: Record<string, number>): void => {
  for (const name of ACTIVATABLE_COLLECTIONS) {
    const count = counts[name] ?? 0;
    if (count > 0) {
      log(`  ${name}: ${count}`);
    }
  }
};

const main = async (): Promise<void> => {
  const applying = process.argv.includes('--apply');
  assertSafeDevTarget(process.env.MONGODB_URI, process.env.NODE_ENV);

  const connection = await mongoose.createConnection(process.env.MONGODB_URI as string).asPromise();
  try {
    const plan = await planPageActivationBackfill(connection);
    log(`page rows with no isActive key: ${plan.total} across ${ACTIVATABLE_COLLECTIONS.length} collections`);
    listCounts(plan.missingKey);

    if (!applying) {
      log('dry run — nothing was written. Then: npm run backfill:page-activation -- --apply');
      return;
    }

    const written = await backfillPageActivation(connection);
    const after = await planPageActivationBackfill(connection);
    log(`done: ${written.total} written; ${after.total} still missing the key`);
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
