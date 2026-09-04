import { MongoMemoryServer } from 'mongodb-memory-server';
import { writeFileSync } from 'node:fs';

process.env.MONGODB_URI ??= 'placeholder-overwritten-below';
process.env.JWT_SECRET ??= 'e2e-test-secret-at-least-32-characters-long';
process.env.JWT_ACCESS_EXPIRY ??= '15m';
process.env.JWT_REFRESH_EXPIRY ??= '7d';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri('uaeaf-capture-public-api');
});

afterAll(async () => {
  await mongoServer.stop();
});

/**
 * ONE-TIME CAPTURE TOOL, not a regression test — boots the real app, seeds
 * representative data across every domain, hits every real @Public() route,
 * and writes the captured responses plus the live OpenAPI document to disk
 * so `docs/api/public-api-contract.md` and `api/openapi.json` are authored
 * from genuine responses, not hand-typed guesses (public-routes closure
 * task, 2026-09-04/05). Deleted after use — see the task's final summary.
 */
describe('CAPTURE — public API contract (not a regression test)', () => {
  it('captures every public route\'s real response', async () => {
    const { Test } = await import('@nestjs/testing');
    const { ValidationPipe, INestApplication } = await import('@nestjs/common');
    const { getModelToken } = await import('@nestjs/mongoose');
    const { Types } = await import('mongoose');
    const request = (await import('supertest')).default;
    const bcrypt = (await import('bcryptjs')).default;

    const { AppModule } = await import('../../src/app.module.js');
    const { Athlete } = await import('../../src/modules/people-organizations/athletes/schemas/athlete.schema.js');
    const { AthleteProfile } = await import('../../src/modules/people-organizations/athlete-profiles/schemas/athlete-profile.schema.js');
    const { Official } = await import('../../src/modules/people-organizations/officials/schemas/official.schema.js');
    const { OfficialProfile } = await import('../../src/modules/people-organizations/official-profiles/schemas/official-profile.schema.js');
    const { Album } = await import('../../src/modules/media-center/albums/schemas/album.schema.js');
    const { Page } = await import('../../src/modules/cms-page-composition/pages/schemas/pages.schema.js');
    const { PageSection } = await import('../../src/modules/cms-page-composition/page-sections/schemas/page-sections.schema.js');
    const { HeroSlide } = await import('../../src/modules/cms-page-composition/hero-slides/schemas/hero-slides.schema.js');
    const { NavigationMenu } = await import('../../src/modules/cms-page-composition/navigation-menus/schemas/navigation-menus.schema.js');
    const { NavigationItem } = await import('../../src/modules/cms-page-composition/navigation-items/schemas/navigation-items.schema.js');
    const { FederationPersonnel } = await import('../../src/modules/federation-governance/federation-personnel/schemas/federation-personnel.schema.js');
    const { Committee } = await import('../../src/modules/federation-governance/committees/schemas/committees.schema.js');
    const { Revision } = await import('../../src/modules/workflow/revisions/schemas/revision.schema.js');
    const { Publication } = await import('../../src/modules/workflow/publications/schemas/publication.schema.js');
    const { Role } = await import('../../src/modules/platform-administration/roles/schemas/role.schema.js');
    const { User } = await import('../../src/modules/platform-administration/users/schemas/user.schema.js');

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app: InstanceType<typeof INestApplication> = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    const server = app.getHttpServer();

    const m = (name: string) => moduleFixture.get(getModelToken(name));
    const athleteModel = m(Athlete.name);
    const athleteProfileModel = m(AthleteProfile.name);
    const officialModel = m(Official.name);
    const officialProfileModel = m(OfficialProfile.name);
    const albumModel = m(Album.name);
    const pageModel = m(Page.name);
    const pageSectionModel = m(PageSection.name);
    const heroSlideModel = m(HeroSlide.name);
    const navigationMenuModel = m(NavigationMenu.name);
    const navigationItemModel = m(NavigationItem.name);
    const federationPersonnelModel = m(FederationPersonnel.name);
    const committeeModel = m(Committee.name);
    const revisionModel = m(Revision.name);
    const publicationModel = m(Publication.name);
    const roleModel = m(Role.name);
    const userModel = m(User.name);

    const someUserId = new Types.ObjectId();

    // ---- People & Organizations ----
    const athlete = await athleteModel.create({
      name: { en: 'Jane Runner', ar: 'جين العداءة' },
      dateOfBirth: new Date('2005-03-01'),
      nationalityId: new Types.ObjectId(),
      disciplineIds: [],
      gender: 'Female',
      residencyType: 'Local',
      federationName: null,
    });
    const athleteProfile = await athleteProfileModel.create({
      athleteId: athlete._id,
      slug: 'jane-runner',
      clubId: null,
      registrationNumber: 'ATH-REG-1',
      restricted: { emiratesIdOrPassport: null, address: null, phone: null, email: null },
      status: 'Active',
      photoId: null,
      bio: { en: 'National 400m champion.', ar: 'بطلة وطنية في 400 متر.' },
      socialLinks: [],
    });
    const official = await officialModel.create({
      fullName: { en: 'Ahmed Referee', ar: 'أحمد الحكم' },
      roleType: 'Referee',
      licenseLevel: 'Level1',
      disciplineIds: [],
      nationalityId: new Types.ObjectId(),
      residencyType: 'Local',
      federationName: null,
    });
    const officialProfile = await officialProfileModel.create({
      officialId: official._id,
      slug: 'ahmed-referee',
      clubId: null,
      registrationNumber: 'OFF-REG-1',
      photoId: null,
      bio: null,
      gender: 'Male',
      status: 'Active',
    });

    // ---- Media Center: a published album ----
    const album = await albumModel.create({
      title: { en: 'National Championship 2026', ar: 'البطولة الوطنية 2026' },
      slug: 'national-championship-2026',
      description: { en: 'Highlights from the meet.', ar: 'أبرز لحظات البطولة.' },
      contentCategoryId: new Types.ObjectId(),
      associations: [],
      coverImageId: null,
      displayOrder: 1,
      publicationState: 'Published',
      publishedAt: new Date(),
      publishedBy: someUserId,
      tags: ['championship', '2026'],
      assetCount: 0,
    });

    // ---- CMS composition chain: pages -> pageSections -> heroSlides ----
    const page = await pageModel.create({ slug: 'home', title: { en: 'Home', ar: 'الرئيسية' }, status: 'Published' });
    const heroSection = await pageSectionModel.create({
      pageId: page._id,
      sectionType: 'HERO',
      sectionTitle: null,
      sectionSubtitle: null,
      displayOrder: 1,
      enabled: true,
      visibility: 'Everyone',
      selectionMode: 'MANUAL',
      items: [],
    });
    const heroSlide = await heroSlideModel.create({
      pageSectionId: heroSection._id,
      mediaType: 'IMAGE',
      imageAssetId: new Types.ObjectId(),
      title: { en: 'Champions', ar: 'الأبطال' },
      subtitle: { en: 'Season 2026', ar: 'موسم 2026' },
      ctaText: { en: 'See more', ar: 'شاهد المزيد' },
      ctaUrl: '/results',
      displayOrder: 1,
      active: true,
    });

    // ---- Navigation ----
    const menu = await navigationMenuModel.create({ key: 'main-nav', location: 'Header' });
    await navigationItemModel.create({
      menuId: menu._id,
      label: { en: 'Athletes', ar: 'الرياضيون' },
      url: '/athletes',
      parentItemId: null,
      displayOrder: 1,
      isActive: true,
    });

    // ---- Federation & Governance: personnel + a published committee ----
    await federationPersonnelModel.create({
      fullName: { en: 'Dr. Sara Al Naqbi', ar: 'د. سارة النقبي' },
      photoId: null,
      shortBio: { en: 'Secretary General.', ar: 'الأمينة العامة.' },
      biography: null,
      nationalityId: new Types.ObjectId(),
      publicContact: { email: 'info@uaeaf.ae', phone: '+9714xxxxxxx' },
      internalContact: { personalEmail: 'sara.private@example.com', idNumber: '784-XXXX' },
      status: 'Active',
      socialLinks: [],
    });
    const committee = await committeeModel.create({
      name: { en: 'Technical Committee', ar: 'اللجنة الفنية' },
      description: { en: 'Oversees technical regulations and officiating standards.', ar: 'تشرف على اللوائح الفنية ومعايير التحكيم.' },
      displayOrder: 1,
      isActive: true,
      committeeType: 'Technical',
      committeeGroup: 'Leadership',
      publicationState: 'Live',
    });
    const revision = await revisionModel.create({
      entityType: 'committees',
      entityId: committee._id,
      versionNumber: 1,
      snapshotData: {
        id: committee._id.toString(),
        name: committee.name,
        description: committee.description,
        committeeType: committee.committeeType,
        committeeGroup: committee.committeeGroup,
        displayOrder: committee.displayOrder,
      },
      createdBy: someUserId,
    });
    await publicationModel.create({
      entityType: 'committees',
      entityId: committee._id,
      revisionId: revision._id,
      workflowInstanceId: null,
      publishedAt: new Date(),
      publishedBy: someUserId,
      status: 'Live',
    });

    // ---- Auth: a real user for a real login capture ----
    const passwordHash = await bcrypt.hash('correct horse battery staple', 10);
    await roleModel.create({ name: { en: 'Viewer', ar: 'مشاهد' }, permissionIds: [], isSystemRole: false });
    await userModel.create({
      name: { en: 'Demo User', ar: 'مستخدم تجريبي' },
      email: 'demo@uaeaf.ae',
      accountStatus: 'Active',
      roleIds: [],
      authMethods: [{ provider: 'Local', passwordHash, linkedAt: new Date() }],
    });

    // ============================================================
    // Hit every real @Public() route and collect the captured pairs.
    // ============================================================
    const captured: Array<{ method: string; path: string; status: number; body: unknown }> = [];
    const capture = async (method: 'get' | 'post', path: string, send?: object) => {
      const req = method === 'get' ? request(server).get(path) : request(server).post(path).send(send ?? {});
      const res = await req;
      captured.push({ method: method.toUpperCase(), path, status: res.status, body: res.body });
      return res;
    };

    await capture('get', '/health');
    await capture('get', `/athletes/public?page=1&limit=50`);
    await capture('get', `/athlete-profiles/public/${athleteProfile.slug}`);
    await capture('get', `/athlete-profiles/public/does-not-exist`);
    await capture('get', `/officials/public?page=1&limit=50`);
    await capture('get', `/official-profiles/public/${officialProfile.slug}`);
    await capture('get', `/albums/public/${album.slug}`);
    await capture('get', '/albums-page');
    await capture('get', '/videos-page');
    await capture('get', `/pages/public/${page.slug}`);
    await capture('get', `/page-sections/public/by-page/${page._id.toString()}`);
    await capture('get', `/hero-slides/public/by-section/${heroSection._id.toString()}`);
    await capture('get', '/navigation-menus/public/by-key/main-nav');
    await capture('get', `/navigation-items/public/by-menu/${menu._id.toString()}`);
    await capture('get', '/site-settings/public');
    await capture('get', '/athletes-page');
    await capture('get', '/clubs-page');
    await capture('get', '/coaches-page');
    await capture('get', '/disciplines-page');
    await capture('get', '/news-page');
    await capture('get', '/records-page');
    await capture('get', '/results-rankings-page');
    await capture('get', '/federation-personnel/public');
    await capture('get', `/committees/${committee._id.toString()}/public`);
    await capture('get', `/organizational-structure/${new Types.ObjectId().toString()}/public`);
    await capture('get', `/governance-documents/${new Types.ObjectId().toString()}/public`);
    await capture('get', `/about-federation-page/${new Types.ObjectId().toString()}/public`);
    await capture('get', `/vision-mission-page/${new Types.ObjectId().toString()}/public`);
    await capture('get', `/strategic-plans-page/${new Types.ObjectId().toString()}/public`);
    await capture('get', `/president-message-page/${new Types.ObjectId().toString()}/public`);
    await capture('get', '/board-members-page');
    await capture('get', '/committees-page');
    await capture('get', '/contact-us-page');
    await capture('post', '/contact-messages', {
      messageType: 'Complaint',
      senderName: 'Citizen Tester',
      senderEmail: 'citizen@example.com',
      messageBody: 'The track surface at the stadium needs maintenance.',
    });
    await capture('post', '/auth/login', { email: 'demo@uaeaf.ae', password: 'correct horse battery staple' });

    // Also capture the live OpenAPI document (Item 4).
    const openapiRes = await request(server).get('/api/docs-json').expect(200);

    writeFileSync(
      'C:/Users/pc/AppData/Local/Temp/claude/e--uaeaf-uaeaf-project/b19094c0-4a0c-4330-a091-4fd9332c9bdd/scratchpad/captured-public-api.json',
      JSON.stringify(captured, null, 2),
    );
    writeFileSync('E:/uaeaf/uaeaf-project/api/openapi.json', JSON.stringify(openapiRes.body, null, 2));

    await app.close();

    // A soft assertion so the capture shows up as a normal pass/fail.
    expect(captured.every((entry) => entry.status < 500)).toBe(true);
  }, 120000);
});
