import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.MONGODB_URI ??= 'placeholder-overwritten-below';
process.env.JWT_SECRET ??= 'e2e-test-secret-at-least-32-characters-long';
process.env.JWT_ACCESS_EXPIRY ??= '15m';
process.env.JWT_REFRESH_EXPIRY ??= '7d';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri('uaeaf-e2e-week4');
});

afterAll(async () => {
  await mongoServer.stop();
});

describe('Week 4 — Governance, CMS and the public surface (e2e)', () => {
  it('covers the anonymous contact form, singleton page upsert, public reads, and the workflow public-snapshot gate', async () => {
    const { Test } = await import('@nestjs/testing');
    const { ValidationPipe, INestApplication } = await import('@nestjs/common');
    const { getModelToken } = await import('@nestjs/mongoose');
    const request = (await import('supertest')).default;

    const { AppModule } = await import('../../src/app.module.js');
    const { Role } = await import('../../src/modules/roles/schemas/role.schema.js');
    const { Permission } = await import('../../src/modules/permissions/schemas/permission.schema.js');
    const { User } = await import('../../src/modules/users/schemas/user.schema.js');
    const bcrypt = (await import('bcryptjs')).default;

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app: InstanceType<typeof INestApplication> = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();

    const roleModel = moduleFixture.get(getModelToken(Role.name));
    const permissionModel = moduleFixture.get(getModelToken(Permission.name));
    const userModel = moduleFixture.get(getModelToken(User.name));

    // --- Seed an operator for the RBAC-gated half of the flow ---
    const resourceActions: Array<[string, string]> = [
      ['athletesPage', 'Update'],
      ['committees', 'Create'],
      ['committees', 'Read'],
      ['contactMessages', 'Read'],
      ['contactMessages', 'Update'],
      ['siteSettings', 'Read'],
      ['siteSettings', 'Update'],
    ];
    const permissionIds = await Promise.all(
      resourceActions.map(async ([resourceType, action]) => {
        const permission = await permissionModel.create({
          name: { en: `${action} ${resourceType}`, ar: `${action} ${resourceType}` },
          resourceType,
          action,
        });
        return permission._id;
      }),
    );
    const operatorRole = await roleModel.create({
      name: { en: 'CMS Operator', ar: 'مشغل المحتوى' },
      permissionIds,
      isSystemRole: false,
    });
    const passwordHash = await bcrypt.hash('correct horse battery staple', 10);
    await userModel.create({
      name: { en: 'CMS Operator', ar: 'مشغل المحتوى' },
      email: 'cms-operator@uaeaf.ae',
      accountStatus: 'Active',
      roleIds: [operatorRole._id],
      authMethods: [{ provider: 'Local', passwordHash, linkedAt: new Date() }],
    });
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'cms-operator@uaeaf.ae', password: 'correct horse battery staple' })
      .expect(200);
    const token = login.body.accessToken as string;
    const auth = () => ({ Authorization: `Bearer ${token}` });

    // ============================================================
    // 1. The citizen contact form is a genuinely PUBLIC write, and
    //    the server owns every operational field.
    // ============================================================
    const submission = await request(app.getHttpServer())
      .post('/contact-messages')
      .send({
        messageType: 'Complaint',
        senderName: 'Citizen Tester',
        senderEmail: 'citizen@example.com',
        messageBody: 'The track surface at the stadium needs maintenance.',
      })
      .expect(201);
    expect(submission.body.status).toBe('New');
    expect(submission.body.replyBody).toBeNull();
    expect(submission.body.workflowInstanceId).toBeNull();
    const messageId = submission.body._id as string;

    // An over-limit anonymous submission is rejected before it ever
    // reaches the database (schema-audit-2026-09-04.md §3.7, P1 finding:
    // this route previously had no @MaxLength() on any free-text field).
    await request(app.getHttpServer())
      .post('/contact-messages')
      .send({
        messageType: 'Complaint',
        senderName: 'A'.repeat(201),
        senderEmail: 'citizen@example.com',
        messageBody: 'Short but the name above is over the 200-char cap.',
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/contact-messages')
      .send({
        messageType: 'Complaint',
        senderName: 'Citizen Tester',
        senderEmail: 'citizen@example.com',
        messageBody: 'B'.repeat(5001),
      })
      .expect(400);

    // Reading the citizen's PII back is NOT public.
    await request(app.getHttpServer()).get('/contact-messages').expect(401);
    await request(app.getHttpServer()).get('/contact-messages').set(auth()).expect(200);

    // Staff reply is recorded (not sent — delivery is an external concern).
    const replied = await request(app.getHttpServer())
      .patch(`/contact-messages/${messageId}/reply`)
      .set(auth())
      .send({ replyBody: 'Thank you, maintenance is scheduled.', replyChannel: 'Email' })
      .expect(200);
    expect(replied.body.replyBody).toBe('Thank you, maintenance is scheduled.');
    expect(replied.body.repliedAt).not.toBeNull();
    expect(replied.body.repliedBy).not.toBeNull();

    // ============================================================
    // 2. Singleton enforcement: two PUTs leave exactly one row.
    // ============================================================
    await request(app.getHttpServer())
      .put('/athletes-page')
      .set(auth())
      .send({
        heroTitle: { en: 'Athletes', ar: 'الرياضيون' },
        heroSubtitle: { en: 'First version', ar: 'النسخة الأولى' },
      })
      .expect(200);
    const secondUpsert = await request(app.getHttpServer())
      .put('/athletes-page')
      .set(auth())
      .send({
        heroTitle: { en: 'Athletes', ar: 'الرياضيون' },
        heroSubtitle: { en: 'Second version', ar: 'النسخة الثانية' },
      })
      .expect(200);

    // The public GET needs no token and sees exactly one, updated row.
    const publicPage = await request(app.getHttpServer()).get('/athletes-page').expect(200);
    expect(publicPage.body._id).toBe(secondUpsert.body._id);
    expect(publicPage.body.heroSubtitle.en).toBe('Second version');

    // ============================================================
    // 3. siteSettings: the public projection hides [RESTRICTED] fields
    //    that the RBAC-gated read still returns.
    // ============================================================
    await request(app.getHttpServer())
      .put('/site-settings')
      .set(auth())
      .send({
        copyrightText: { en: '© UAEAF', ar: '© الاتحاد' },
        googleAnalyticsId: 'GA-SECRET-VALUE',
        systemEmailSender: 'noreply@internal.uaeaf.ae',
        isMaintenanceMode: false,
      })
      .expect(200);

    const publicSettings = await request(app.getHttpServer()).get('/site-settings/public').expect(200);
    expect(publicSettings.body.copyrightText.en).toBe('© UAEAF');
    expect(publicSettings.body).not.toHaveProperty('googleAnalyticsId');
    expect(publicSettings.body).not.toHaveProperty('systemEmailSender');
    expect(publicSettings.body).not.toHaveProperty('isMaintenanceMode');

    const adminSettings = await request(app.getHttpServer())
      .get('/site-settings')
      .set(auth())
      .expect(200);
    expect(adminSettings.body.googleAnalyticsId).toBe('GA-SECRET-VALUE');

    // ============================================================
    // 4. A workflow-governed entity is NOT publicly readable from its own
    //    row: the public path goes through publications, which is empty
    //    until something is actually published ("Approved ≠ Published").
    // ============================================================
    const committee = await request(app.getHttpServer())
      .post('/committees')
      .set(auth())
      .send({
        name: { en: 'Technical Committee', ar: 'اللجنة الفنية' },
        description: { en: 'Technical oversight.', ar: 'الإشراف الفني.' },
        displayOrder: 1,
        committeeType: 'Technical',
        committeeGroup: 'Leadership',
        publicationState: 'Live',
      })
      .expect(201);
    const committeeId = committee.body._id as string;

    // The row itself stays behind RBAC...
    await request(app.getHttpServer()).get('/committees').expect(401);

    // ...while the public snapshot route is open but yields nothing,
    // because no publications row exists for it yet.
    const snapshot = await request(app.getHttpServer())
      .get(`/committees/${committeeId}/public`)
      .expect(200);
    expect(snapshot.body).toEqual({});

    await app.close();
  }, 90000);
});
