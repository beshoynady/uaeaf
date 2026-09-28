import { Model } from 'mongoose';
import { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MediaAssetSchema } from './schemas/media-asset.schema.js';
import type { MediaAssetDocument } from './schemas/media-asset.schema.js';
import { MediaAssetsRepository } from './media-assets.repository.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
  registerTestModel,
  type QueryPlannerExplanation,
} from '../../../../test/utils/mongo-memory-server.js';

describe('MediaAssetsRepository', () => {
  let server: MongoMemoryServer;
  let model: Model<MediaAssetDocument>;
  let repository: MediaAssetsRepository;

  beforeAll(async () => {
    server = await connectTestDatabase();
    model = registerTestModel<MediaAssetDocument>('MediaAsset', MediaAssetSchema);
    await model.ensureIndexes();
    repository = new MediaAssetsRepository(model);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  const albumId = new Types.ObjectId();
  const baseAsset = {
    albumId,
    file: {
      url: 'https://example.com/a.jpg',
      mimeType: 'image/jpeg',
      width: 800,
      height: 600,
      size: 12345,
      originalName: 'a.jpg',
      storageKey: 'media/a.jpg',
      checksum: null,
      photographer: null,
      captureDate: null,
    },
    caption: { en: 'Caption', ar: 'تعليق' },
    altText: { en: 'Alt', ar: 'بديل' },
    displayOrder: 1,
  };

  it('uses an index (not a collection scan) for the ordered album grid query', async () => {
    await repository.create(baseAsset);

    const explanation = await model.find({ albumId }).sort({ displayOrder: 1 }).explain('queryPlanner');
    const plan = JSON.stringify((explanation as unknown as QueryPlannerExplanation).queryPlanner.winningPlan);

    expect(plan).toContain('IXSCAN');
    expect(plan).not.toContain('COLLSCAN');
  });

  it('uses the {albumId, isVisible, displayOrder} index for the visible-only ordered grid query', async () => {
    await repository.create(baseAsset);

    const explanation = await model
      .find({ albumId, isVisible: true })
      .sort({ displayOrder: 1 })
      .explain('queryPlanner');
    const plan = JSON.stringify((explanation as unknown as QueryPlannerExplanation).queryPlanner.winningPlan);

    expect(plan).toContain('IXSCAN');
    expect(plan).toContain('albumId_1_isVisible_1_displayOrder_1');
  });

  /** The unused-media report's candidate query: archived, and archived before
   *  the cutoff. A live asset or one archived too recently must never appear,
   *  since the report exists to name what is safe to purge. */
  describe('findArchivedOlderThan', () => {
    const cutoff = new Date('2026-01-01');

    it('excludes a live asset', async () => {
      await repository.create({ ...baseAsset, archivedAt: null });

      expect(await repository.findArchivedOlderThan(cutoff)).toHaveLength(0);
    });

    it('excludes an asset archived after the cutoff', async () => {
      await repository.create({ ...baseAsset, archivedAt: new Date('2026-02-01') });

      expect(await repository.findArchivedOlderThan(cutoff)).toHaveLength(0);
    });

    it('includes an asset archived on or before the cutoff', async () => {
      const created = await repository.create({ ...baseAsset, archivedAt: new Date('2025-06-01') });

      const found = await repository.findArchivedOlderThan(cutoff);

      expect(found.map((asset) => asset._id.toString())).toEqual([created._id.toString()]);
    });
  });
});
