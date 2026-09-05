import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.MONGODB_URI ??= 'placeholder-overwritten-below';
process.env.JWT_SECRET ??= 'e2e-test-secret-at-least-32-characters-long';
process.env.JWT_ACCESS_EXPIRY ??= '15m';
process.env.JWT_REFRESH_EXPIRY ??= '7d';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri('uaeaf-e2e-public-people-orgs');
}, 30000);

afterAll(async () => {
  await mongoServer.stop();
});

/**
 * Closes the Week 3 "public routes never wired" gap for Athlete/
 * AthleteProfile/Official/OfficialProfile: these routes were found already
 * wired to @Public() during this session (2026-09-04), so what was actually
 * missing was e2e proof that (a) they work unauthenticated and (b) the
 * response genuinely carries no [SENSITIVE-MINOR]/[RESTRICTED] field —
 * verified here by an exact key-set comparison against each DTO's declared
 * shape, not a spot-check of one field.
 */
describe('Public API — People & Organizations (e2e)', () => {
  it('serves paginated public athletes/officials listings and single public profile pages, with no sensitive field ever present', async () => {
    const { Test } = await import('@nestjs/testing');
    const { ValidationPipe, INestApplication } = await import('@nestjs/common');
    const { getModelToken } = await import('@nestjs/mongoose');
    const { Types } = await import('mongoose');
    const request = (await import('supertest')).default;

    const { AppModule } = await import('../../src/app.module.js');
    const { Athlete } = await import('../../src/modules/people-organizations/athletes/schemas/athlete.schema.js');
    const { AthleteProfile } = await import(
      '../../src/modules/people-organizations/athlete-profiles/schemas/athlete-profile.schema.js'
    );
    const { Official } = await import('../../src/modules/people-organizations/officials/schemas/official.schema.js');
    const { OfficialProfile } = await import(
      '../../src/modules/people-organizations/official-profiles/schemas/official-profile.schema.js'
    );

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app: InstanceType<typeof INestApplication> = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();

    const athleteModel = moduleFixture.get(getModelToken(Athlete.name));
    const athleteProfileModel = moduleFixture.get(getModelToken(AthleteProfile.name));
    const officialModel = moduleFixture.get(getModelToken(Official.name));
    const officialProfileModel = moduleFixture.get(getModelToken(OfficialProfile.name));

    // ============================================================
    // Athletes: a Local athlete with a profile, plus a Guest athlete
    // (no profile row by design) so the listing exercises both shapes.
    // ============================================================
    const localAthlete = await athleteModel.create({
      name: { en: 'Jane Runner', ar: 'جين العداءة' },
      dateOfBirth: new Date('2005-03-01'), // [SENSITIVE-MINOR] — must never reach a public response
      nationalityId: new Types.ObjectId(),
      disciplineIds: [],
      gender: 'Female',
      residencyType: 'Local',
      federationName: null,
    });
    await athleteModel.create({
      name: { en: 'Guest Sprinter', ar: 'عداء ضيف' },
      dateOfBirth: new Date('1998-06-15'),
      nationalityId: new Types.ObjectId(),
      disciplineIds: [],
      gender: 'Male',
      residencyType: 'Guest',
      federationName: null,
    });
    const athleteProfile = await athleteProfileModel.create({
      athleteId: localAthlete._id,
      slug: 'jane-runner',
      clubId: null,
      registrationNumber: 'ATH-REG-1',
      restricted: { emiratesIdOrPassport: '784-1234-5678901-2', address: 'Dubai', phone: '+9715xxxxxxx', email: 'jane@example.com' },
      status: 'Active',
      photoId: null,
      bio: null,
      socialLinks: [],
    });

    // ---- GET /athletes/public — paginated listing ----
    const athletesPage1 = await request(app.getHttpServer()).get('/athletes/public?page=1&limit=1').expect(200);
    expect(athletesPage1.body).toEqual({
      items: expect.any(Array),
      total: 2,
      page: 1,
      limit: 1,
    });
    expect(athletesPage1.body.items).toHaveLength(1);
    expect(Object.keys(athletesPage1.body.items[0]).sort()).toEqual(
      ['id', 'name', 'nationalityId', 'disciplineIds', 'gender', 'residencyType', 'federationName'].sort(),
    );
    expect(athletesPage1.body.items[0]).not.toHaveProperty('dateOfBirth');

    const athletesDefault = await request(app.getHttpServer()).get('/athletes/public').expect(200);
    expect(athletesDefault.body.total).toBe(2);
    expect(athletesDefault.body.items).toHaveLength(2);
    for (const item of athletesDefault.body.items) {
      expect(item).not.toHaveProperty('dateOfBirth');
    }

    // ---- GET /athlete-profiles/public/:slug — the individual public page ----
    const publicProfile = await request(app.getHttpServer())
      .get(`/athlete-profiles/public/${athleteProfile.slug}`)
      .expect(200);
    expect(Object.keys(publicProfile.body.profile).sort()).toEqual(
      ['id', 'athleteId', 'slug', 'clubId', 'registrationNumber', 'status', 'photoId', 'bio', 'socialLinks'].sort(),
    );
    expect(publicProfile.body.profile).not.toHaveProperty('restricted');
    expect(Object.keys(publicProfile.body.athlete).sort()).toEqual(
      ['id', 'name', 'nationalityId', 'disciplineIds', 'gender', 'residencyType', 'federationName'].sort(),
    );
    expect(publicProfile.body.athlete).not.toHaveProperty('dateOfBirth');

    // A `null` service return is serialized through supertest as `{}`, the
    // same observed (and already relied-upon) behavior as the pre-existing
    // committees `getPublicSnapshot` public-route test.
    const unknownProfile = await request(app.getHttpServer())
      .get('/athlete-profiles/public/does-not-exist')
      .expect(200);
    expect(unknownProfile.body).toEqual({});

    // No auth header was ever sent above; explicitly confirm the admin-only
    // sibling route still rejects an anonymous caller, proving the public
    // route's openness is a deliberate exception, not a broken guard.
    await request(app.getHttpServer()).get('/athletes').expect(401);
    await request(app.getHttpServer()).get('/athlete-profiles').expect(401);

    // ============================================================
    // Officials: same pattern, no restricted PII field exists on this
    // side (confirmed on the schema), so the assertion is a pure
    // key-set match rather than an exclusion check.
    // ============================================================
    const localOfficial = await officialModel.create({
      fullName: { en: 'Ahmed Referee', ar: 'أحمد الحكم' },
      roleType: 'Referee',
      licenseLevel: 'Level1',
      disciplineIds: [],
      nationalityId: new Types.ObjectId(),
      residencyType: 'Local',
      federationName: null,
    });
    const officialProfile = await officialProfileModel.create({
      officialId: localOfficial._id,
      slug: 'ahmed-referee',
      clubId: null,
      registrationNumber: 'OFF-REG-1',
      photoId: null,
      bio: null,
      gender: 'Male',
      status: 'Active',
    });

    const officialsList = await request(app.getHttpServer()).get('/officials/public').expect(200);
    expect(officialsList.body).toEqual({ items: expect.any(Array), total: 1, page: 1, limit: 50 });
    expect(Object.keys(officialsList.body.items[0]).sort()).toEqual(
      ['id', 'fullName', 'roleType', 'licenseLevel', 'disciplineIds', 'nationalityId', 'residencyType', 'federationName'].sort(),
    );

    const publicOfficialProfile = await request(app.getHttpServer())
      .get(`/official-profiles/public/${officialProfile.slug}`)
      .expect(200);
    expect(Object.keys(publicOfficialProfile.body.profile).sort()).toEqual(
      ['id', 'officialId', 'slug', 'clubId', 'registrationNumber', 'photoId', 'bio', 'gender', 'status'].sort(),
    );
    expect(Object.keys(publicOfficialProfile.body.official).sort()).toEqual(
      ['id', 'fullName', 'roleType', 'licenseLevel', 'disciplineIds', 'nationalityId', 'residencyType', 'federationName'].sort(),
    );

    await request(app.getHttpServer()).get('/officials').expect(401);
    await request(app.getHttpServer()).get('/official-profiles').expect(401);

    await app.close();
  }, 90000);
});
