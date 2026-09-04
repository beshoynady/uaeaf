import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.MONGODB_URI ??= 'placeholder-overwritten-below';
process.env.JWT_SECRET ??= 'e2e-test-secret-at-least-32-characters-long';
process.env.JWT_ACCESS_EXPIRY ??= '15m';
process.env.JWT_REFRESH_EXPIRY ??= '7d';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri('uaeaf-e2e-rate-limit-login');
});

afterAll(async () => {
  await mongoServer.stop();
});

/**
 * Confirms RateLimitGuard's @RateLimit(10, 60) override on POST /auth/login
 * rejects traffic past the threshold with 429, independently of the
 * account-level lockout covered by login-lockout.e2e-spec.ts
 * (schema-audit-2026-09-04.md §3.7/§6.7, P1 finding). Split into its own
 * file — see rate-limit-contact-messages.e2e-spec.ts for why.
 */
describe('Rate limiting — POST /auth/login (e2e)', () => {
  it('rejects with 429 once the 10-per-60s limit is exceeded', async () => {
    const { Test } = await import('@nestjs/testing');
    const { ValidationPipe, INestApplication } = await import('@nestjs/common');
    const request = (await import('supertest')).default;
    const { AppModule } = await import('../../src/app.module.js');

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app: InstanceType<typeof INestApplication> = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();

    // No user needs to exist -- RateLimitGuard runs before the handler
    // even reaches AuthService, so every attempt counts toward the limit
    // regardless of credential validity.
    const payload = { email: 'nobody@uaeaf.ae', password: 'wrong password' };

    for (let i = 0; i < 10; i += 1) {
      await request(app.getHttpServer()).post('/auth/login').send(payload).expect(401);
    }
    await request(app.getHttpServer()).post('/auth/login').send(payload).expect(429);

    await app.close();
  }, 60000);
});
