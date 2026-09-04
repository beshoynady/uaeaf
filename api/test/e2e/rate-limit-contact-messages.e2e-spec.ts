import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.MONGODB_URI ??= 'placeholder-overwritten-below';
process.env.JWT_SECRET ??= 'e2e-test-secret-at-least-32-characters-long';
process.env.JWT_ACCESS_EXPIRY ??= '15m';
process.env.JWT_REFRESH_EXPIRY ??= '7d';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri('uaeaf-e2e-rate-limit-contact');
});

afterAll(async () => {
  await mongoServer.stop();
});

/**
 * Confirms RateLimitGuard's @RateLimit(5, 60) override on the platform's
 * only unauthenticated write (POST /contact-messages) actually rejects
 * traffic past the threshold with 429 (schema-audit-2026-09-04.md
 * §3.7/§6.7, P1 finding). Split into its own file (rather than sharing an
 * app/Mongo instance with the login rate-limit test) after two sequential
 * full AppModule bootstraps in one process produced a MongoNetworkError
 * ECONNRESET — this mirrors the one-app-per-file pattern already used by
 * every other e2e spec in this suite.
 */
describe('Rate limiting — POST /contact-messages (e2e)', () => {
  it('rejects with 429 once the 5-per-60s limit is exceeded', async () => {
    const { Test } = await import('@nestjs/testing');
    const { ValidationPipe, INestApplication } = await import('@nestjs/common');
    const request = (await import('supertest')).default;
    const { AppModule } = await import('../../src/app.module.js');

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app: InstanceType<typeof INestApplication> = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();

    const payload = {
      messageType: 'Inquiry',
      senderName: 'Rate Limit Tester',
      senderEmail: 'ratelimit@example.com',
      messageBody: 'Testing the rate limit.',
    };

    for (let i = 0; i < 5; i += 1) {
      await request(app.getHttpServer()).post('/contact-messages').send(payload).expect(201);
    }
    await request(app.getHttpServer()).post('/contact-messages').send(payload).expect(429);

    await app.close();
  }, 60000);
});
