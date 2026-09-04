import { Model } from 'mongoose';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AlbumSchema } from './schemas/album.schema.js';
import type { AlbumDocument } from './schemas/album.schema.js';
import { AlbumsRepository } from './albums.repository.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../../test/utils/mongo-memory-server.js';

describe('AlbumsRepository', () => {
  let server: MongoMemoryServer;
  let model: Model<AlbumDocument>;
  let repository: AlbumsRepository;

  beforeAll(async () => {
    server = await connectTestDatabase();
    model = mongoose.model<AlbumDocument>('Album', AlbumSchema);
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
    contentCategoryId: new Types.ObjectId(),
    displayOrder: 1,
    publicationState: 'Draft' as const,
  };

  it('defaults assetCount to 0 on creation', async () => {
    const album = await repository.create(baseAlbum);
    expect(album.assetCount).toBe(0);
  });

  it('uses an index (not a collection scan) for the per-category publication-state listing query', async () => {
    await repository.create(baseAlbum);

    const explanation = await model
      .find({ contentCategoryId: baseAlbum.contentCategoryId, publicationState: 'Draft' })
      .explain('queryPlanner');
    const plan = JSON.stringify(explanation.queryPlanner.winningPlan);

    expect(plan).toContain('IXSCAN');
    expect(plan).not.toContain('COLLSCAN');
    expect(plan).toContain('contentCategoryId_1_publicationState_1');
  });
});
