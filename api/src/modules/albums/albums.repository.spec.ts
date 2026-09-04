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

    it('returns an empty array without querying when associations is empty', async () => {
      const other = await repository.create({ ...baseAlbum, slug: 'other', publicationState: 'Published' });

      const related = await repository.findRelated([], other._id, 8);

      expect(related).toEqual([]);
    });

    it('finds other Published albums sharing an association target', async () => {
      const current = await repository.create({
        ...baseAlbum,
        slug: 'current',
        publicationState: 'Published',
        associations: [{ ownerType: 'championships', ownerId: championshipId, role: 'Related', displayOrder: 0 }],
      });
      const sharing = await repository.create({
        ...baseAlbum,
        slug: 'sharing',
        publicationState: 'Published',
        associations: [{ ownerType: 'championships', ownerId: championshipId, role: 'Related', displayOrder: 0 }],
      });
      await repository.create({ ...baseAlbum, slug: 'unrelated', publicationState: 'Published' });

      const related = await repository.findRelated(current.associations, current._id, 8);

      expect(related.map((a) => a._id.toString())).toEqual([sharing._id.toString()]);
    });

    it('excludes a Draft album that shares the same association target', async () => {
      const current = await repository.create({
        ...baseAlbum,
        slug: 'current',
        publicationState: 'Published',
        associations: [{ ownerType: 'championships', ownerId: championshipId, role: 'Related', displayOrder: 0 }],
      });
      await repository.create({
        ...baseAlbum,
        slug: 'draft-sharing',
        publicationState: 'Draft',
        associations: [{ ownerType: 'championships', ownerId: championshipId, role: 'Related', displayOrder: 0 }],
      });

      const related = await repository.findRelated(current.associations, current._id, 8);

      expect(related).toEqual([]);
    });

    it('excludes an archived album that shares the same association target', async () => {
      const current = await repository.create({
        ...baseAlbum,
        slug: 'current',
        publicationState: 'Published',
        associations: [{ ownerType: 'championships', ownerId: championshipId, role: 'Related', displayOrder: 0 }],
      });
      const archived = await repository.create({
        ...baseAlbum,
        slug: 'archived-sharing',
        publicationState: 'Published',
        associations: [{ ownerType: 'championships', ownerId: championshipId, role: 'Related', displayOrder: 0 }],
      });
      await model.updateOne({ _id: archived._id }, { archivedAt: new Date() }).exec();

      const related = await repository.findRelated(current.associations, current._id, 8);

      expect(related).toEqual([]);
    });

    it('uses an index (not a collection scan) for the shared-association-target lookup', async () => {
      await repository.create({
        ...baseAlbum,
        slug: 'indexed',
        publicationState: 'Published',
        associations: [{ ownerType: 'championships', ownerId: championshipId, role: 'Related', displayOrder: 0 }],
      });

      const explanation = await model
        .find({
          _id: { $ne: new Types.ObjectId() },
          publicationState: 'Published',
          archivedAt: null,
          $or: [{ associations: { $elemMatch: { ownerType: 'championships', ownerId: championshipId } } }],
        })
        .explain('queryPlanner');
      const plan = JSON.stringify(explanation.queryPlanner.winningPlan);

      expect(plan).toContain('IXSCAN');
      expect(plan).not.toContain('COLLSCAN');
    });
  });
});
