import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { AppModule } from './app.module.js';
import { assertSafeDevTarget } from './bootstrap/dev-database.js';
import { applyCreatedAtBackfill, planCreatedAtBackfill, type BackfillRow } from './bootstrap/backfill-created-at.js';

/**
 * Restores `createdAt` on documents written while their schema had no
 * `timestamps`, from the date inside their ObjectId.
 *
 *   npm run backfill:created-at              show what would be written — writes nothing
 *   npm run backfill:created-at -- --apply   write it
 *
 * Refuses NODE_ENV=production and any MONGODB_URI that is not this machine.
 * The logic and its guarantees live in `bootstrap/backfill-created-at.ts`.
 */

/** The first day documents could be written without a date:
 *  `@nestjs/mongoose` 12, which does not pass `@Schema()` options down to
 *  subclasses, is in the project from 2026-09-03 (local time, +03:00). */
const SINCE = new Date('2026-09-03T00:00:00+03:00');

async function main(): Promise<void> {
  const applying = process.argv.includes('--apply');
  assertSafeDevTarget(process.env.MONGODB_URI, process.env.NODE_ENV);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
    abortOnError: false,
  });

  try {
    const connection = app.get<Connection>(getConnectionToken());
    const plan = await planCreatedAtBackfill(connection, { since: SINCE, now: new Date() });
    report(plan);

    if (!applying) {
      log('dry run — nothing was written. Review the above, then: npm run backfill:created-at -- --apply');
      return;
    }

    const written = await applyCreatedAtBackfill(connection, plan);
    const total = written.reduce((sum, row) => sum + row.written, 0);
    for (const row of written.filter((item) => item.written > 0)) log(`written ${row.collection}: ${row.written}`);
    log(`done: createdAt written on ${total} document(s); updatedAt untouched`);
  } finally {
    await app.close();
  }
}

function report(plan: BackfillRow[]): void {
  const day = (date: Date | null) => (date ? date.toISOString().replace('T', ' ').slice(0, 16) + 'Z' : '-');
  const active = plan.filter((row) => row.fillable.length > 0 || Object.values(row.skipped).some((count) => count > 0));

  log(`documents created since ${day(SINCE)} with no createdAt:`);
  for (const row of active) {
    const s = row.skipped;
    log(
      `${row.collection.padEnd(28)} fill ${String(row.fillable.length).padStart(4)}` +
        `  ${day(row.oldest)} → ${day(row.newest)}` +
        `  | skipped: not an ObjectId ${s.notAnObjectId} · before ${s.beforeSince} · future ${s.inTheFuture} · createdAt:null ${s.explicitNull}`,
    );
  }
  const fillable = plan.reduce((sum, row) => sum + row.fillable.length, 0);
  log(`total to fill: ${fillable} document(s) in ${plan.filter((row) => row.fillable.length > 0).length} collection(s); ${plan.length - active.length} collection(s) need nothing`);
}

function log(message: string): void {
  // eslint-disable-next-line no-console
  console.log(`[backfill] ${message}`);
}

try {
  await main();
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(`[backfill] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
