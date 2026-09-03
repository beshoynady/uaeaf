import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.MONGODB_URI ??= 'placeholder-overwritten-below';
process.env.JWT_SECRET ??= 'e2e-test-secret-at-least-32-characters-long';
process.env.JWT_ACCESS_EXPIRY ??= '15m';
process.env.JWT_REFRESH_EXPIRY ??= '7d';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri('uaeaf-e2e-people');
});

afterAll(async () => {
  await mongoServer.stop();
});

describe('People & Organizations + Documents (e2e)', () => {
  it('covers a Local athlete + profile, a Guest athlete with no profile, and a documents attach-to-club flow', async () => {
    const { Test } = await import('@nestjs/testing');
    const { ValidationPipe, INestApplication } = await import('@nestjs/common');
    const { getModelToken } = await import('@nestjs/mongoose');
    const request = (await import('supertest')).default;

    const { AppModule } = await import('../../src/app.module.js');
    const { Role } = await import('../../src/modules/roles/schemas/role.schema.js');
    const { Permission } = await import('../../src/modules/permissions/schemas/permission.schema.js');
    const { User } = await import('../../src/modules/users/schemas/user.schema.js');
    const { Country } = await import('../../src/modules/countries/schemas/country.schema.js');
    const bcrypt = (await import('bcryptjs')).default;

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app: InstanceType<typeof INestApplication> = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();

    const roleModel = moduleFixture.get(getModelToken(Role.name));
    const permissionModel = moduleFixture.get(getModelToken(Permission.name));
    const userModel = moduleFixture.get(getModelToken(User.name));
    const countryModel = moduleFixture.get(getModelToken(Country.name));

    // --- Seed an operator with every permission this flow needs ---
    const resourceActions: Array<[string, string]> = [
      ['athletes', 'Create'],
      ['athletes', 'Read'],
      ['athleteProfiles', 'Create'],
      ['athleteProfiles', 'Read'],
      ['clubs', 'Create'],
      ['clubs', 'Read'],
      ['documents', 'Create'],
      ['documents', 'Read'],
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
      name: { en: 'People Operator', ar: 'مشغل شؤون الأشخاص' },
      permissionIds,
      isSystemRole: false,
    });
    const passwordHash = await bcrypt.hash('correct horse battery staple', 10);
    await userModel.create({
      name: { en: 'People Operator', ar: 'مشغل شؤون الأشخاص' },
      email: 'people-operator@uaeaf.ae',
      accountStatus: 'Active',
      roleIds: [operatorRole._id],
      authMethods: [{ provider: 'Local', passwordHash, linkedAt: new Date() }],
    });
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'people-operator@uaeaf.ae', password: 'correct horse battery staple' })
      .expect(200);
    const token = login.body.accessToken as string;
    const auth = () => ({ Authorization: `Bearer ${token}` });

    const uae = await countryModel.create({ name: { en: 'Abu Dhabi', ar: 'أبوظبي' }, type: 'Emirate' });
    const countryId = uae._id.toString();

    // ============================================================
    // Scenario 1: a Local athlete gets a linked profile end-to-end.
    // ============================================================
    const localAthleteResponse = await request(app.getHttpServer())
      .post('/athletes')
      .set(auth())
      .send({
        name: { en: 'Local Athlete', ar: 'رياضي محلي' },
        dateOfBirth: '2000-01-01',
        nationalityId: countryId,
        gender: 'Male',
        residencyType: 'Local',
      })
      .expect(201);
    const localAthleteId = localAthleteResponse.body._id as string;

    const profileResponse = await request(app.getHttpServer())
      .post('/athlete-profiles')
      .set(auth())
      .send({
        athleteId: localAthleteId,
        slug: 'local-athlete-profile',
        registrationNumber: 'REG-LOCAL-1',
        restricted: {},
        status: 'Active',
      })
      .expect(201);
    expect(profileResponse.body.athleteId).toBe(localAthleteId);

    // A second profile for the same Local athlete must be rejected (1:1).
    await request(app.getHttpServer())
      .post('/athlete-profiles')
      .set(auth())
      .send({
        athleteId: localAthleteId,
        slug: 'local-athlete-profile-2',
        registrationNumber: 'REG-LOCAL-2',
        restricted: {},
        status: 'Active',
      })
      .expect(409);

    // ============================================================
    // Scenario 2: a Guest athlete requires no profile — and one is
    // structurally rejected if attempted.
    // ============================================================
    const guestAthleteResponse = await request(app.getHttpServer())
      .post('/athletes')
      .set(auth())
      .send({
        name: { en: 'Guest Athlete', ar: 'رياضي ضيف' },
        dateOfBirth: '1998-05-05',
        nationalityId: countryId,
        gender: 'Female',
        residencyType: 'Guest',
        federationName: { en: 'Some Foreign Federation', ar: 'اتحاد أجنبي' },
      })
      .expect(201);
    const guestAthleteId = guestAthleteResponse.body._id as string;

    await request(app.getHttpServer())
      .post('/athlete-profiles')
      .set(auth())
      .send({
        athleteId: guestAthleteId,
        slug: 'guest-athlete-profile',
        registrationNumber: 'REG-GUEST-1',
        restricted: {},
        status: 'Active',
      })
      .expect(409);

    // ============================================================
    // Scenario 3: documents upload-and-attach-to-club flow (mode b).
    // ============================================================
    const clubResponse = await request(app.getHttpServer())
      .post('/clubs')
      .set(auth())
      .send({
        name: { en: 'Test Club', ar: 'نادي الاختبار' },
        slug: 'test-club',
        foundingDate: '1990-01-01',
        emirateId: countryId,
        registrationNumber: 'CLUB-REG-1',
        clubType: 'SportsClub',
        status: 'Active',
      })
      .expect(201);
    const clubId = clubResponse.body._id as string;

    const documentResponse = await request(app.getHttpServer())
      .post('/documents')
      .set(auth())
      .send({
        file: {
          en: { url: 'https://files.uaeaf.ae/cert-en.pdf', mimeType: 'application/pdf', size: 1024, filename: 'cert-en.pdf' },
          ar: { url: 'https://files.uaeaf.ae/cert-ar.pdf', mimeType: 'application/pdf', size: 1024, filename: 'cert-ar.pdf' },
        },
        documentType: 'Certificate',
        ownerType: 'Club',
        ownerId: clubId,
        effectiveDate: '2026-01-01',
        publicationState: 'Live',
      })
      .expect(201);
    const documentId = documentResponse.body._id as string;

    const attachedDocuments = await request(app.getHttpServer())
      .get('/documents')
      .query({ ownerType: 'Club', ownerId: clubId })
      .set(auth())
      .expect(200);
    expect(attachedDocuments.body).toHaveLength(1);
    expect(attachedDocuments.body[0]._id).toBe(documentId);

    await app.close();
  }, 60000);
});
