import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../test/utils/mongo-memory-server.js';
import { Page, PageSchema } from '../modules/cms-page-composition/pages/schemas/pages.schema.js';
import {
  PageSection,
  PageSectionSchema,
  PAGE_SECTION_TYPES,
} from '../modules/cms-page-composition/page-sections/schemas/page-sections.schema.js';
import { PHOTO_GALLERY_SECTION_DEFAULTS, seedPhotoGallerySection } from './seed-photo-gallery-section.js';

/**
 * The homepage's `PHOTO_GALLERY` row, seeded by `bootstrap:admin`.
 *
 * The property that matters is the one the admin seeding is built on: this
 * runs on every deploy, so the second run must change nothing. A row an editor
 * has since configured must survive it untouched — re-running a deploy script
 * is not a reason to lose someone's settings.
 */
describe('seedPhotoGallerySection', () => {
  let server: MongoMemoryServer;
  let pages: mongoose.Model<Page>;
  let sections: mongoose.Model<PageSection>;

  beforeAll(async () => {
    server = await connectTestDatabase();
    pages = mongoose.model<Page>('Page', PageSchema);
    sections = mongoose.model<PageSection>('PageSection', PageSectionSchema);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  const givenHomepage = async () =>
    pages.create({ slug: 'home', title: { en: 'Home', ar: 'الرئيسية' }, status: 'Published' });

  it('uses PHOTO_GALLERY, which is already in the approved closed list', () => {
    expect(PAGE_SECTION_TYPES).toContain('PHOTO_GALLERY');
    expect(PAGE_SECTION_TYPES).not.toContain('PHOTO_ALBUMS');
  });

  it('creates the row with the approved defaults', async () => {
    const page = await givenHomepage();

    expect(await seedPhotoGallerySection({ pages, pageSections: sections })).toBe('created');

    const row = await sections.findOne({ sectionType: 'PHOTO_GALLERY' }).lean();
    expect(row?.pageId?.toString()).toBe(page._id.toString());
    expect(row?.enabled).toBe(true);
    expect(row?.configuration).toMatchObject({ mode: 'latest', count: 3 });
    expect(row?.sectionTitle).toMatchObject(PHOTO_GALLERY_SECTION_DEFAULTS.sectionTitle);
  });

  it('seeds real bilingual copy, not a placeholder', async () => {
    await givenHomepage();

    await seedPhotoGallerySection({ pages, pageSections: sections });

    const row = await sections.findOne({ sectionType: 'PHOTO_GALLERY' }).lean();
    expect(row?.sectionTitle?.ar).toBe('ألبومات الصور');
    expect(row?.sectionTitle?.en).toBe('Photo albums');
    expect(row?.sectionSubtitle?.ar?.length).toBeGreaterThan(10);
  });

  it('creates the row once and leaves it alone on a second run', async () => {
    await givenHomepage();

    expect(await seedPhotoGallerySection({ pages, pageSections: sections })).toBe('created');
    expect(await seedPhotoGallerySection({ pages, pageSections: sections })).toBe('exists');

    expect(await sections.countDocuments({ sectionType: 'PHOTO_GALLERY' })).toBe(1);
  });

  it("does not overwrite an editor's settings on a re-run", async () => {
    await givenHomepage();
    await seedPhotoGallerySection({ pages, pageSections: sections });
    await sections.updateOne(
      { sectionType: 'PHOTO_GALLERY' },
      { $set: { enabled: false, configuration: { mode: 'manual', count: 8, albumIds: [] } } },
    );

    await seedPhotoGallerySection({ pages, pageSections: sections });

    const row = await sections.findOne({ sectionType: 'PHOTO_GALLERY' }).lean();
    expect(row?.enabled).toBe(false);
    expect(row?.configuration).toMatchObject({ mode: 'manual', count: 8 });
  });

  it('places the row after everything already composed', async () => {
    const page = await givenHomepage();
    await sections.create({
      pageId: page._id, sectionType: 'HERO', displayOrder: 7, enabled: true,
      visibility: 'Everyone', selectionMode: 'MANUAL',
    });

    await seedPhotoGallerySection({ pages, pageSections: sections });

    const row = await sections.findOne({ sectionType: 'PHOTO_GALLERY' }).lean();
    expect(row?.displayOrder).toBe(8);
  });

  it('reports noHomepage on an empty cluster, rather than throwing', async () => {
    expect(await seedPhotoGallerySection({ pages, pageSections: sections })).toBe('noHomepage');
  });
});
