import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.MONGODB_URI ??= 'placeholder-overwritten-below';
process.env.JWT_SECRET ??= 'e2e-test-secret-at-least-32-characters-long';
process.env.JWT_ACCESS_EXPIRY ??= '15m';
process.env.JWT_REFRESH_EXPIRY ??= '7d';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri('uaeaf-e2e-lockout');
});

afterAll(async () => {
  await mongoServer.stop();
});

describe('Login brute-force lockout (e2e)', () => {
  it('locks the account after 5 failed attempts, rejects further attempts without extending it, and resets after expiry', async () => {
    const { Test } = await import('@nestjs/testing');
    const { ValidationPipe, INestApplication } = await import('@nestjs/common');
    const { getModelToken } = await import('@nestjs/mongoose');
    const request = (await import('supertest')).default;

    const { AppModule } = await import('../../src/app.module.js');
    const { User } = await import('../../src/modules/platform-administration/users/schemas/user.schema.js');
    const bcrypt = (await import('bcryptjs')).default;

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app: InstanceType<typeof INestApplication> = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    const userModel = moduleFixture.get(getModelToken(User.name));
    const correctPassword = 'correct horse battery staple';
    const passwordHash = await bcrypt.hash(correctPassword, 10);
    const seeded = await userModel.create({
      name: { en: 'Lockout Test User', ar: 'مستخدم اختبار الإيقاف' },
      email: 'lockout@uaeaf.ae',
      accountStatus: 'Active',
      roleIds: [],
      authMethods: [{ provider: 'Local', passwordHash, linkedAt: new Date() }],
    });

    // Attempts 1-4: wrong password, still under threshold.
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'lockout@uaeaf.ae', password: 'wrong password' })
        .expect(401);
    }
    const afterFour = await userModel.findById(seeded._id);
    expect(afterFour!.failedLoginAttempts).toBe(4);
    expect(afterFour!.lockedUntil).toBeNull();

    // 5th attempt: crosses the threshold, sets lockedUntil.
    const fifthAttempt = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'lockout@uaeaf.ae', password: 'wrong password' })
      .expect(401);
    const afterFive = await userModel.findById(seeded._id);
    expect(afterFive!.failedLoginAttempts).toBe(5);
    expect(afterFive!.lockedUntil).not.toBeNull();
    expect(afterFive!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());

    // 6th attempt, during active lockout, with the CORRECT password: still
    // rejected, with a distinct message, and does not increment further.
    const sixthAttempt = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'lockout@uaeaf.ae', password: correctPassword })
      .expect(401);
    expect(sixthAttempt.body.message).not.toBe(fifthAttempt.body.message);
    expect(sixthAttempt.body.message.toLowerCase()).toContain('locked');
    const afterSix = await userModel.findById(seeded._id);
    expect(afterSix!.failedLoginAttempts).toBe(5);

    // Simulate the lockout window having expired.
    await userModel.findByIdAndUpdate(seeded._id, { lockedUntil: new Date(Date.now() - 1000) });

    // A correct-password login now succeeds and resets the counters.
    const recovered = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'lockout@uaeaf.ae', password: correctPassword })
      .expect(200);
    expect(recovered.body.accessToken).toEqual(expect.any(String));
    const afterRecovery = await userModel.findById(seeded._id);
    expect(afterRecovery!.failedLoginAttempts).toBe(0);
    expect(afterRecovery!.lockedUntil).toBeNull();

    await app.close();
  }, 60000);
});
