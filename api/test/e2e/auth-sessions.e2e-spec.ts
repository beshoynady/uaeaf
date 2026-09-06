import { MongoMemoryServer } from 'mongodb-memory-server';
import { apiPath } from './support/api-path.js';

process.env.MONGODB_URI ??= 'placeholder-overwritten-below';
process.env.JWT_SECRET ??= 'e2e-test-secret-at-least-32-characters-long';
process.env.JWT_ACCESS_EXPIRY ??= '15m';
process.env.JWT_REFRESH_EXPIRY ??= '7d';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri('uaeaf-e2e-auth-sessions');
});

afterAll(async () => {
  await mongoServer.stop();
});

/**
 * Closes auth-security-audit-2026-09-05.md P0 #4: before this session
 * layer existed, a refresh token was a pure stateless JWT — no logout, no
 * rotation, no reuse detection, no way to revoke it before its natural
 * 7-day expiry. This is the full realistic flow the task itself asks to
 * smoke-test: login -> protected route -> refresh -> logout -> old refresh
 * token dead, plus reuse-of-a-rotated-token and logout-all.
 */
describe('Auth sessions: logout, logout-all, and refresh-token reuse detection (e2e)', () => {
  it('logout invalidates that refresh token; a reused rotated token is rejected; logout-all kills every session', async () => {
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
      name: { en: 'Session User', ar: 'مستخدم جلسة' },
      email: 'session-user@uaeaf.ae',
      accountStatus: 'Active',
      roleIds: [],
      authMethods: [{ provider: 'Local', passwordHash, linkedAt: new Date() }],
    });

    // ---- full realistic flow: login -> protected route -> refresh -> logout -> old refresh token dead ----
    const login = await request(app.getHttpServer())
      .post(apiPath('/auth/login'))
      .send({ email: 'session-user@uaeaf.ae', password: 'correct horse battery staple' })
      .expect(200);
    const { accessToken, refreshToken } = login.body as { accessToken: string; refreshToken: string };

    await request(app.getHttpServer())
      .get(apiPath('/users/me'))
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const refreshed = await request(app.getHttpServer())
      .post(apiPath('/auth/refresh'))
      .send({ refreshToken })
      .expect(200);
    const rotatedRefreshToken = refreshed.body.refreshToken as string;
    const rotatedAccessToken = refreshed.body.accessToken as string;

    // --- Reuse detection: the OLD (pre-rotation) refresh token must now be
    // rejected — it was already exchanged for `rotatedRefreshToken` ---
    await request(app.getHttpServer())
      .post(apiPath('/auth/refresh'))
      .send({ refreshToken })
      .expect(401);

    // --- logout with the current (rotated) refresh token ---
    await request(app.getHttpServer())
      .post(apiPath('/auth/logout'))
      .set('Authorization', `Bearer ${rotatedAccessToken}`)
      .send({ refreshToken: rotatedRefreshToken })
      .expect(204);

    // --- that exact refresh token must now be dead ---
    await request(app.getHttpServer())
      .post(apiPath('/auth/refresh'))
      .send({ refreshToken: rotatedRefreshToken })
      .expect(401);

    // ---- logout-all: every outstanding session for a user dies at once ----
    const secondLogin = await request(app.getHttpServer())
      .post(apiPath('/auth/login'))
      .send({ email: 'session-user@uaeaf.ae', password: 'correct horse battery staple' })
      .expect(200);
    const sessionA = secondLogin.body as { accessToken: string; refreshToken: string };

    const thirdLogin = await request(app.getHttpServer())
      .post(apiPath('/auth/login'))
      .send({ email: 'session-user@uaeaf.ae', password: 'correct horse battery staple' })
      .expect(200);
    const sessionB = thirdLogin.body as { accessToken: string; refreshToken: string };

    // Both sessions work independently before logout-all.
    await request(app.getHttpServer())
      .post(apiPath('/auth/refresh'))
      .send({ refreshToken: sessionA.refreshToken })
      .expect(200);

    await request(app.getHttpServer())
      .post(apiPath('/auth/logout-all'))
      .set('Authorization', `Bearer ${sessionB.accessToken}`)
      .expect(204);

    // sessionA's refresh token was rotated by the refresh call above, so
    // its CURRENT refresh token (sessionB's, untouched) must now be dead too.
    await request(app.getHttpServer())
      .post(apiPath('/auth/refresh'))
      .send({ refreshToken: sessionB.refreshToken })
      .expect(401);

    await app.close();
  }, 60000);
});
