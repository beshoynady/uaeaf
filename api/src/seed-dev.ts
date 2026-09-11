import { NestFactory } from '@nestjs/core';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { fileURLToPath } from 'node:url';
import type { Connection, Model } from 'mongoose';
import { AppModule } from './app.module.js';
import { Permission } from './modules/platform-administration/permissions/schemas/permission.schema.js';
import { Role } from './modules/platform-administration/roles/schemas/role.schema.js';
import { User } from './modules/platform-administration/users/schemas/user.schema.js';
import { readBootstrapAdminInput, runBootstrap } from './bootstrap/seed-admin.js';
import { assertSafeDevTarget } from './bootstrap/dev-database.js';
import {
  exportDevFixtures,
  loadDevFixtures,
  seedDevFixtures,
  writeDevFixtures,
} from './bootstrap/seed-dev.js';

/**
 * Brings a local development database to a known state in one command.
 *
 *   npm run seed:dev              add whatever is missing; keeps dashboard edits
 *   npm run seed:dev -- --reset   put the fixture versions back
 *   npm run seed:export           snapshot the current database into the fixtures
 *
 * `seed:dev` runs the same bootstrap as `bootstrap:admin` first — permission
 * catalogue, Super Admin role, first administrator — then writes the
 * fixtures in `api/seed/dev/`. The logic and its guarantees live in
 * `bootstrap/seed-dev.ts`, exercised by `seed-dev.spec.ts`.
 *
 * Refuses NODE_ENV=production and any MONGODB_URI that is not this machine.
 *
 * Reads `api/.env` (via `node --env-file-if-exists`), so it can check the
 * address before Nest opens a connection to it.
 * Requires for `seed:dev`: MONGODB_URI, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD
 * Requires for `seed:export`: MONGODB_URI
 */
const FIXTURES_DIR = fileURLToPath(new URL('../seed/dev/', import.meta.url));

async function main(): Promise<void> {
  const exporting = process.argv.includes('--export');
  const reset = process.argv.includes('--reset');

  assertSafeDevTarget(process.env.MONGODB_URI, process.env.NODE_ENV);
  const admin = exporting ? null : readBootstrapAdminInput(process.env);

  // See bootstrap-admin.ts: without `abortOnError: false` a failure here is a silent exit 1.
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
    abortOnError: false,
  });

  try {
    const connection = app.get<Connection>(getConnectionToken());

    if (exporting) {
      const fixtures = await exportDevFixtures(connection);
      await writeDevFixtures(FIXTURES_DIR, fixtures);
      for (const [collection, docs] of fixtures) log(`exported ${collection}: ${docs.length}`);
      log(`written to ${FIXTURES_DIR} — review the diff before committing`);
      return;
    }

    const bootstrap = await runBootstrap(
      {
        permissions: app.get<Model<Permission>>(getModelToken(Permission.name)),
        roles: app.get<Model<Role>>(getModelToken(Role.name)),
        users: app.get<Model<User>>(getModelToken(User.name)),
      },
      admin!,
    );
    log(`permissions: ${bootstrap.permissionCount} · administrator ${admin!.email}: ${bootstrap.userCreated ? 'created' : 'already existed'}`);

    const report = await seedDevFixtures(connection, await loadDevFixtures(FIXTURES_DIR), { reset });
    for (const row of report) {
      log(`${row.collection.padEnd(20)} inserted ${row.inserted} · replaced ${row.replaced} · kept ${row.skipped}`);
    }
    log(reset ? 'reset: fixture versions restored' : 'done: only what was missing was added');
  } finally {
    await app.close();
  }
}

function log(message: string): void {
  // eslint-disable-next-line no-console
  console.log(`[seed] ${message}`);
}

try {
  await main();
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(`[seed] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
