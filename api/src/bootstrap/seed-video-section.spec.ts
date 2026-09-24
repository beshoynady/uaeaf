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
} from '../modules/cms-page-composition/page-sections/schemas/page-sections.schema.js';
import { VIDEO_SECTION_DEFAULTS, seedVideoSection } from './seed-video-section.js';

/**
 * The homepage's `VIDEO_LIBRARY` row, seeded by `bootstrap:admin`.
 *
 * The property that matters is the same one the admin seeding is built on:
 * this runs on every deploy, so the second run must change nothing. A row an
 * editor has since configured must survive it untouched — re-running a deploy
 * script is not a reason to lose someone's settings.
 */
describe('seedVideoSection', () => {
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
    pages.create({
      slug: 'home',
      title: { en: 'Home', ar: 'الرئيسية' },
      status: 'Published',
    });

  it('creates the row with the approved defaults', async () => {
    const page = await givenHomepage();

    const result = await seedVideoSection({ pages, pageSections: sections });

    expect(result).toBe('created');
    const row = await sections.findOne({ sectionType: 'VIDEO_LIBRARY' }).lean();
    expect(row?.pageId?.toString()).toBe(page._id.toString());
    expect(row?.enabled).toBe(true);
    expect(row?.configuration).toMatchObject({
      featured: { mode: 'latest' },
      carousel: { source: 'latest', count: 8, includeReels: false },
    });
  });

  it('is idempotent: a second run leaves exactly one row', async () => {
    await givenHomepage();

    await seedVideoSection({ pages, pageSections: sections });
    const second = await seedVideoSection({ pages, pageSections: sections });

    expect(second).toBe('exists');
    expect(await sections.countDocuments({ sectionType: 'VIDEO_LIBRARY' })).toBe(1);
  });

  it('never touches a row an editor has already configured', async () => {
    // The whole reason this is "create if absent" rather than an upsert: a
    // deploy must not reset the count an editor chose, switch the section back
    // on after they hid it, or overwrite their heading.
    await givenHomepage();
    await seedVideoSection({ pages, pageSections: sections });

    await sections.updateOne(
      { sectionType: 'VIDEO_LIBRARY' },
      {
        enabled: false,
        sectionTitle: { en: 'Edited by a human', ar: 'عدّله محرر' },
        configuration: { featured: { mode: 'specific' }, carousel: { source: 'manual', count: 12 } },
      },
    );

    await seedVideoSection({ pages, pageSections: sections });

    const row = await sections.findOne({ sectionType: 'VIDEO_LIBRARY' }).lean();
    expect(row?.enabled).toBe(false);
    expect(row?.sectionTitle?.en).toBe('Edited by a human');
    expect(row?.configuration).toMatchObject({ carousel: { source: 'manual', count: 12 } });
  });

  it('does nothing, and does not throw, when there is no homepage to attach to', async () => {
    // A fresh database has no `pages` row. The admin bootstrap must still
    // succeed — an operator running it on an empty cluster is the case it
    // exists for, and failing there would block the first administrator.
    const result = await seedVideoSection({ pages, pageSections: sections });

    expect(result).toBe('noHomepage');
    expect(await sections.countDocuments()).toBe(0);
  });

  it('puts the section after every section already on the page', async () => {
    // Its place is the editor's to change afterwards; what matters is that it
    // does not collide with an existing `displayOrder` and land in the middle
    // of a composition nobody asked it to join.
    const page = await givenHomepage();
    await sections.create({
      pageId: page._id,
      sectionType: 'HERO',
      displayOrder: 4,
      visibility: 'Everyone',
      selectionMode: 'AUTOMATIC',
    });

    await seedVideoSection({ pages, pageSections: sections });

    const row = await sections.findOne({ sectionType: 'VIDEO_LIBRARY' }).lean();
    expect(row?.displayOrder).toBe(5);
  });

  it('states its defaults in one place, which the row is built from', () => {
    // So the dashboard's `readSectionDraft` fallbacks and this seed cannot
    // drift into disagreeing about what an unconfigured section is.
    expect(VIDEO_SECTION_DEFAULTS.configuration.carousel.count).toBe(8);
    expect(VIDEO_SECTION_DEFAULTS.configuration.carousel.includeReels).toBe(false);
    expect(VIDEO_SECTION_DEFAULTS.configuration.featured.mode).toBe('latest');
  });
});
