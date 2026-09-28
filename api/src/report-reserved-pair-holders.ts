import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import type { Model, Types } from 'mongoose';
import { AppModule } from './app.module.js';
import { assertSafeDevTarget } from './bootstrap/dev-database.js';
import { isSuperAdminOnly } from './common/authz/capability-map.js';

/**
 * Reports every non-Super-Admin role holding a `superAdminOnly` pair
 * (`capability-map.ts`), and every account that holds that role.
 *
 *   npm run report:reserved-pair-holders
 *
 * Read-only: it issues `find()` reads against `roles`, `permissions` and
 * `users` and writes nothing — no update, no delete, not even a harmless
 * one. Idempotent by construction, since a read is: running it twice
 * changes nothing and answers the same question again.
 *
 * Must run BEFORE `reset-roles` (E1, Batch 3): that script archives every
 * non-system role, so once it has run every non-system role's grant is gone
 * and this report finds nothing — the answer is only meaningful while the
 * roles it inspects are still live.
 *
 * Built with `tsc` into `dist-seed/`, never `nest build`: `nest build`
 * deletes `dist/` and stops a running API (owner decision 2026-09-17).
 * Refuses NODE_ENV=production and any MONGODB_URI that is not this machine.
 */

interface RoleLean {
  _id: Types.ObjectId;
  name: { en: string; ar: string };
  permissionIds: Types.ObjectId[];
  isSystemRole: boolean;
  archivedAt: Date | null;
}

interface PermissionLean {
  _id: Types.ObjectId;
  resourceType: string;
  action: string;
}

interface UserLean {
  _id: Types.ObjectId;
  email: string;
  name: { en: string; ar: string };
  accountStatus: string;
  archivedAt: Date | null;
}

const log = (message: string): void => {
  // eslint-disable-next-line no-console
  console.log(message);
};

const main = async (): Promise<void> => {
  assertSafeDevTarget(process.env.MONGODB_URI, process.env.NODE_ENV);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
    abortOnError: false,
  });

  try {
    const model = <T>(name: string) => app.get<Model<T>>(getModelToken(name));

    // Not scoped to `archivedAt: null`: an already-archived non-system role
    // still names its holders until `reset-roles` clears them, and the owner
    // deciding what to do next needs that too, not just the live roles.
    const roles = await model<RoleLean>('Role').find({ isSystemRole: { $ne: true } }).lean();
    const permissions = await model<PermissionLean>('Permission').find().lean();
    const permissionById = new Map(permissions.map((permission) => [permission._id.toString(), permission]));
    const users = model<UserLean>('User');

    let flagged = 0;

    for (const role of roles) {
      const reservedPairs = new Set<string>();
      for (const id of role.permissionIds) {
        const permission = permissionById.get(id.toString());
        if (permission && isSuperAdminOnly(permission.resourceType, permission.action)) {
          reservedPairs.add(`${permission.resourceType}:${permission.action}`);
        }
      }

      if (reservedPairs.size === 0) {
        continue;
      }

      flagged += 1;
      // Not scoped to `archivedAt: null` either — `RoleAssignmentsRepository`
      // leaves the reference on an archived account, so an archived holder of
      // a reserved pair is still a fact the owner needs, marked as archived
      // rather than silently dropped.
      const accounts = await users.find({ roleIds: role._id }).lean();

      log('');
      log(
        `Role: ${role.name.en} / ${role.name.ar} (${role._id.toString()})` +
          (role.archivedAt ? ' [archived]' : ''),
      );
      log(`  Reserved pairs held: ${[...reservedPairs].join(', ')}`);
      if (accounts.length === 0) {
        log('  Accounts holding this role: none');
      } else {
        log(`  Accounts holding this role (${accounts.length}):`);
        for (const account of accounts) {
          log(
            `    - ${account.email} — ${account.name.en} / ${account.name.ar} — ${account.accountStatus}` +
              (account.archivedAt ? ' [archived]' : '') +
              ` (${account._id.toString()})`,
          );
        }
      }
    }

    log('');
    log(
      flagged === 0
        ? 'No non-Super-Admin role holds a reserved pair.'
        : `${flagged} non-Super-Admin role(s) hold a reserved pair. See above.`,
    );
  } finally {
    await app.close();
  }
};

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('[report-reserved-pair-holders] failed:', error);
  process.exitCode = 1;
});
