import { jest } from '@jest/globals';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AthletesPageSchema } from './schemas/athletes-page.schema.js';
import type { AthletesPageDocument } from './schemas/athletes-page.schema.js';
import { AthletesPageRepository } from './athletes-page.repository.js';
import { AthletesPageService } from './athletes-page.service.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../../../test/utils/mongo-memory-server.js';

/** Confirms confirmed decision #8 against a real database: a singleton
 *  `*Page` collection never accumulates a second row, however many times
 *  it is written. `athletesPage` stands in for all ten hero-wrapper
 *  singletons — they share one `SingletonPageService` implementation. */
describe('AthletesPageService (integration)', () => {
  let server: MongoMemoryServer;
  let model: Model<AthletesPageDocument>;
  let service: AthletesPageService;

  beforeAll(async () => {
    server = await connectTestDatabase();
    model = mongoose.model<AthletesPageDocument>('AthletesPage', AthletesPageSchema);
    const mediaAssetsService = {
      assertUsableImage: jest.fn(),
    } as unknown as MediaAssetsService;
    service = new AthletesPageService(new AthletesPageRepository(model), mediaAssetsService);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  it('upsert() creates the row on first write', async () => {
    await service.upsert({
      heroTitle: { en: 'Athletes', ar: 'الرياضيون' },
      heroSubtitle: { en: 'Our athletes', ar: 'رياضيونا' },
    });

    const rows = await model.find().exec();
    expect(rows).toHaveLength(1);
    expect(rows[0].heroTitle.en).toBe('Athletes');
  });

  it('upsert() updates in place and never creates a second row', async () => {
    const first = await service.upsert({
      heroTitle: { en: 'Athletes', ar: 'الرياضيون' },
      heroSubtitle: { en: 'First', ar: 'الأول' },
    });
    const second = await service.upsert({
      heroTitle: { en: 'Athletes Updated', ar: 'الرياضيون المحدثون' },
      heroSubtitle: { en: 'Second', ar: 'الثاني' },
    });

    const rows = await model.find().exec();
    expect(rows).toHaveLength(1);
    expect(second._id.toString()).toBe(first._id.toString());
    expect(rows[0].heroTitle.en).toBe('Athletes Updated');
    expect(rows[0].heroSubtitle.en).toBe('Second');
  });

  it('get() returns null before the row exists', async () => {
    await expect(service.get()).resolves.toBeNull();
  });
});
