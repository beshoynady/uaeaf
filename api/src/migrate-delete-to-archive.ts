import { pathToFileURL } from 'node:url';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AppModule } from './app.module.js';
import { assertSafeDevTarget } from './bootstrap/dev-database.js';
import type { PermissionAction } from './modules/platform-administration/permissions/schemas/permission.schema.js';
import type { PermissionResource } from './common/constants/permission-resources.js';

/**
 * The row shape this migration reads and writes.
 *
 * `action` here is `PermissionAction | 'Delete'`, not the schema's own
 * `PermissionAction`: that union stopped including `'Delete'` the moment
 * ADR-0103 renamed it to `Archive` (Task 1), so it can no longer type the
 * very rows this migration exists to find — documents written before the
 * rename that still carry the old string in the database, unaffected by a
 * change to the application's TypeScript types.
 */
export interface PermissionMigrationRow {
  resourceType: PermissionResource;
  action: PermissionAction | 'Delete';
}

/**
 * Rewrites stored `permissions.action` from `Delete` to `Archive`.
 *
 * Needed because `sync-permission-catalogue.ts` upserts on the
 * `(resourceType, action)` pair: after the rename it would INSERT 47 new
 * `Archive` rows and leave 47 orphaned `Delete` rows that every existing role
 * still points at. The roles are untouched here — they reference permissions by
 * id, and the id does not change.
 *
 * Idempotent: a second run finds no `Delete` rows and reports zero.
 *
 * @throws when a resource already has BOTH rows — a partial earlier run or a
 *   hand edit. Rewriting would collide with the unique pair index, so it stops
 *   and names the resource rather than half-finishing.
 */
export const migrateDeleteToArchive = async (
  permissions: Model<PermissionMigrationRow>,
): Promise<{ rewritten: number }> => {
  const stale = await permissions.find({ action: 'Delete' }).select('resourceType').lean().exec();
  if (stale.length === 0) {
    return { rewritten: 0 };
  }

  const collisions = await permissions
    .find({ action: 'Archive', resourceType: { $in: stale.map((row) => row.resourceType) } })
    .select('resourceType')
    .lean()
    .exec();
  if (collisions.length > 0) {
    throw new Error(
      `Cannot rename: ${collisions.map((c) => c.resourceType).join(', ')} already has an Archive row.`,
    );
  }

  const result = await permissions.updateMany({ action: 'Delete' }, { $set: { action: 'Archive' } });
  return { rewritten: result.modifiedCount };
};

const log = (message: string): void => {
  // eslint-disable-next-line no-console
  console.log(`[migrate:delete-to-archive] ${message}`);
};

/**
 * Entrypoint, following the shape of `sync-permission-catalogue.ts`:
 *
 *   node --env-file-if-exists=.env dist-seed/migrate-delete-to-archive.js
 *
 * Order relative to `sync:permissions`: either order is safe — the resolver
 * a stale permission id passes through (`RolesService.resolvePermissions`)
 * already tolerates an id that resolves to nothing, so a `Delete` row that
 * `sync:permissions` has not yet turned into an orphan cannot grant anything
 * unexpected either way (see `migrate-delete-to-archive.spec.ts`, first
 * test). Preferably run AFTER `sync:permissions`: the collection is smaller
 * by then (nothing still named `Delete` from a catalogue entry that was
 * already re-synced), so the report here is shorter and cheaper to read —
 * a preference, not a correctness requirement.
 *
 * Refuses NODE_ENV=production and any MONGODB_URI that is not this machine.
 */
const main = async (): Promise<void> => {
  assertSafeDevTarget(process.env.MONGODB_URI, process.env.NODE_ENV);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
    abortOnError: false,
  });

  try {
    const model = app.get<Model<PermissionMigrationRow>>(getModelToken('Permission'));
    const result = await migrateDeleteToArchive(model);
    log(`${result.rewritten} row(s) rewritten from Delete to Archive.`);
  } finally {
    await app.close();
  }
};

// Only when this file is run directly (`node migrate-delete-to-archive.js`),
// never on import — `migrate-delete-to-archive.spec.ts` imports
// `migrateDeleteToArchive` from this same file, and importing it must not
// itself connect to a database. The owner runs this script; nothing else
// invokes `main`.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error('[migrate:delete-to-archive] failed:', error);
    process.exitCode = 1;
  });
}
