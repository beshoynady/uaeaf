import { Model } from 'mongoose';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MediaAssetSchema } from './schemas/media-asset.schema.js';
import type { MediaAssetDocument } from './schemas/media-asset.schema.js';
import { MediaAssetsRepository } from './media-assets.repository.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../../test/utils/mongo-memory-server.js';

describe('MediaAssetsRepository', () => {
  let server: MongoMemoryServer;
  let model: Model<MediaAssetDocument>;
  let repository: MediaAssetsRepository;

  beforeAll(async () => {
    server = await connectTestDatabase();
    model = mongoose.model<MediaAssetDocument>('MediaAsset', MediaAssetSchema);
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
    },
    caption: { en: 'Caption', ar: 'تعليق' },
    altText: { en: 'Alt', ar: 'بديل' },
    displayOrder: 1,
  };

  it('uses an index (not a collection scan) for the ordered album grid query', async () => {
    await repository.create(baseAsset);

    const explanation = await model.find({ albumId }).sort({ displayOrder: 1 }).explain('queryPlanner');
    const plan = JSON.stringify(explanation.queryPlanner.winningPlan);

    expect(plan).toContain('IXSCAN');
    expect(plan).not.toContain('COLLSCAN');
  });

  it('uses the {albumId, isVisible, displayOrder} index for the visible-only ordered grid query', async () => {
    await repository.create(baseAsset);

    const explanation = await model
      .find({ albumId, isVisible: true })
      .sort({ displayOrder: 1 })
      .explain('queryPlanner');
    const plan = JSON.stringify(explanation.queryPlanner.winningPlan);

    expect(plan).toContain('IXSCAN');
    expect(plan).toContain('albumId_1_isVisible_1_displayOrder_1');
  });
});
