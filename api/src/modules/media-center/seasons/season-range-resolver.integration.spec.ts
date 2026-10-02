import { Model, Types } from 'mongoose';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { Season, SeasonSchema } from './schemas/season.schema.js';
import type { SeasonDocument } from './schemas/season.schema.js';
import { SeasonRangeResolver } from './season-range-resolver.js';
import { AlbumSchema } from '../albums/schemas/album.schema.js';
import type { AlbumDocument } from '../albums/schemas/album.schema.js';
import { AlbumsRepository } from '../albums/albums.repository.js';
import { AlbumsService } from '../albums/albums.service.js';
import { MediaAssetSchema } from '../media-assets/schemas/media-asset.schema.js';
import type { MediaAssetDocument } from '../media-assets/schemas/media-asset.schema.js';
import { MediaAssetsRepository } from '../media-assets/media-assets.repository.js';
import { MediaAssetsService } from '../media-assets/media-assets.service.js';
import { VideoSchema } from '../videos/schemas/video.schema.js';
import type { VideoDocument } from '../videos/schemas/video.schema.js';
import { VideosRepository } from '../videos/videos.repository.js';
import { VideosService } from '../videos/videos.service.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
  registerTestModel,
} from '../../../../test/utils/mongo-memory-server.js';

/**
 * The public album and video lists, filtered by `season`, against a real
 * database.
 *
 * The season below deliberately does not run September to August: 15 August
 * to 31 July, Dubai days. That is what separates the two resolutions — a
 * label keeps the UTC September-to-September range, a slug takes the season's
 * own days — so every assertion names content that only one of them includes.
 */
describe('season filter on the public album and video lists (integration)', () => {
  let server: MongoMemoryServer;
  let seasonModel: Model<SeasonDocument>;
  let albumModel: Model<AlbumDocument>;
  let videoModel: Model<VideoDocument>;
  let albums: AlbumsService;
  let videos: VideosService;

  beforeAll(async () => {
    server = await connectTestDatabase();
    seasonModel = registerTestModel<SeasonDocument>(Season.name, SeasonSchema);
    albumModel = registerTestModel<AlbumDocument>('Album', AlbumSchema);
    videoModel = registerTestModel<VideoDocument>('Video', VideoSchema);
    const mediaAssetModel = registerTestModel<MediaAssetDocument>('MediaAsset', MediaAssetSchema);
    const resolver = new SeasonRangeResolver(seasonModel);
    const mediaAssets = new MediaAssetsService(new MediaAssetsRepository(mediaAssetModel), albumModel, undefined as never);
    albums = new AlbumsService(new AlbumsRepository(albumModel), mediaAssets, undefined, resolver);
    videos = new VideosService(new VideosRepository(videoModel), resolver);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  /** A Dubai calendar day stored the way the dashboard stores one: its Dubai midnight. */
  const day = (date: string): Date => new Date(`${date}T00:00:00+04:00`);

  const createSeason = (overrides: Record<string, unknown> = {}) =>
    seasonModel.create({
      name: { en: 'Season 2025–2026', ar: 'موسم 2025–2026' },
      shortName: '2025–26',
      slug: '2025-2026',
      about: { en: 'About', ar: 'نبذة' },
      startDate: day('2025-08-15'),
      endDate: day('2026-07-31'),
      publicationState: 'Live',
      isVisible: true,
      ...overrides,
    });

  /** Instants chosen to fall on either side of one boundary or the other. */
  const DATES = {
    // Inside the season's days, before 1 September: the slug only.
    augustBeforeLabel: new Date('2025-08-20T10:00:00Z'),
    // 23:30 on 31 July in Dubai — the last day, whole: both.
    lastDayLateEvening: new Date('2026-07-31T19:30:00Z'),
    // 00:30 on 1 August in Dubai, still 31 July in UTC: the label only.
    dayAfterInDubai: new Date('2026-07-31T20:30:00Z'),
    // After the season's last day, before 1 September: the label only.
    lateAugust: new Date('2026-08-20T10:00:00Z'),
  } as const;

  const seedAlbums = () =>
    albumModel.insertMany(
      Object.entries(DATES).map(([slug, eventDate], index) => ({
        title: { en: slug, ar: slug },
        slug,
        contentCategoryId: new Types.ObjectId(),
        displayOrder: index,
        publicationState: 'Published',
        eventDate,
      })),
    );

  const seedVideos = () =>
    videoModel.insertMany(
      Object.entries(DATES).map(([key, publishedAt], index) => ({
        title: { en: key, ar: key },
        category: 'championships',
        kind: 'video',
        externalPlatform: 'youtube',
        externalUrl: `https://youtube.com/watch?v=${index}`,
        externalId: String(index),
        status: 'published',
        publishedAt,
      })),
    );

  const albumSlugs = async (season?: string) =>
    (await albums.listPublic(season === undefined ? {} : { season })).items.map((item) => item.slug).sort();

  const videoTitles = async (season?: string) =>
    (await videos.findPublicPage(1, 48, season === undefined ? {} : { season })).items.map((item) => item.title.en).sort();

  describe('albums', () => {
    it("narrows a season's slug to its own Dubai days, the whole last day included", async () => {
      await createSeason();
      await seedAlbums();

      await expect(albumSlugs('2025-2026')).resolves.toEqual(['augustBeforeLabel', 'lastDayLateEvening']);
    });

    it('answers a label exactly as before, whether or not a season record exists', async () => {
      await seedAlbums();
      const before = await albumSlugs('2025–2026');
      await createSeason();
      const after = await albumSlugs('2025–2026');

      expect(before).toEqual(['dayAfterInDubai', 'lastDayLateEvening', 'lateAugust']);
      expect(after).toEqual(before);
    });

    it.each([
      ['a Draft season', { publicationState: 'Draft' }],
      ['a hidden season', { isVisible: false }],
    ])("does not resolve the slug of %s, and shows the whole gallery", async (_label, overrides) => {
      await createSeason(overrides);
      await seedAlbums();

      await expect(albumSlugs('2025-2026')).resolves.toEqual(await albumSlugs());
      expect((await albumSlugs()).length).toBe(4);
    });
  });

  describe('videos', () => {
    it("narrows a season's slug to its own Dubai days, the whole last day included", async () => {
      await createSeason();
      await seedVideos();

      await expect(videoTitles('2025-2026')).resolves.toEqual(['augustBeforeLabel', 'lastDayLateEvening']);
    });

    it('answers a label exactly as before, whether or not a season record exists', async () => {
      await seedVideos();
      const before = await videoTitles('2025–2026');
      await createSeason();
      const after = await videoTitles('2025–2026');

      expect(before).toEqual(['dayAfterInDubai', 'lastDayLateEvening', 'lateAugust']);
      expect(after).toEqual(before);
    });

    it('lets an explicit date window win over a season slug', async () => {
      await createSeason();
      await seedVideos();

      const page = await videos.findPublicPage(1, 48, { season: '2025-2026', from: '2026-08-01', to: '2026-08-31' });

      expect(page.items.map((item) => item.title.en)).toEqual(['lateAugust']);
    });
  });
});
