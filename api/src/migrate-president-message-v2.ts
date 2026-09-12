import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { AppModule } from './app.module.js';
import { assertSafeDevTarget } from './bootstrap/dev-database.js';
import {
  applyPresidentMessageMigration,
  planPresidentMessageMigration,
} from './bootstrap/migrate-president-message-v2.js';

/**
 * Moves `presidentMessagePage` rows to the ADR-0069 shape.
 *
 *   npm run migrate:president-message              show what would be written — writes nothing
 *   npm run migrate:president-message -- --apply   write it
 *
 * Refuses NODE_ENV=production and any MONGODB_URI that is not this machine.
 * Rows carrying non-empty `goals` are reported and left untouched: turning
 * them into `values` needs an icon per entry, and choosing icons is an
 * editorial decision, not a migration.
 */
async function main(): Promise<void> {
  const applying = process.argv.includes('--apply');
  assertSafeDevTarget(process.env.MONGODB_URI, process.env.NODE_ENV);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
    abortOnError: false,
  });

  try {
    const connection = app.get<Connection>(getConnectionToken());
    const plan = await planPresidentMessageMigration(connection);

    log(`rows needing work: ${plan.rows.length} (convertible ${plan.convertible}, blocked ${plan.blocked})`);
    log(`rows already in the new shape: ${plan.untouched}`);

    for (const row of plan.rows) {
      const parts = [
        row.convert.length > 0
          ? `convert ${row.convert.map((lang) => `${lang}→${row.paragraphs[lang]}¶`).join(', ')}`
          : null,
        row.defaults.length > 0 ? `default ${row.defaults.join(', ')}` : null,
        row.blockedByGoals > 0 ? `BLOCKED: ${row.blockedByGoals} goals entr(ies)` : null,
      ].filter(Boolean);
      log(`  ${row.id}: ${parts.join(' | ')}`);
    }

    if (plan.blocked > 0) {
      log('');
      log('blocked rows keep their goals and are not converted. Move those entries to `values` by hand');
      log('(each needs one of the twelve approved iconKeys), then run this again.');
    }

    if (!applying) {
      log('');
      log('dry run — nothing was written. Review the above, then: npm run migrate:president-message -- --apply');
      return;
    }

    const result = await applyPresidentMessageMigration(connection, plan);
    log(`done: ${result.converted} row(s) migrated, ${result.skipped} left for a human`);
  } finally {
    await app.close();
  }
}

function log(message: string): void {
  process.stdout.write(`${message}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
