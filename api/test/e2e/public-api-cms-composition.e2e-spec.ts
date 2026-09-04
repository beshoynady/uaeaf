import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.MONGODB_URI ??= 'placeholder-overwritten-below';
process.env.JWT_SECRET ??= 'e2e-test-secret-at-least-32-characters-long';
process.env.JWT_ACCESS_EXPIRY ??= '15m';
process.env.JWT_REFRESH_EXPIRY ??= '7d';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri('uaeaf-e2e-public-cms-composition');
});

afterAll(async () => {
  await mongoServer.stop();
});

/**
 * Completes the pages -> pageSections -> heroSlides public composition
 * chain: `pages` and `pageSections` already had @Public() routes; heroSlides
 * (the last link a HERO section needs) did not. Also proves the new
 * navigationMenus public-by-key lookup resolves into the pre-existing
 * navigationItems public-by-menu route, since a frontend that only knows a
 * menu's `key` (e.g. "main-nav") had no way to reach that route before this
 * session (2026-09-04, public-routes closure task).
 */
describe('Public API — CMS composition chain and navigation (e2e)', () => {
  it('walks pages -> pageSections -> heroSlides and navigationMenus -> navigationItems, unauthenticated', async () => {
    const { Test } = await import('@nestjs/testing');
    const { ValidationPipe, INestApplication } = await import('@nestjs/common');
    const { getModelToken } = await import('@nestjs/mongoose');
    const { Types } = await import('mongoose');
    const request = (await import('supertest')).default;

    const { AppModule } = await import('../../src/app.module.js');
    const { Page } = await import('../../src/modules/cms-page-composition/pages/schemas/pages.schema.js');
    const { PageSection } = await import(
      '../../src/modules/cms-page-composition/page-sections/schemas/page-sections.schema.js'
    );
    const { HeroSlide } = await import('../../src/modules/cms-page-composition/hero-slides/schemas/hero-slides.schema.js');
    const { NavigationMenu } = await import(
      '../../src/modules/cms-page-composition/navigation-menus/schemas/navigation-menus.schema.js'
    );
    const { NavigationItem } = await import(
      '../../src/modules/cms-page-composition/navigation-items/schemas/navigation-items.schema.js'
    );

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app: InstanceType<typeof INestApplication> = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();

    const pageModel = moduleFixture.get(getModelToken(Page.name));
    const pageSectionModel = moduleFixture.get(getModelToken(PageSection.name));
    const heroSlideModel = moduleFixture.get(getModelToken(HeroSlide.name));
    const navigationMenuModel = moduleFixture.get(getModelToken(NavigationMenu.name));
    const navigationItemModel = moduleFixture.get(getModelToken(NavigationItem.name));

    // ============================================================
    // pages -> pageSections -> heroSlides
    // ============================================================
    const page = await pageModel.create({
      slug: 'home',
      title: { en: 'Home', ar: 'الرئيسية' },
      status: 'Published',
    });
    const heroSection = await pageSectionModel.create({
      pageId: page._id,
      sectionType: 'HERO',
      displayOrder: 1,
      enabled: true,
      visibility: 'Everyone',
      selectionMode: 'MANUAL',
      items: [],
    });
    const visibleSlide = await heroSlideModel.create({
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
    await heroSlideModel.create({
      pageSectionId: heroSection._id,
      mediaType: 'IMAGE',
      imageAssetId: new Types.ObjectId(),
      title: { en: 'Inactive slide', ar: 'شريحة غير مفعّلة' },
      subtitle: { en: 'x', ar: 'x' },
      ctaText: { en: 'x', ar: 'x' },
      ctaUrl: '/x',
      displayOrder: 2,
      active: false,
    });

    const publicPage = await request(app.getHttpServer()).get(`/pages/public/${page.slug}`).expect(200);
    expect(publicPage.body._id).toBe(page._id.toString());

    const publicSections = await request(app.getHttpServer())
      .get(`/page-sections/public/by-page/${page._id.toString()}`)
      .expect(200);
    expect(publicSections.body).toHaveLength(1);
    expect(publicSections.body[0]._id).toBe(heroSection._id.toString());

    const publicSlides = await request(app.getHttpServer())
      .get(`/hero-slides/public/by-section/${heroSection._id.toString()}`)
      .expect(200);
    expect(publicSlides.body).toHaveLength(1);
    expect(publicSlides.body[0].id).toBe(visibleSlide._id.toString());
    expect(Object.keys(publicSlides.body[0]).sort()).toEqual(
      ['id', 'mediaType', 'imageAssetId', 'videoId', 'title', 'subtitle', 'ctaText', 'ctaUrl', 'displayOrder'].sort(),
    );
    expect(publicSlides.body[0]).not.toHaveProperty('active');
    expect(publicSlides.body[0]).not.toHaveProperty('pageSectionId');

    await request(app.getHttpServer()).get('/pages').expect(401);
    await request(app.getHttpServer()).get('/page-sections').expect(401);
    await request(app.getHttpServer()).get('/hero-slides').expect(401);

    // ============================================================
    // navigationMenus (public-by-key, new) -> navigationItems
    // (public-by-menu, pre-existing) — the full chain a frontend that
    // only knows the "main-nav" key can now walk end to end.
    // ============================================================
    const menu = await navigationMenuModel.create({ key: 'main-nav', location: 'Header' });
    const activeItem = await navigationItemModel.create({
      menuId: menu._id,
      label: { en: 'Athletes', ar: 'الرياضيون' },
      url: '/athletes',
      parentItemId: null,
      displayOrder: 1,
      isActive: true,
    });
    await navigationItemModel.create({
      menuId: menu._id,
      label: { en: 'Hidden', ar: 'مخفي' },
      url: '/hidden',
      parentItemId: null,
      displayOrder: 2,
      isActive: false,
    });

    const publicMenu = await request(app.getHttpServer()).get('/navigation-menus/public/by-key/main-nav').expect(200);
    expect(publicMenu.body).toEqual({ id: menu._id.toString(), key: 'main-nav', location: 'Header' });

    const publicItems = await request(app.getHttpServer())
      .get(`/navigation-items/public/by-menu/${publicMenu.body.id}`)
      .expect(200);
    expect(publicItems.body).toHaveLength(1);
    expect(publicItems.body[0]._id).toBe(activeItem._id.toString());

    // A `null` service return is serialized through supertest as `{}` — see
    // the matching note in public-api-people-organizations.e2e-spec.ts.
    const unknownMenu = await request(app.getHttpServer()).get('/navigation-menus/public/by-key/does-not-exist').expect(200);
    expect(unknownMenu.body).toEqual({});

    await request(app.getHttpServer()).get('/navigation-menus').expect(401);
    await request(app.getHttpServer()).get('/navigation-items').expect(401);

    await app.close();
  }, 90000);
});
