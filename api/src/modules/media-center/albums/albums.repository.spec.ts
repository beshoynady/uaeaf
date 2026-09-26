import { Model } from 'mongoose';
import { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AlbumSchema } from './schemas/album.schema.js';
import type { AlbumDocument } from './schemas/album.schema.js';
import { MediaAssetSchema } from '../media-assets/schemas/media-asset.schema.js';
import type { MediaAssetDocument } from '../media-assets/schemas/media-asset.schema.js';
import { AlbumsRepository } from './albums.repository.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
  registerTestModel,
  type QueryPlannerExplanation,
} from '../../../../test/utils/mongo-memory-server.js';

describe('AlbumsRepository', () => {
  let server: MongoMemoryServer;
  let model: Model<AlbumDocument>;
  let repository: AlbumsRepository;

  beforeAll(async () => {
    server = await connectTestDatabase();
    model = registerTestModel<AlbumDocument>('Album', AlbumSchema);
    await model.ensureIndexes();
    repository = new AlbumsRepository(model);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  const baseAlbum = {
    title: { en: 'Gallery', ar: 'معرض' },
    slug: 'gallery',
    displayOrder: 1,
    publicationState: 'Draft' as const,
  };

  const makeAsset = (albumId: Types.ObjectId, displayOrder: number, isVisible = true) => ({
    albumId,
    file: {
      url: 'https://example.com/a.jpg',
      mimeType: 'image/jpeg',
      width: 800,
      height: 600,
      size: 1234,
      originalName: 'a.jpg',
      storageKey: 'media/a.jpg',
      checksum: null,
    },
    caption: { en: 'Caption', ar: 'تعليق' },
    altText: { en: 'Alt', ar: 'بديل' },
    displayOrder,
    isVisible,
    isFeatured: false,
  });

  it('defaults assetCount to 0 on creation', async () => {
    const album = await repository.create(baseAlbum);
    expect(album.assetCount).toBe(0);
  });

  it('carries no contentCategoryId — it pointed at a collection that was never built', () => {
    expect(model.schema.path('contentCategoryId')).toBeUndefined();
  });

  it('carries no associations — the explicit affiliation fields replaced them', () => {
    expect(model.schema.path('associations')).toBeUndefined();
  });

  it('leaves an unaffiliated album empty on every affiliation field', async () => {
    const album = await repository.create(baseAlbum);

    expect(album.championshipId).toBeNull();
    expect(album.competitionId).toBeNull();
    expect(album.publicEventId).toBeNull();
    expect(album.athleteIds).toEqual([]);
    expect(album.clubIds).toEqual([]);
    expect(album.isFeatured).toBe(false);
  });

  it('carries no seasonId, because a season is derived from eventDate', () => {
    expect(model.schema.path('seasonId')).toBeUndefined();
  });

  it('serves the published listing sort from an index, not an in-memory sort', async () => {
    await repository.create({ ...baseAlbum, publicationState: 'Published', eventDate: new Date('2026-03-14') });

    const explanation = await model
      .find({ publicationState: 'Published', archivedAt: null })
      .sort({ eventDate: -1, publishedAt: -1, _id: 1 })
      .explain('queryPlanner');
    const plan = JSON.stringify((explanation as unknown as QueryPlannerExplanation).queryPlanner.winningPlan);

    expect(plan).toContain('IXSCAN');
    expect(plan).not.toContain('COLLSCAN');
  });

  it('uses an index for the athlete filter', async () => {
    const athleteId = new Types.ObjectId();
    await repository.create({ ...baseAlbum, athleteIds: [athleteId] });

    const explanation = await model.find({ athleteIds: athleteId }).explain('queryPlanner');
    const plan = JSON.stringify((explanation as unknown as QueryPlannerExplanation).queryPlanner.winningPlan);

    expect(plan).toContain('IXSCAN');
    expect(plan).not.toContain('COLLSCAN');
  });

  describe('findPublishedBySlug', () => {
    it('resolves a Published album by slug', async () => {
      await repository.create({ ...baseAlbum, publicationState: 'Published' });

      const found = await repository.findPublishedBySlug('gallery');

      expect(found).not.toBeNull();
      expect(found!.slug).toBe('gallery');
    });

    it('returns null for a Draft album, even with a matching slug', async () => {
      await repository.create(baseAlbum); // Draft

      await expect(repository.findPublishedBySlug('gallery')).resolves.toBeNull();
    });

    it('returns null for an unknown slug', async () => {
      await expect(repository.findPublishedBySlug('does-not-exist')).resolves.toBeNull();
    });
  });

  describe('findRelated', () => {
    const championshipId = new Types.ObjectId();
    const competitionId = new Types.ObjectId();
    const athleteId = new Types.ObjectId();
    // Both inside 2025-2026, which runs September to September.
    const inSeason = new Date('2026-03-14');
    const alsoInSeason = new Date('2026-05-02');

    /** The album every test relates others to: full competitive chain, one
     *  athlete. */
    const makeCurrent = () =>
      repository.create({
        ...baseAlbum,
        slug: 'current',
        publicationState: 'Published',
        eventDate: inSeason,
        championshipId,
        competitionId,
        athleteIds: [athleteId],
      });

    it('returns an empty array for an album with no affiliation at all', async () => {
      const current = await repository.create({ ...baseAlbum, slug: 'lonely', publicationState: 'Published' });

      expect(await repository.findRelated(current, 8)).toEqual([]);
    });

    it('never returns the album itself', async () => {
      const current = await makeCurrent();

      const related = await repository.findRelated(current, 8);

      expect(related.map((a) => a._id.toString())).not.toContain(current._id.toString());
    });

    it('excludes albums that are not published', async () => {
      const current = await makeCurrent();
      await repository.create({ ...baseAlbum, slug: 'draft', publicationState: 'Draft', competitionId });

      expect(await repository.findRelated(current, 8)).toEqual([]);
    });

    it('ranks the same competition above the same championship', async () => {
      const current = await makeCurrent();
      await repository.create({
        ...baseAlbum, slug: 'same-championship', publicationState: 'Published', eventDate: inSeason, championshipId,
      });
      await repository.create({
        ...baseAlbum, slug: 'same-competition', publicationState: 'Published', eventDate: inSeason, championshipId, competitionId,
      });

      const related = await repository.findRelated(current, 8);

      expect(related.map((a) => a.slug)).toEqual(['same-competition', 'same-championship']);
    });

    it('ranks a shared athlete above the same season', async () => {
      const current = await makeCurrent();
      await repository.create({
        ...baseAlbum, slug: 'same-season', publicationState: 'Published', eventDate: alsoInSeason,
      });
      await repository.create({
        ...baseAlbum, slug: 'shared-athlete', publicationState: 'Published', athleteIds: [athleteId],
      });

      const related = await repository.findRelated(current, 8);

      expect(related.map((a) => a.slug)).toEqual(['shared-athlete', 'same-season']);
    });

    it('relates two albums of the same public event', async () => {
      const publicEventId = new Types.ObjectId();
      const current = await repository.create({
        ...baseAlbum, slug: 'conference', publicationState: 'Published', eventDate: inSeason, publicEventId,
      });
      await repository.create({
        ...baseAlbum, slug: 'same-conference', publicationState: 'Published', eventDate: inSeason, publicEventId,
      });

      const related = await repository.findRelated(current, 8);

      expect(related[0].slug).toBe('same-conference');
    });

    it('honours the limit', async () => {
      const current = await makeCurrent();
      for (let i = 0; i < 5; i += 1) {
        await repository.create({
          ...baseAlbum, slug: `sibling-${i}`, publicationState: 'Published', eventDate: inSeason, championshipId, competitionId,
        });
      }

      expect(await repository.findRelated(current, 3)).toHaveLength(3);
    });
  });
  describe('findPublicPage', () => {
    const publish = (slug: string, extra: Record<string, unknown> = {}) =>
      repository.create({ ...baseAlbum, slug, publicationState: 'Published', ...extra });

    it('returns only published albums, with a total', async () => {
      await publish('one');
      await repository.create({ ...baseAlbum, slug: 'draft' });

      const { items, total } = await repository.findPublicPage({ publicationState: 'Published', archivedAt: null }, 0, 12);

      expect(items.map((a) => a.slug)).toEqual(['one']);
      expect(total).toBe(1);
    });

    it('orders by eventDate, newest first', async () => {
      await publish('older', { eventDate: new Date('2025-01-01') });
      await publish('newer', { eventDate: new Date('2026-01-01') });

      const { items } = await repository.findPublicPage({ publicationState: 'Published', archivedAt: null }, 0, 12);

      expect(items.map((a) => a.slug)).toEqual(['newer', 'older']);
    });

    it('applies skip and limit against the full total', async () => {
      for (let i = 0; i < 5; i += 1) await publish(`album-${i}`, { eventDate: new Date(2026, i, 1) });

      const { items, total } = await repository.findPublicPage({ publicationState: 'Published', archivedAt: null }, 2, 2);

      expect(items).toHaveLength(2);
      expect(total).toBe(5);
    });

    it('carries at most three preview photos, the cover first', async () => {
      const album = await publish('with-photos');
      const assets = registerTestModel<MediaAssetDocument>('MediaAsset', MediaAssetSchema);
      const made = [];
      for (let i = 0; i < 5; i += 1) {
        made.push(await assets.create(makeAsset(album._id, i)));
      }
      const cover = made[3];
      await repository.updateById(album._id.toString(), { coverImageId: cover._id });

      const { items } = await repository.findPublicPage({ publicationState: 'Published', archivedAt: null }, 0, 12);

      expect(items[0].previewPhotos).toHaveLength(3);
      expect(items[0].previewPhotos[0]._id.toString()).toBe(cover._id.toString());
    });

    it('returns an empty preview list for an album with no photos', async () => {
      await publish('empty');

      const { items } = await repository.findPublicPage({ publicationState: 'Published', archivedAt: null }, 0, 12);

      expect(items[0].previewPhotos).toEqual([]);
    });
  });

  describe('facets', () => {
    it('returns empty lists when nothing is affiliated', async () => {
      await repository.create({ ...baseAlbum, slug: 'plain', publicationState: 'Published' });

      expect(await repository.facets()).toEqual({
        seasons: [], championships: [], competitions: [], publicEvents: [], athletes: [], clubs: [],
      });
    });

    it('counts published albums per value, ignoring drafts', async () => {
      const eventDate = new Date('2026-03-14');
      await repository.create({ ...baseAlbum, slug: 'p1', publicationState: 'Published', eventDate });
      await repository.create({ ...baseAlbum, slug: 'p2', publicationState: 'Published', eventDate });
      await repository.create({ ...baseAlbum, slug: 'd1', publicationState: 'Draft', eventDate });

      const { seasons } = await repository.facets();

      // A label, not an id: there is no season entity to carry one.
      expect(seasons).toEqual([{ id: '2025–2026', count: 2 }]);
    });

    it('counts each athlete of a multi-athlete album once', async () => {
      const a = new Types.ObjectId();
      const b = new Types.ObjectId();
      await repository.create({ ...baseAlbum, slug: 'both', publicationState: 'Published', athleteIds: [a, b] });

      const { athletes } = await repository.facets();

      expect(athletes).toHaveLength(2);
      expect(athletes.every((entry) => entry.count === 1)).toBe(true);
    });

    it('orders a facet by count, highest first', async () => {
      const popular = new Types.ObjectId();
      const rare = new Types.ObjectId();
      await repository.create({ ...baseAlbum, slug: 'c1', publicationState: 'Published', clubIds: [popular] });
      await repository.create({ ...baseAlbum, slug: 'c2', publicationState: 'Published', clubIds: [popular] });
      await repository.create({ ...baseAlbum, slug: 'c3', publicationState: 'Published', clubIds: [rare] });

      const { clubs } = await repository.facets();

      expect(clubs[0]).toEqual({ id: popular.toString(), count: 2 });
    });
  });
});
