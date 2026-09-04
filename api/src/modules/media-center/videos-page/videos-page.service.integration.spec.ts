import { jest } from '@jest/globals';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { VideosPageSchema } from './schemas/videos-page.schema.js';
import type { VideosPageDocument } from './schemas/videos-page.schema.js';
import { VideosPageRepository } from './videos-page.repository.js';
import { VideosPageService } from './videos-page.service.js';
import { MediaAssetsService } from '../media-assets/media-assets.service.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../../../test/utils/mongo-memory-server.js';

/** Confirms `videosPage` never accumulates a second row — the same
 *  `SingletonPageService` guarantee already verified for `athletesPage`,
 *  re-verified here since `videosPage` is a new consumer (2026-09-04
 *  follow-on to ADR-0054). */
describe('VideosPageService (integration)', () => {
  let server: MongoMemoryServer;
  let model: Model<VideosPageDocument>;
  let service: VideosPageService;

  beforeAll(async () => {
    server = await connectTestDatabase();
    model = mongoose.model<VideosPageDocument>('VideosPage', VideosPageSchema);
    const mediaAssetsService = {
      assertUsableImage: jest.fn(),
    } as unknown as MediaAssetsService;
    service = new VideosPageService(new VideosPageRepository(model), mediaAssetsService);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  it('upsert() creates the row on first write', async () => {
    await service.upsert({
      heroTitle: { en: 'Videos', ar: 'الفيديوهات' },
      heroSubtitle: { en: 'Watch highlights', ar: 'شاهد أبرز اللحظات' },
    });

    const rows = await model.find().exec();
    expect(rows).toHaveLength(1);
    expect(rows[0].heroTitle.en).toBe('Videos');
  });

  it('upsert() updates in place and never creates a second row', async () => {
    const first = await service.upsert({
      heroTitle: { en: 'Videos', ar: 'الفيديوهات' },
      heroSubtitle: { en: 'First', ar: 'الأول' },
    });
    const second = await service.upsert({
      heroTitle: { en: 'Videos Updated', ar: 'الفيديوهات المحدثة' },
      heroSubtitle: { en: 'Second', ar: 'الثاني' },
    });

    const rows = await model.find().exec();
    expect(rows).toHaveLength(1);
    expect(second._id.toString()).toBe(first._id.toString());
    expect(rows[0].heroTitle.en).toBe('Videos Updated');
    expect(rows[0].heroSubtitle.en).toBe('Second');
  });

  it('get() returns null before the row exists', async () => {
    await expect(service.get()).resolves.toBeNull();
  });
});
