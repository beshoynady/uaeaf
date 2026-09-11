import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../test/utils/mongo-memory-server.js';
import { PERMISSION_CATALOGUE } from '../common/constants/permission-catalogue.js';
import { Permission, PermissionSchema } from '../modules/platform-administration/permissions/schemas/permission.schema.js';
import { Role, RoleSchema } from '../modules/platform-administration/roles/schemas/role.schema.js';
import { User, UserSchema } from '../modules/platform-administration/users/schemas/user.schema.js';
import { MIN_PASSWORD_LENGTH, readBootstrapAdminInput, runBootstrap, type BootstrapModels } from './seed-admin.js';

/**
 * Runs the real seeding logic against a real MongoDB.
 *
 * The property that matters is idempotency — this script is meant to be
 * re-run on every deploy — and a single manual run against a live cluster
 * cannot demonstrate it. Nearly every case below is therefore about the
 * SECOND run.
 */
describe('runBootstrap', () => {
  let server: MongoMemoryServer;
  let models: BootstrapModels;

  const input = {
    email: 'admin@uaeaf.ae',
    password: 'a-sufficiently-long-password',
    nameEn: 'Platform Administrator',
    nameAr: 'مسؤول المنصة',
  };

  beforeAll(async () => {
    server = await connectTestDatabase();
    models = {
      permissions: mongoose.model<Permission>('Permission', PermissionSchema),
      roles: mongoose.model<Role>('Role', RoleSchema),
      users: mongoose.model<User>('User', UserSchema),
    };
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  it('seeds exactly the permissions the codebase actually guards', async () => {
    const result = await runBootstrap(models, input);

    expect(result.permissionCount).toBe(PERMISSION_CATALOGUE.length);
    expect(await models.permissions.countDocuments()).toBe(PERMISSION_CATALOGUE.length);
  });

  it('gives the Super Admin role every seeded permission', async () => {
    const result = await runBootstrap(models, input);

    const role = await models.roles.findById(result.roleId).exec();
    expect(role?.permissionIds).toHaveLength(PERMISSION_CATALOGUE.length);
    expect(role?.isSystemRole).toBe(true);
    // isSystemRole is what stops RolesService from renaming or deleting it —
    // seeding it as false would leave the platform's own root role casually
    // removable from the dashboard.
  });

  it('creates the administrator holding that role, with a hashed password', async () => {
    const result = await runBootstrap(models, input);

    const user = await models.users.findOne({ email: input.email }).select('+authMethods.passwordHash').exec();
    expect(result.userCreated).toBe(true);
    expect(user?.accountStatus).toBe('Active');
    expect(user?.roleIds.map(String)).toEqual([result.roleId.toString()]);

    // `passwordHash` is `select: false` on the schema, so it has to be
    // asked for explicitly — the same `.select('+authMethods.passwordHash')`
    // UsersRepository.findByEmail uses for the login comparison.
    const stored = user?.authMethods[0].passwordHash as string;
    expect(stored).not.toBe(input.password);
    expect(await bcrypt.compare(input.password, stored)).toBe(true);
  });

  it('creates nothing extra on a second run', async () => {
    await runBootstrap(models, input);
    const second = await runBootstrap(models, input);

    expect(second.userCreated).toBe(false);
    expect(await models.permissions.countDocuments()).toBe(PERMISSION_CATALOGUE.length);
    expect(await models.roles.countDocuments()).toBe(1);
    expect(await models.users.countDocuments()).toBe(1);
  });

  it('keeps the same role document across runs rather than replacing it', async () => {
    // Roles are referenced by userId -> roleIds. A second run that created a
    // fresh role would silently strip every existing user of their access
    // while appearing to succeed.
    const first = await runBootstrap(models, input);
    const second = await runBootstrap(models, input);

    expect(second.roleId.toString()).toBe(first.roleId.toString());
  });

  it('leaves an existing administrator password untouched', async () => {
    await runBootstrap(models, input);
    const before = await models.users.findOne({ email: input.email }).select('+authMethods.passwordHash').exec();

    await runBootstrap(models, { ...input, password: 'a-completely-different-password' });

    const after = await models.users.findOne({ email: input.email }).select('+authMethods.passwordHash').exec();
    expect(after?.authMethods[0].passwordHash).toBe(before?.authMethods[0].passwordHash);
  });

  it('does not re-grant Super Admin to an account that was deliberately demoted', async () => {
    // This script runs on deploy. Restoring a role an administrator removed
    // on purpose would be a privilege escalation performed by automation.
    await runBootstrap(models, input);
    await models.users.updateOne({ email: input.email }, { $set: { roleIds: [] } }).exec();

    await runBootstrap(models, input);

    const user = await models.users.findOne({ email: input.email }).exec();
    expect(user?.roleIds).toEqual([]);
  });

  it('preserves a permission label an administrator has renamed', async () => {
    const entry = PERMISSION_CATALOGUE[0];
    await runBootstrap(models, input);
    await models.permissions
      .updateOne(
        { resourceType: entry.resourceType, action: entry.action },
        { $set: { name: { en: 'Renamed by an admin', ar: 'اسم معدّل' } } },
      )
      .exec();

    await runBootstrap(models, input);

    const permission = await models.permissions
      .findOne({ resourceType: entry.resourceType, action: entry.action })
      .exec();
    expect(permission?.name.en).toBe('Renamed by an admin');
  });

  it('adds a newly released permission to the existing role on re-run', async () => {
    // The reason re-running is the intended workflow: a release adds guarded
    // routes, and the Super Admin must pick them up without being rebuilt.
    await runBootstrap(models, input);
    const entry = PERMISSION_CATALOGUE[0];
    await models.permissions
      .deleteOne({ resourceType: entry.resourceType, action: entry.action })
      .exec();
    await models.roles.updateOne({}, { $pop: { permissionIds: 1 } }).exec();

    const result = await runBootstrap(models, input);

    const role = await models.roles.findById(result.roleId).exec();
    expect(role?.permissionIds).toHaveLength(PERMISSION_CATALOGUE.length);
  });

  it('stores every resourceType as a value the schema enum accepts', async () => {
    // The enum added on 2026-09-07 rejects unknown resources at write time.
    // If the catalogue and the enum ever disagreed, the seed would fail
    // partway and leave a half-populated permissions collection.
    await expect(runBootstrap(models, input)).resolves.toBeDefined();

    const invalid = await models.permissions.countDocuments({
      resourceType: { $nin: PERMISSION_CATALOGUE.map((entry) => entry.resourceType) },
    });
    expect(invalid).toBe(0);
  });
});

/**
 * `bootstrap:admin` and `seed:dev` both create the first administrator from
 * the environment. One reader, so the two can never disagree about what a
 * valid administrator is.
 */
describe('readBootstrapAdminInput', () => {
  const env = {
    BOOTSTRAP_ADMIN_EMAIL: '  Admin@UAEAF.ae ',
    BOOTSTRAP_ADMIN_PASSWORD: 'a-sufficiently-long-password',
  };

  it('normalises the email and falls back to the default names', () => {
    expect(readBootstrapAdminInput(env)).toEqual({
      email: 'admin@uaeaf.ae',
      password: 'a-sufficiently-long-password',
      nameEn: 'Platform Administrator',
      nameAr: 'مسؤول المنصة',
    });
  });

  it('takes the names from the environment when they are given', () => {
    const input = readBootstrapAdminInput({ ...env, BOOTSTRAP_ADMIN_NAME_EN: 'Ops', BOOTSTRAP_ADMIN_NAME_AR: 'العمليات' });
    expect([input.nameEn, input.nameAr]).toEqual(['Ops', 'العمليات']);
  });

  it.each(['BOOTSTRAP_ADMIN_EMAIL', 'BOOTSTRAP_ADMIN_PASSWORD'])('names %s when it is missing', (name) => {
    expect(() => readBootstrapAdminInput({ ...env, [name]: undefined })).toThrow(name);
  });

  it('holds the password to the same minimum the API applies, and never echoes it', () => {
    expect(() => readBootstrapAdminInput({ ...env, BOOTSTRAP_ADMIN_PASSWORD: 'short-pw' })).toThrow(
      expect.objectContaining({ message: expect.stringContaining(String(MIN_PASSWORD_LENGTH)) }),
    );
    expect(() => readBootstrapAdminInput({ ...env, BOOTSTRAP_ADMIN_PASSWORD: 'short-pw' })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('short-pw') }),
    );
  });
});
