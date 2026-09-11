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
  process.env.MONGODB_URI = mongoServer.getUri('uaeaf-e2e-password-leak');
});

afterAll(async () => {
  await mongoServer.stop();
});

/**
 * Reproduces auth-security-audit-2026-09-05.md P0 #1: `GET /users`,
 * `GET /users/:id`, and `GET /users/me` used to return the raw Mongoose
 * document, including `authMethods[].passwordHash` (a live bcrypt hash).
 * Against the pre-fix code this test would fail — the response body
 * contained the literal hash string. It now must never appear, at any
 * nesting level, while login (which still needs the hash internally)
 * keeps working.
 */
describe('User responses never leak passwordHash (e2e)', () => {
  it('excludes authMethods/passwordHash from GET /users, GET /users/:id, GET /users/me — login still works', async () => {
    const { Test } = await import('@nestjs/testing');
    const { INestApplication } = await import('@nestjs/common');
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

    const readUsersPermission = await permissionModel.create({
      name: { en: 'View users', ar: 'عرض المستخدمين' },
      resourceType: 'users',
      action: 'Read',
    });
    const readerRole = await roleModel.create({
      name: { en: 'User Reader', ar: 'قارئ المستخدمين' },
      permissionIds: [readUsersPermission._id],
      isSystemRole: false,
    });

    const passwordHash = await bcrypt.hash('correct horse battery staple', 10);
    const reader = await userModel.create({
      name: { en: 'Reader', ar: 'قارئ' },
      email: 'reader@uaeaf.ae',
      accountStatus: 'Active',
      roleIds: [readerRole._id],
      authMethods: [{ provider: 'Local', passwordHash, linkedAt: new Date() }],
    });

    // Login must still succeed — proves the schema's `select: false` on
    // passwordHash didn't silently break the one internal caller
    // (UsersRepository.findByEmail()) that legitimately needs it.
    const login = await request(app.getHttpServer())
      .post(apiPath('/auth/login'))
      .send({ email: 'reader@uaeaf.ae', password: 'correct horse battery staple' })
      .expect(200);
    const token = login.body.accessToken as string;

    const assertNoHashLeak = (body: unknown) => {
      const raw = JSON.stringify(body);
      expect(raw).not.toContain(passwordHash);
      expect(raw).not.toContain('passwordHash');
      expect(raw).not.toContain('authMethods');
    };

    const me = await request(app.getHttpServer())
      .get(apiPath('/users/me'))
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    assertNoHashLeak(me.body);
    expect(me.body.email).toBe('reader@uaeaf.ae');

    const list = await request(app.getHttpServer())
      .get(apiPath('/users'))
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    assertNoHashLeak(list.body);

    const single = await request(app.getHttpServer())
      .get(apiPath(`/users/${reader._id.toString()}`))
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    assertNoHashLeak(single.body);

    await app.close();
  }, 60000);
});
