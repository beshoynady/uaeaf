import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { AppModule } from './app.module.js';
import { assertSafeDevTarget } from './bootstrap/dev-database.js';
import { findPolicyDuplicates, findPolicyIndexes } from './bootstrap/check-policy-duplicates.js';

/**
 * Reports whether `workflowPolicies` can take its unique
 * `{entityType, operation}` index (ADR-0069 D4, audit finding H4).
 *
 *   npm run check:policy-duplicates
 *
 * Read-only: it never writes, and never drops or builds an index. Refuses
 * NODE_ENV=production and any MONGODB_URI that is not this machine, like
 * every other script here — the Atlas equivalent is in the deployment
 * checklist, to be run by a human against the cluster.
 *
 * Exit code 1 when duplicates exist, so a pipeline can gate on it.
 */
async function main(): Promise<void> {
  assertSafeDevTarget(process.env.MONGODB_URI, process.env.NODE_ENV);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
    abortOnError: false,
  });

  try {
    const connection = app.get<Connection>(getConnectionToken());
    const [duplicates, indexes] = await Promise.all([
      findPolicyDuplicates(connection),
      findPolicyIndexes(connection),
    ]);

    log('indexes on workflowPolicies:');
    for (const index of indexes) {
      const flags = [index.unique ? 'unique' : 'non-unique', index.partial ? 'partial' : 'full'];
      log(`  ${index.name} ${JSON.stringify(index.key)} — ${flags.join(', ')}`);
    }

    const superseded = indexes.filter(
      (index) =>
        JSON.stringify(index.key) === JSON.stringify({ entityType: 1, operation: 1 }) &&
        !index.unique,
    );
    if (superseded.length > 0) {
      log('');
      log(`the superseded non-unique index is still present: ${superseded.map((i) => i.name).join(', ')}`);
      log('drop it explicitly — Mongoose will not, and it enforces nothing beside the unique one.');
    }

    log('');
    if (duplicates.length === 0) {
      log('no duplicate (entityType, operation) pairs among live policies — safe to build the unique index.');
      return;
    }

    log(`BLOCKED: ${duplicates.length} duplicated pair(s). Archive or delete the wrong row in each before building the index.`);
    for (const group of duplicates) {
      log(`  ${group.entityType}/${group.operation} — ${group.count} live rows:`);
      for (const row of group.rows) {
        const when = row.updatedAt ? row.updatedAt.toISOString() : 'no updatedAt';
        log(
          `    ${row.id}  workflowRequired=${row.workflowRequired}  definition=${row.workflowDefinitionId ?? 'none'}  ${when}`,
        );
      }
    }
    process.exitCode = 1;
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
