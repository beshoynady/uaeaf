import mongoose, { Schema, Types } from 'mongoose';
import type { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
  registerTestModel,
} from '../test/utils/mongo-memory-server.js';
import { migrateDeleteToArchive } from './migrate-delete-to-archive.js';
import type { PermissionMigrationRow } from './migrate-delete-to-archive.js';
import { Role, RoleSchema } from './modules/platform-administration/roles/schemas/role.schema.js';
import { Permission, PermissionSchema } from './modules/platform-administration/permissions/schemas/permission.schema.js';
import { RolesRepository } from './modules/platform-administration/roles/roles.repository.js';
import { RolesService } from './modules/platform-administration/roles/roles.service.js';
import type { RoleAssignmentsRepository } from './modules/platform-administration/roles/role-assignments.repository.js';
import { PermissionsRepository } from './modules/platform-administration/permissions/permissions.repository.js';
import { PermissionsService } from './modules/platform-administration/permissions/permissions.service.js';

/**
 * ADR-0103's data half: renaming stored `permissions.action` from `Delete`
 * to `Archive` so `sync-permission-catalogue.ts` (which upserts on the
 * `(resourceType, action)` pair and never deletes) does not leave 47 orphaned
 * `Delete` rows sitting in the collection, selectable in the role-building
 * picker and guarding nothing.
 *
 * The fixture model below is deliberately NOT the application's own
 * `Permission` model: that model's schema now enforces the CURRENT action
 * enum (no `Delete`), so writing a pre-rename row through it would be
 * rejected by the very validation this migration exists to work around. It
 * targets the same `permissions` collection, so the real `PermissionsService`
 * (used in the first test, unaffected by write-time validation on read) sees
 * exactly the same documents.
 */
describe('migrate-delete-to-archive', () => {
  let server: MongoMemoryServer;
  let permissions: Model<PermissionMigrationRow>;
  let roles: RolesRepository;
  let rolesService: RolesService;

  beforeAll(async () => {
    server = await connectTestDatabase();

    permissions = registerTestModel<PermissionMigrationRow>(
      'PermissionMigrationFixture',
      new Schema(
        {
          resourceType: { type: String, required: true },
          action: { type: String, required: true },
          name: {
            en: { type: String, required: true },
            ar: { type: String, required: true },
          },
          archivedAt: { type: Date, default: null },
        },
        { collection: 'permissions', timestamps: true },
      ),
    );

    const roleModel = mongoose.models[Role.name] ?? mongoose.model(Role.name, RoleSchema);
    const permissionModel = mongoose.models[Permission.name] ?? mongoose.model(Permission.name, PermissionSchema);

    roles = new RolesRepository(roleModel as never);
    const permissionsRepository = new PermissionsRepository(permissionModel as never);
    // Constructed directly, same as access-control.integration.spec.ts: this
    // spec exercises permission resolution, not application bootstrap, so
    // PermissionsService's onApplicationBootstrap validation is not run.
    const permissionsService = new PermissionsService(permissionsRepository, mongoose.connection);
    const roleAssignments = {
      detachRole: () => {
        throw new Error('detachRole is not part of permission resolution');
      },
    } as unknown as RoleAssignmentsRepository;
    rolesService = new RolesService(roles, permissionsService, roleAssignments);
  }, 60000);

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  }, 60000);

  // Q-E condition (1). Already true; the test is what was missing. This is
  // also what makes the script order-independent relative to E1.
  it('lets a role survive pointing at a permission row that no longer exists', async () => {
    const [row] = await permissions.insertMany([
      { resourceType: 'articles', action: 'Delete', name: { en: 'x', ar: 'x' } },
    ]);
    const missingId = new Types.ObjectId();
    const role = await roles.create({
      name: { en: 'r', ar: 'r' },
      permissionIds: [row._id, missingId],
    });

    const resolved = await rolesService.resolvePermissions([role._id.toString()]);

    // The unresolvable id contributes nothing and throws nothing.
    expect(resolved).toEqual([{ resourceType: 'articles', action: 'Delete' }]);
  });

  it('leaves the role documents alone — E1 owns those, and roles reference by id', async () => {
    const [row] = await permissions.insertMany([
      { resourceType: 'articles', action: 'Delete', name: { en: 'x', ar: 'x' } },
    ]);
    const role = await roles.create({ name: { en: 'r', ar: 'r' }, permissionIds: [row._id] });

    await migrateDeleteToArchive(permissions);

    // The id does not change, so nothing in `roles` needs rewriting. This is
    // the half of the original draft that E1 already covered.
    const after = await roles.findById(role._id.toString());
    expect(after?.permissionIds[0].toString()).toBe(row._id.toString());
  });

  it('rewrites every stored Delete row to Archive', async () => {
    await permissions.insertMany([
      { resourceType: 'articles', action: 'Delete', name: { en: 'x', ar: 'x' } },
      { resourceType: 'clubs', action: 'Delete', name: { en: 'y', ar: 'y' } },
    ]);

    const result = await migrateDeleteToArchive(permissions);

    expect(result.rewritten).toBe(2);
    expect(await permissions.countDocuments({ action: 'Delete' })).toBe(0);
    expect(await permissions.countDocuments({ action: 'Archive' })).toBe(2);
  });

  it('is idempotent — a second run rewrites nothing and reports zero', async () => {
    await permissions.insertMany([{ resourceType: 'articles', action: 'Delete', name: { en: 'x', ar: 'x' } }]);

    await migrateDeleteToArchive(permissions);
    const second = await migrateDeleteToArchive(permissions);

    expect(second.rewritten).toBe(0);
  });

  it('refuses to run when an Archive row already exists for the same resource', async () => {
    // Both rows present means a partial earlier run or a hand edit. Rewriting
    // would violate the unique (resourceType, action) pair.
    await permissions.insertMany([
      { resourceType: 'articles', action: 'Delete', name: { en: 'x', ar: 'x' } },
      { resourceType: 'articles', action: 'Archive', name: { en: 'z', ar: 'z' } },
    ]);

    await expect(migrateDeleteToArchive(permissions)).rejects.toThrow(/already has an Archive/);
  });
});
