import { jest } from '@jest/globals';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AlbumsPageSchema } from './schemas/albums-page.schema.js';
import type { AlbumsPageDocument } from './schemas/albums-page.schema.js';
import { AlbumsPageRepository } from './albums-page.repository.js';
import { AlbumsPageService } from './albums-page.service.js';
import { MediaAssetsService } from '../media-assets/media-assets.service.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../../test/utils/mongo-memory-server.js';

/** Confirms `albumsPage` never accumulates a second row — the same
 *  `SingletonPageService` guarantee already verified for `athletesPage`,
 *  re-verified here since `albumsPage` is a new consumer (2026-09-04
 *  follow-on to ADR-0054). */
describe('AlbumsPageService (integration)', () => {
  let server: MongoMemoryServer;
  let model: Model<AlbumsPageDocument>;
  let service: AlbumsPageService;

  beforeAll(async () => {
    server = await connectTestDatabase();
    model = mongoose.model<AlbumsPageDocument>('AlbumsPage', AlbumsPageSchema);
    const mediaAssetsService = {
      assertUsableImage: jest.fn(),
    } as unknown as MediaAssetsService;
    service = new AlbumsPageService(new AlbumsPageRepository(model), mediaAssetsService);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  it('upsert() creates the row on first write', async () => {
    await service.upsert({
      heroTitle: { en: 'Albums', ar: 'الألبومات' },
      heroSubtitle: { en: 'Our media gallery', ar: 'معرض الوسائط' },
    });

    const rows = await model.find().exec();
    expect(rows).toHaveLength(1);
    expect(rows[0].heroTitle.en).toBe('Albums');
  });

  it('upsert() updates in place and never creates a second row', async () => {
    const first = await service.upsert({
      heroTitle: { en: 'Albums', ar: 'الألبومات' },
      heroSubtitle: { en: 'First', ar: 'الأول' },
    });
    const second = await service.upsert({
      heroTitle: { en: 'Albums Updated', ar: 'الألبومات المحدثة' },
      heroSubtitle: { en: 'Second', ar: 'الثاني' },
    });

    const rows = await model.find().exec();
    expect(rows).toHaveLength(1);
    expect(second._id.toString()).toBe(first._id.toString());
    expect(rows[0].heroTitle.en).toBe('Albums Updated');
    expect(rows[0].heroSubtitle.en).toBe('Second');
  });

  it('get() returns null before the row exists', async () => {
    await expect(service.get()).resolves.toBeNull();
  });
});
