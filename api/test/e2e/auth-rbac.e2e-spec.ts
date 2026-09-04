import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.MONGODB_URI ??= 'placeholder-overwritten-below';
process.env.JWT_SECRET ??= 'e2e-test-secret-at-least-32-characters-long';
process.env.JWT_ACCESS_EXPIRY ??= '15m';
process.env.JWT_REFRESH_EXPIRY ??= '7d';

let mongoServer: MongoMemoryServer;

// MONGODB_URI must be set before AppModule (and its ConfigModule) is
// imported, since @nestjs/config reads process.env at import/bootstrap
// time — so the server starts and the env var is patched in a Jest
// globalSetup-style block up front, before the dynamic imports below.
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri('uaeaf-e2e');
});

afterAll(async () => {
  await mongoServer.stop();
});

describe('Auth + RBAC (e2e)', () => {
  it('runs the full login/RBAC flow against a real, ephemeral MongoDB', async () => {
    const { Test } = await import('@nestjs/testing');
    const { ValidationPipe, INestApplication } = await import('@nestjs/common');
    const { getModelToken } = await import('@nestjs/mongoose');
    const request = (await import('supertest')).default;
    const { Types } = await import('mongoose');

    const { AppModule } = await import('../../src/app.module.js');
    const { Role } = await import('../../src/modules/platform-administration/roles/schemas/role.schema.js');
    const { Permission } = await import('../../src/modules/platform-administration/permissions/schemas/permission.schema.js');
    const { User } = await import('../../src/modules/platform-administration/users/schemas/user.schema.js');
    const bcrypt = await import('bcryptjs');

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app: InstanceType<typeof INestApplication> = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    const { AuditLog } = await import('../../src/modules/audit-logs/schemas/audit-log.schema.js');
    const roleModel = moduleFixture.get(getModelToken(Role.name));
    const permissionModel = moduleFixture.get(getModelToken(Permission.name));
    const userModel = moduleFixture.get(getModelToken(User.name));
    const auditLogModel = moduleFixture.get(getModelToken(AuditLog.name));

    const readRolesPermission = await permissionModel.create({
      name: { en: 'View roles', ar: 'عرض الأدوار' },
      resourceType: 'roles',
      action: 'Read',
    });
    const viewerRole = await roleModel.create({
      name: { en: 'Role Viewer', ar: 'مشاهد الأدوار' },
      permissionIds: [readRolesPermission._id],
      isSystemRole: false,
    });

    const activePasswordHash = await bcrypt.hash('correct horse battery staple', 10);
    await userModel.create({
      name: { en: 'Active No-Permissions User', ar: 'مستخدم نشط بلا صلاحيات' },
      email: 'no-permissions@uaeaf.ae',
      accountStatus: 'Active',
      roleIds: [],
      authMethods: [{ provider: 'Local', passwordHash: activePasswordHash, linkedAt: new Date() }],
    });
    await userModel.create({
      name: { en: 'Role Viewer User', ar: 'مستخدم مشاهد الأدوار' },
      email: 'viewer@uaeaf.ae',
      accountStatus: 'Active',
      roleIds: [viewerRole._id],
      authMethods: [{ provider: 'Local', passwordHash: activePasswordHash, linkedAt: new Date() }],
    });
    await userModel.create({
      name: { en: 'Suspended User', ar: 'مستخدم موقوف' },
      email: 'suspended@uaeaf.ae',
      accountStatus: 'Suspended',
      roleIds: [],
      authMethods: [{ provider: 'Local', passwordHash: activePasswordHash, linkedAt: new Date() }],
    });

    // --- login: wrong password -> 401 ---
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'no-permissions@uaeaf.ae', password: 'wrong password entirely' })
      .expect(401);

    // --- login: suspended account, correct password -> 401 ---
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'suspended@uaeaf.ae', password: 'correct horse battery staple' })
      .expect(401);

    // --- login: success -> 200 with tokens ---
    const noPermissionsLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'no-permissions@uaeaf.ae', password: 'correct horse battery staple' })
      .expect(200);
    expect(noPermissionsLogin.body.accessToken).toEqual(expect.any(String));
    const noPermissionsToken = noPermissionsLogin.body.accessToken as string;

    const viewerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'viewer@uaeaf.ae', password: 'correct horse battery staple' })
      .expect(200);
    const viewerToken = viewerLogin.body.accessToken as string;

    // --- GET /users/me: no token -> 401 ---
    await request(app.getHttpServer()).get('/users/me').expect(401);

    // --- GET /users/me: valid token -> 200, correct identity ---
    const me = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${noPermissionsToken}`)
      .expect(200);
    expect(me.body.email).toBe('no-permissions@uaeaf.ae');

    // --- GET /roles: token WITHOUT roles:Read -> 403, AND a collection-level
    // AccessDenied row is written with entityId: null (entityId is optional
    // on the live board specifically for this case) ---
    await request(app.getHttpServer())
      .get('/roles')
      .set('Authorization', `Bearer ${noPermissionsToken}`)
      .expect(403);
    const collectionLevelDenials = await auditLogModel.find({
      action: 'AccessDenied',
      entityType: 'roles',
      entityId: null,
    });
    expect(collectionLevelDenials).toHaveLength(1);
    expect(collectionLevelDenials[0].reason).toBe('Read on roles');

    // --- GET /roles/:id: token WITHOUT roles:Read -> 403, AND this time a
    // concrete :id is known, so it's a real AccessDenied row in auditLogs ---
    await request(app.getHttpServer())
      .get(`/roles/${viewerRole._id.toString()}`)
      .set('Authorization', `Bearer ${noPermissionsToken}`)
      .expect(403);
    const denialEntries = await auditLogModel.find({ entityId: viewerRole._id, action: 'AccessDenied' });
    expect(denialEntries).toHaveLength(1);
    expect(denialEntries[0].entityType).toBe('roles');
    expect(denialEntries[0].reason).toBe('Read on roles');

    // --- GET /roles: token WITH roles:Read -> 200 ---
    const rolesResponse = await request(app.getHttpServer())
      .get('/roles')
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(200);
    expect(Array.isArray(rolesResponse.body)).toBe(true);

    // --- GET /health: public, no token needed ---
    await request(app.getHttpServer()).get('/health').expect(200);

    // --- creating a role writes an auditLogs entry (needs roles:Create,
    // which neither seeded user has — grant it directly to prove the write
    // path, independent of the RBAC checks already covered above) ---
    const createRolesPermission = await permissionModel.create({
      name: { en: 'Create roles', ar: 'إنشاء الأدوار' },
      resourceType: 'roles',
      action: 'Create',
    });
    await roleModel.findByIdAndUpdate(viewerRole._id, {
      $push: { permissionIds: createRolesPermission._id },
    });
    const refreshed = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: viewerLogin.body.refreshToken })
      .expect(200);
    const refreshedToken = refreshed.body.accessToken as string;

    const created = await request(app.getHttpServer())
      .post('/roles')
      .set('Authorization', `Bearer ${refreshedToken}`)
      .send({ name: { en: 'Results Approver', ar: 'معتمد النتائج' }, permissionIds: [] })
      .expect(201);

    const auditEntries = await auditLogModel.find({ entityId: new Types.ObjectId(created.body._id) });
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0].action).toBe('Create');
    expect(auditEntries[0].entityType).toBe('roles');

    await app.close();
  }, 60000);
});
