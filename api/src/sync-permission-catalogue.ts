import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AppModule } from './app.module.js';
import { assertSafeDevTarget } from './bootstrap/dev-database.js';
import { seedPermissions, seedSuperAdminRole } from './bootstrap/seed-admin.js';

/**
 * Brings the stored permissions back in line with `PERMISSION_CATALOGUE`.
 *
 *   npm run sync:permissions
 *
 * The two halves of `bootstrap:admin` that are about permissions, without the
 * third: it never creates or touches a user, so it needs no credentials and
 * cannot change anyone's password. That is the whole reason it exists — adding
 * a permission to the catalogue should not require the admin's password to be
 * sitting in a `.env` file.
 *
 * It calls the bootstrap's own functions rather than writing rows itself, so
 * there is one definition of what a permission row looks like. `seedPermissions`
 * upserts every catalogue entry; `seedSuperAdminRole` then sets the Super Admin
 * role's list to exactly those ids, which is also how a permission removed from
 * the catalogue stops being granted.
 *
 * Built with `tsc` into `dist-seed/`, never `nest build`: `nest build` deletes
 * `dist/` and stops a running API (owner decision 2026-09-17). Refuses
 * NODE_ENV=production and any MONGODB_URI that is not this machine.
 */
const log = (message: string): void => {
  // eslint-disable-next-line no-console
  console.log(`[sync:permissions] ${message}`);
};

const main = async (): Promise<void> => {
  assertSafeDevTarget(process.env.MONGODB_URI, process.env.NODE_ENV);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
    abortOnError: false,
  });

  try {
    const model = <T>(name: string) => app.get<Model<T>>(getModelToken(name));

    const permissionIds = await seedPermissions(model('Permission'));
    const roleId = await seedSuperAdminRole(model('Role'), permissionIds);

    log(`${permissionIds.length} permissions in the catalogue are stored.`);
    log(`Super Admin (${roleId.toString()}) now holds exactly those.`);
  } finally {
    await app.close();
  }
};

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('[sync:permissions] failed:', error);
  process.exitCode = 1;
});
