import { MongoMemoryServer } from 'mongodb-memory-server';
import { apiPath } from './support/api-path.js';

process.env.MONGODB_URI ??= 'placeholder-overwritten-below';
process.env.JWT_SECRET ??= 'e2e-test-secret-at-least-32-characters-long';
process.env.JWT_ACCESS_EXPIRY ??= '15m';
process.env.JWT_REFRESH_EXPIRY ??= '7d';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri('uaeaf-e2e-jwt-token-type');
});

afterAll(async () => {
  await mongoServer.stop();
});

/**
 * Reproduces auth-security-audit-2026-09-05.md P1 (§8/§20): before the
 * `type` claim, a refresh token passed JwtStrategy as a valid access token
 * — full 200 access on a route with no @RequirePermission() (GET /users/me)
 * and an unhandled 500 on a route that has one (GET /roles), instead of a
 * clean 401 on both. Also confirms the reverse direction: an access token
 * presented to POST /auth/refresh is rejected too.
 */
describe('Refresh and access tokens cannot be used as each other (e2e)', () => {
  it('rejects a refresh token used as a Bearer access token, on routes with and without @RequirePermission()', async () => {
    const { Test } = await import('@nestjs/testing');
    const { ValidationPipe, INestApplication } = await import('@nestjs/common');
    const { getModelToken } = await import('@nestjs/mongoose');
    const request = (await import('supertest')).default;
    const bcrypt = await import('bcryptjs');

    const { AppModule } = await import('../../src/app.module.js');
    const { User } = await import('../../src/modules/platform-administration/users/schemas/user.schema.js');

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app: InstanceType<typeof INestApplication> = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();

    const userModel = moduleFixture.get(getModelToken(User.name));
    const passwordHash = await bcrypt.hash('correct horse battery staple', 10);
    await userModel.create({
      name: { en: 'Plain User', ar: 'مستخدم عادي' },
      email: 'plain@uaeaf.ae',
      accountStatus: 'Active',
      roleIds: [],
      authMethods: [{ provider: 'Local', passwordHash, linkedAt: new Date() }],
    });

    const login = await request(app.getHttpServer())
      .post(apiPath('/auth/login'))
      .send({ email: 'plain@uaeaf.ae', password: 'correct horse battery staple' })
      .expect(200);
    const { accessToken, refreshToken } = login.body as { accessToken: string; refreshToken: string };

    // Baseline: the genuine access token works on a route with no
    // @RequirePermission() (JwtAuthGuard-only) — proves the rejection below
    // is specifically about token type, not a broken route.
    await request(app.getHttpServer())
      .get(apiPath('/users/me'))
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // --- The refresh token, presented as a Bearer access token, must be
    // rejected with 401 on a route with no @RequirePermission() (previously
    // a full 200) ---
    await request(app.getHttpServer())
      .get(apiPath('/users/me'))
      .set('Authorization', `Bearer ${refreshToken}`)
      .expect(401);

    // --- ...and 401 on a route that DOES have @RequirePermission()
    // (previously an unhandled 500, since payload.permissions was undefined) ---
    await request(app.getHttpServer())
      .get(apiPath('/roles'))
      .set('Authorization', `Bearer ${refreshToken}`)
      .expect(401);

    // --- Reverse direction: an access token presented to /auth/refresh
    // must be rejected too, not accepted as if it were a refresh token ---
    await request(app.getHttpServer())
      .post(apiPath('/auth/refresh'))
      .send({ refreshToken: accessToken })
      .expect(401);

    // --- Sanity: the genuine refresh token still works for its own purpose ---
    await request(app.getHttpServer())
      .post(apiPath('/auth/refresh'))
      .send({ refreshToken })
      .expect(200);

    await app.close();
  }, 60000);
});
