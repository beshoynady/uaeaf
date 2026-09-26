import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../test/utils/mongo-memory-server.js';
import { assertSafeDevTarget } from './dev-database.js';
import { AlbumSchema } from '../modules/media-center/albums/schemas/album.schema.js';
import { MediaAssetSchema } from '../modules/media-center/media-assets/schemas/media-asset.schema.js';
import { AthleteSchema } from '../modules/people-organizations/athletes/schemas/athlete.schema.js';
import { ClubSchema } from '../modules/people-organizations/clubs/schemas/club.schema.js';
import {
  DEV_ALBUMS,
  DEV_ATHLETES,
  DEV_CLUBS,
  DEV_SEED_PREFIX,
  cleanAlbumsDev,
  seedAlbumsDev,
  type SeedPhotoSource,
} from './seed-albums-dev.js';

/**
 * The development gallery seed.
 *
 * Two properties carry the weight. It must refuse any database that is not on
 * this machine — it writes freely and deletes by pattern, and pointed at a
 * shared server either would be an incident. And it must be safe to run twice,
 * because nobody remembers whether they ran it.
 */
describe('seedAlbumsDev', () => {
  let server: MongoMemoryServer;
  let models: Parameters<typeof seedAlbumsDev>[0];

  const source = (index: number): SeedPhotoSource => ({
    url: `https://example.com/${index}.jpg`,
    storageKey: `uaeaf/library/dev-seed/albums/${index}.jpg`,
    width: 1600,
    height: 1067,
    mimeType: 'image/jpeg',
    size: 240_000,
    photographer: `Photographer ${index}`,
  });
  const sources = [0, 1, 2, 3, 4].map(source);

  beforeAll(async () => {
    server = await connectTestDatabase();
    models = {
      albums: mongoose.model('Album', AlbumSchema),
      mediaAssets: mongoose.model('MediaAsset', MediaAssetSchema),
      athletes: mongoose.model('Athlete', AthleteSchema),
      clubs: mongoose.model('Club', ClubSchema),
    } as unknown as Parameters<typeof seedAlbumsDev>[0];
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  describe('the local-database guard', () => {
    it('refuses an Atlas connection string before writing anything', () => {
      expect(() =>
        assertSafeDevTarget('mongodb+srv://user:pw@cluster.mongodb.net/uaeaf', 'development'),
      ).toThrow(/local database/i);
    });

    it('refuses a remote host', () => {
      expect(() => assertSafeDevTarget('mongodb://db.example.com:27017/uaeaf', 'development')).toThrow(
        /local database/i,
      );
    });

    it('refuses production whatever the host', () => {
      expect(() => assertSafeDevTarget('mongodb://127.0.0.1:27017/uaeaf', 'production')).toThrow(
        /production/i,
      );
    });

    it('allows a local database in development', () => {
      expect(() => assertSafeDevTarget('mongodb://localhost:27017/uaeaf', 'development')).not.toThrow();
    });
  });

  it('refuses to run with no photo sources rather than creating empty albums', async () => {
    await expect(seedAlbumsDev(models, [])).rejects.toThrow(/nothing to fill/i);
  });

  it('creates the full development gallery', async () => {
    const result = await seedAlbumsDev(models, sources);

    expect(result.albums).toBe(DEV_ALBUMS.length);
    expect(result.athletes).toBe(DEV_ATHLETES.length);
    expect(result.clubs).toBe(DEV_CLUBS.length);
    expect(result.photos).toBe(DEV_ALBUMS.reduce((sum, album) => sum + album.photos, 0));
  });

  it('publishes ten albums and leaves two as drafts', async () => {
    await seedAlbumsDev(models, sources);

    expect(await models.albums.countDocuments({ publicationState: 'Published' })).toBe(10);
    expect(await models.albums.countDocuments({ publicationState: 'Draft' })).toBe(2);
  });

  it('marks exactly one album as featured', async () => {
    await seedAlbumsDev(models, sources);

    expect(await models.albums.countDocuments({ isFeatured: true })).toBe(1);
  });

  it('gives every album a cover and a matching assetCount', async () => {
    await seedAlbumsDev(models, sources);

    for (const album of await models.albums.find().exec()) {
      const photos = await models.mediaAssets.countDocuments({ albumId: album._id });
      expect(album.assetCount).toBe(photos);
      expect(album.coverImageId).not.toBeNull();
    }
  });

  it('attaches athletes and clubs to some albums but not all, so both filters show a range', async () => {
    await seedAlbumsDev(models, sources);

    const withAthletes = await models.albums.countDocuments({ 'athleteIds.0': { $exists: true } });
    const withClubs = await models.albums.countDocuments({ 'clubIds.0': { $exists: true } });

    expect(withAthletes).toBeGreaterThan(0);
    expect(withAthletes).toBeLessThan(DEV_ALBUMS.length);
    expect(withClubs).toBeGreaterThan(0);
    expect(withClubs).toBeLessThan(DEV_ALBUMS.length);
  });

  it('affiliates no album to a collection that does not exist', async () => {
    await seedAlbumsDev(models, sources);

    expect(
      await models.albums.countDocuments({
        $or: [
          { championshipId: { $ne: null } },
          { competitionId: { $ne: null } },
          { publicEventId: { $ne: null } },
        ],
      }),
    ).toBe(0);
  });

  it('adds nothing on a second run', async () => {
    await seedAlbumsDev(models, sources);
    const before = await models.albums.countDocuments();

    const second = await seedAlbumsDev(models, sources);

    expect(second.albums).toBe(0);
    expect(second.skipped).toBe(DEV_ALBUMS.length);
    expect(await models.albums.countDocuments()).toBe(before);
  });

  describe('cleanAlbumsDev', () => {
    it('removes everything the seed created', async () => {
      await seedAlbumsDev(models, sources);

      const result = await cleanAlbumsDev(models);

      expect(result.albums).toBe(DEV_ALBUMS.length);
      expect(result.athletes).toBe(DEV_ATHLETES.length);
      expect(result.clubs).toBe(DEV_CLUBS.length);
      expect(await models.albums.countDocuments()).toBe(0);
      expect(await models.mediaAssets.countDocuments()).toBe(0);
    });

    it('reports each distinct storage key once, not once per photo', async () => {
      await seedAlbumsDev(models, sources);

      const result = await cleanAlbumsDev(models);

      expect(result.storageKeys).toHaveLength(sources.length);
    });

    it("leaves an editor's own album alone", async () => {
      await seedAlbumsDev(models, sources);
      await models.albums.create({
        title: { en: 'Real', ar: 'حقيقي' },
        slug: 'a-real-album',
        displayOrder: 99,
        publicationState: 'Published',
      });

      await cleanAlbumsDev(models);

      expect(await models.albums.countDocuments({ slug: 'a-real-album' })).toBe(1);
    });

    it('every album and club it creates is findable by the prefix', async () => {
      await seedAlbumsDev(models, sources);

      expect(await models.albums.countDocuments({ slug: { $regex: `^${DEV_SEED_PREFIX}` } })).toBe(
        DEV_ALBUMS.length,
      );
      expect(await models.clubs.countDocuments({ slug: { $regex: `^${DEV_SEED_PREFIX}` } })).toBe(
        DEV_CLUBS.length,
      );
    });
  });
});
