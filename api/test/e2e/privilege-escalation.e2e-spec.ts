import { MongoMemoryServer } from 'mongodb-memory-server';
import { apiPath } from './support/api-path.js';
import { configureTestApp } from './support/test-app.js';

process.env.MONGODB_URI ??= 'placeholder-overwritten-below';
process.env.JWT_SECRET ??= 'e2e-test-secret-at-least-32-characters-long';
process.env.JWT_ACCESS_EXPIRY ??= '15m';
process.env.JWT_REFRESH_EXPIRY ??= '7d';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri('uaeaf-e2e-privilege-escalation');
});

afterAll(async () => {
  await mongoServer.stop();
});

/**
 * Reproduces the exact chain from auth-security-audit-2026-09-05.md §16:
 * an actor holding only roles:Create + roles:Update + permissions:Read +
 * users:Update could (1) create a role carrying a permission they don't
 * hold, (2) rewrite an existing role's (including a system role's)
 * permissions the same way, and (3) self-assign the escalated role — all
 * without ever needing the escalated permission itself. Each of the three
 * points must now be rejected with 403, not silently succeed or 500.
 */
describe('Privilege escalation chain is blocked (e2e)', () => {
  it('rejects excess-permission role creation, role permission rewrites, system-role edits, and self-assignment — all with 403', async () => {
    const { Test } = await import('@nestjs/testing');
    const { ValidationPipe, INestApplication } = await import('@nestjs/common');
    const { getModelToken } = await import('@nestjs/mongoose');
    const request = (await import('supertest')).default;
    const bcrypt = await import('bcryptjs');

    const { AppModule } = await import('../../src/app.module.js');
    const { Role } = await import('../../src/modules/platform-administration/roles/schemas/role.schema.js');
    const { Permission } = await import(
      '../../src/modules/platform-administration/permissions/schemas/permission.schema.js'
    );
    const { User } = await import('../../src/modules/platform-administration/users/schemas/user.schema.js');

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app: InstanceType<typeof INestApplication> = moduleFixture.createNestApplication();
    configureTestApp(app);
    await app.init();

    const roleModel = moduleFixture.get(getModelToken(Role.name));
    const permissionModel = moduleFixture.get(getModelToken(Permission.name));
    const userModel = moduleFixture.get(getModelToken(User.name));

    // The permissions an "ordinary admin" plausibly holds — none of these
    // individually sounds like "god mode".
    const rolesCreate = await permissionModel.create({ name: { en: 'x', ar: 'س' }, resourceType: 'roles', action: 'Create' });
    const rolesUpdate = await permissionModel.create({ name: { en: 'x', ar: 'س' }, resourceType: 'roles', action: 'Update' });
    const rolesRead = await permissionModel.create({ name: { en: 'x', ar: 'س' }, resourceType: 'roles', action: 'Read' });
    const usersUpdate = await permissionModel.create({ name: { en: 'x', ar: 'س' }, resourceType: 'users', action: 'Update' });
    // The permission the attacker does NOT hold — standing in for "every
    // permission in the system" from the audit's exploit description; one
    // excess permission is enough to prove the check works.
    const excessPermission = await permissionModel.create({
      name: { en: 'x', ar: 'س' },
      resourceType: 'permissions',
      action: 'Create',
    });

    const attackerRole = await roleModel.create({
      name: { en: 'Ordinary Admin', ar: 'مسؤول عادي' },
      permissionIds: [rolesCreate._id, rolesUpdate._id, rolesRead._id, usersUpdate._id],
      isSystemRole: false,
    });
    const systemRole = await roleModel.create({
      name: { en: 'Super Admin', ar: 'المشرف العام' },
      permissionIds: [rolesCreate._id, rolesUpdate._id, rolesRead._id, usersUpdate._id, excessPermission._id],
      isSystemRole: true,
    });

    const passwordHash = await bcrypt.hash('correct horse battery staple', 10);
    const attacker = await userModel.create({
      name: { en: 'Attacker', ar: 'مهاجم' },
      email: 'attacker@uaeaf.ae',
      accountStatus: 'Active',
      roleIds: [attackerRole._id],
      authMethods: [{ provider: 'Local', passwordHash, linkedAt: new Date() }],
    });
    const victim = await userModel.create({
      name: { en: 'Victim', ar: 'ضحية' },
      email: 'victim@uaeaf.ae',
      accountStatus: 'Active',
      roleIds: [],
      authMethods: [{ provider: 'Local', passwordHash, linkedAt: new Date() }],
    });

    const login = await request(app.getHttpServer())
      .post(apiPath('/auth/login'))
      .send({ email: 'attacker@uaeaf.ae', password: 'correct horse battery staple' })
      .expect(200);
    const token = login.body.accessToken as string;

    // --- Point 1: create a role carrying a permission not held -> 403, not created ---
    await request(app.getHttpServer())
      .post(apiPath('/roles'))
      .set('Authorization', `Bearer ${token}`)
      .send({ name: { en: 'Escalated', ar: 'مرتقى' }, permissionIds: [rolesRead._id.toString(), excessPermission._id.toString()] })
      .expect(403);
    expect(await roleModel.findOne({ 'name.en': 'Escalated' })).toBeNull();

    // --- Sanity: creating a role with only held permissions succeeds ---
    const legitRole = await request(app.getHttpServer())
      .post(apiPath('/roles'))
      .set('Authorization', `Bearer ${token}`)
      .send({ name: { en: 'Legit Role', ar: 'دور مشروع' }, permissionIds: [rolesRead._id.toString()] })
      .expect(201);
    const legitRoleId = legitRole.body._id as string;

    // --- Point 2: rewrite that role's permissions to add the excess one -> 403 ---
    await request(app.getHttpServer())
      .patch(apiPath(`/roles/${legitRoleId}/permissions`))
      .set('Authorization', `Bearer ${token}`)
      .send({ permissionIds: [rolesRead._id.toString(), excessPermission._id.toString()] })
      .expect(403);
    const untouchedRole = await roleModel.findById(legitRoleId);
    expect(untouchedRole?.permissionIds).toHaveLength(1);

    // --- System-role edit: even with only already-held permissions, a
    // system role's permission set cannot be rewritten at all (P0 #3) ---
    await request(app.getHttpServer())
      .patch(apiPath(`/roles/${systemRole._id.toString()}/permissions`))
      .set('Authorization', `Bearer ${token}`)
      .send({ permissionIds: [rolesRead._id.toString()] })
      .expect(403);

    // --- Point 3: self-assign a role -> 403, roleIds unchanged ---
    await request(app.getHttpServer())
      .patch(apiPath(`/users/${attacker._id.toString()}/roles`))
      .set('Authorization', `Bearer ${token}`)
      .send({ roleIds: [legitRoleId] })
      .expect(403);
    const untouchedAttacker = await userModel.findById(attacker._id);
    expect(untouchedAttacker?.roleIds.map((id: { toString(): string }) => id.toString())).toEqual([
      attackerRole._id.toString(),
    ]);

    // --- Sanity: assigning a role to someone else still works normally ---
    await request(app.getHttpServer())
      .patch(apiPath(`/users/${victim._id.toString()}/roles`))
      .set('Authorization', `Bearer ${token}`)
      .send({ roleIds: [legitRoleId] })
      .expect(200);

    await app.close();
  }, 60000);
});
