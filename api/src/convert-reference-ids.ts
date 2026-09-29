import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { AppModule } from './app.module.js';
import { assertSafeDevTarget } from './bootstrap/dev-database.js';
import { convertReferenceIds } from './bootstrap/convert-reference-ids.js';

/**
 * Converts references stored as strings into `ObjectId`s.
 *
 *   npm run convert:reference-ids              show what would be written — writes nothing
 *   npm run convert:reference-ids -- --write   write it
 *
 * Refuses NODE_ENV=production and any MONGODB_URI that is not this machine.
 * Idempotent: a second run reports zero. A value that is not 24 hex digits is
 * reported and left as it is — a malformed reference is a record to look at, not
 * one to coerce. Built with `tsc` into `dist-seed/`, never `nest build`.
 */

const log = (message: string): void => {
  // eslint-disable-next-line no-console
  console.log(message);
};

const main = async (): Promise<void> => {
  const writing = process.argv.includes('--write');
  assertSafeDevTarget(process.env.MONGODB_URI, process.env.NODE_ENV);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
    abortOnError: false,
  });

  try {
    const connection = app.get<Connection>(getConnectionToken());
    const report = await convertReferenceIds(connection, { write: writing });

    log(`reference paths swept: ${report.scanned.paths} across ${report.scanned.collections} collection(s)`);

    if (report.rows.length === 0) {
      log('every stored reference is already an ObjectId. Nothing to convert.');
    }

    for (const row of report.rows) {
      log(
        `  ${row.collection}.${row.path}: ${row.values} value(s) in ${row.documents} document(s)` +
          (row.invalid.length > 0 ? `, ${row.invalid.length} REFUSED` : ''),
      );
      for (const refused of row.invalid) {
        log(`      refused ${refused.documentId} at ${refused.at}: ${JSON.stringify(refused.value)}`);
      }
    }

    const refused = report.rows.reduce((total, row) => total + row.invalid.length, 0);
    if (refused > 0) {
      log('');
      log(`${refused} value(s) are not a 24-digit hex id and were NOT converted. Each needs a decision by hand:`);
      log('either the record points at something that no longer exists, or the value was never an id.');
    }

    // Reported every run: these hold document ids that nothing declares a
    // target for, so what they point at cannot be derived. Widening the
    // conversion to cover them is a decision, not a default.
    if (report.skippedWithoutRef.length > 0) {
      log('');
      log(`outside this conversion — ${report.skippedWithoutRef.length} id-shaped path(s) declaring no ref/refPath:`);
      for (const path of report.skippedWithoutRef) log(`  ${path.collection}.${path.path}`);
    }

    if (!writing) {
      log('');
      log('dry run — nothing was written. Review the above, then: npm run convert:reference-ids -- --write');
      return;
    }

    log('');
    log(`converted ${report.converted} value(s).`);
  } finally {
    await app.close();
  }
};

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error(`[convert-reference-ids] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
