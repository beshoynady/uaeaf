import mongoose, { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AboutFederationPage, AboutFederationPageSchema } from './about-federation-page.schema.js';
import type { AboutFederationPageDocument } from './about-federation-page.schema.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
  registerTestModel,
} from '../../../../../test/utils/mongo-memory-server.js';

const text = (value: string) => ({ ar: value, en: value });

describe('AboutFederationPage schema — fields', () => {
  const paths = Object.keys(AboutFederationPageSchema.paths);

  it('declares the ten sections of the approved page plus its stored state', () => {
    expect(paths).toEqual(
      expect.arrayContaining([
        'isActive',
        'hiddenSections',
        'hero',
        'facts',
        'story',
        'timeline',
        'achievements',
        'pioneers',
        'leadership',
        'governance',
        'ecosystem',
        'cta',
        'seo',
        'publicationState',
      ]),
    );
  });

  /** Order is fixed in the page's code (ADR-0101), and the highlights strip
   *  was dropped from the approved composition — it repeated the facts row. */
  it('stores no section order and no story highlights', () => {
    expect(paths).not.toContain('sectionOrder');
    expect(paths).not.toContain('story.highlights');
  });

  /** None of the old flat design survives: it was never published, so there
   *  is no live content to strand. */
  it('keeps none of the superseded flat fields', () => {
    for (const gone of [
      'foundingDate',
      'historicalIntro',
      'foundingDecreeCaption',
      'roleHeading',
      'roleText',
      'globalMembershipYear',
      'firstPresidentPhoto',
      'firstPresidentName',
      'heroTitle',
      'heroSubtitle',
      'heroImageId',
    ]) {
      expect(paths).not.toContain(gone);
    }
  });

  it('starts a new page switched off, so nothing reaches visitors unreviewed', () => {
    const Page = mongoose.model(AboutFederationPage.name, AboutFederationPageSchema);
    expect(new Page({}).isActive).toBe(false);
  });
});

/**
 * `isActive` is operational state, not content: it says whether the finished
 * page is being served, and it is changed outside the review cycle.
 *
 * `RevisionsService.snapshotOf` freezes whatever a `.lean()` read returns, and
 * `PublishingService.restore` writes a snapshot straight back over the record.
 * Were `isActive` an ordinary field, restoring last week's wording would also
 * restore last week's live/offline state — taking a published page off the site
 * with no one asking for it, and no mention of it in the confirmation. Both of
 * those services are shared workflow core and are not ours to special-case, so
 * the exclusion lives here, on the field: `select: false` keeps it out of every
 * read that does not ask for it by name, the snapshot included.
 */
describe('AboutFederationPage schema — isActive is kept out of revisions', () => {
  let server: MongoMemoryServer;
  let model: Model<AboutFederationPageDocument>;

  beforeAll(async () => {
    server = await connectTestDatabase();
    model = registerTestModel<AboutFederationPageDocument>('AboutFederationPageRevisionGuard', AboutFederationPageSchema);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  const seedRow = async () =>
    model.create({
      isActive: true,
      hiddenSections: [],
      hero: { eyebrow: text('e'), title: text('t'), description: text('d'), imageId: null },
      publicationState: 'Draft',
    });

  it('leaves isActive out of the plain read a revision snapshot is taken from', async () => {
    const row = await seedRow();

    const snapshotSource = await model.findOne({ _id: row._id }).lean<Record<string, unknown>>().exec();

    expect(snapshotSource).not.toBeNull();
    expect(Object.keys(snapshotSource!)).not.toContain('isActive');
  });

  it('still returns isActive to a caller that asks for it by name', async () => {
    const row = await seedRow();

    const withFlag = await model.findOne({ _id: row._id }).select('+isActive').lean<{ isActive: boolean }>().exec();

    expect(withFlag?.isActive).toBe(true);
  });

  it('leaves a live page live when an older version is written back over it', async () => {
    const row = await seedRow();
    // Exactly what `PublishingService.restore` does: $set the snapshot's
    // content over the record. The snapshot cannot carry `isActive`, so the
    // page's live state survives the restore.
    const snapshot = await model.findOne({ _id: row._id }).lean<Record<string, unknown>>().exec();
    const { _id, createdAt, updatedAt, ...content } = snapshot!;
    void _id;
    void createdAt;
    void updatedAt;

    await model.updateOne({ _id: row._id }, { $set: content }).exec();

    const after = await model.findOne({ _id: row._id }).select('+isActive').lean<{ isActive: boolean }>().exec();
    expect(after?.isActive).toBe(true);
  });
});
