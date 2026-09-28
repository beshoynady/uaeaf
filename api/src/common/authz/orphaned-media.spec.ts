import { jest } from '@jest/globals';
import mongoose, { Types } from 'mongoose';
import type { Schema } from 'mongoose';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { archivedReferencedMediaAssetIds, orphanedMediaCandidates, removedMediaAssetIds } from './orphaned-media.js';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../../../test/utils/mongo-memory-server.js';

/**
 * The two directions of "an editor swapped a picture" — see the file header
 * of `orphaned-media.ts` for the reasoning. One ephemeral mongod for the
 * whole file, the same as `media-references.spec.ts`: `orphanedMediaCandidates`
 * calls the real scan, and a hand-written fake of it would be a second
 * implementation of the thing under test.
 */
let server: MongoMemoryServer;

const connection = () => mongoose.connection;

/** Every collection-backed schema, registered under its collection name —
 *  the scan refuses a connection missing any of them. Copied from
 *  `media-references.spec.ts` rather than shared, because both are
 *  self-contained test-only fixtures, not production code. */
const registerEveryCollection = async (): Promise<void> => {
  const src = fileURLToPath(new URL('../../', import.meta.url));
  const files = async (dir: string): Promise<string[]> => {
    const found: string[] = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) found.push(...(await files(path)));
      else if (entry.name.endsWith('.schema.ts')) found.push(path);
    }
    return found;
  };
  for (const file of await files(src)) {
    const module = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
    for (const value of Object.values(module)) {
      if (!(value instanceof mongoose.Schema)) continue;
      const collection = value.get('collection');
      if (typeof collection !== 'string' || mongoose.models[collection]) continue;
      mongoose.model(collection, value as Schema);
    }
  }
};

beforeAll(async () => {
  mongoose.set('autoIndex', false);
  server = await connectTestDatabase();
  await registerEveryCollection();
}, 60_000);

afterEach(async () => {
  jest.restoreAllMocks();
  await clearTestDatabase();
});

afterAll(async () => {
  await disconnectTestDatabase(server);
});

/** Inserted through the driver, not the model: each fixture carries only the
 *  fields the test is about. */
const insertAsset = async (storageKey: string, archivedAt: Date | null = null): Promise<Types.ObjectId> => {
  const _id = new Types.ObjectId();
  await connection()
    .collection('mediaAssets')
    .insertOne({
      _id,
      albumId: null,
      file: {
        url: `https://res.cloudinary.com/demo/image/upload/${storageKey}.jpg`,
        mimeType: 'image/jpeg',
        width: 800,
        height: 600,
        size: 1024,
        originalName: 'poster.jpg',
        storageKey,
        checksum: null,
        photographer: null,
        captureDate: null,
      },
      caption: { en: 'Poster', ar: 'ملصق' },
      altText: { en: 'Poster', ar: 'ملصق' },
      displayOrder: 1,
      archivedAt,
      archivedBy: archivedAt ? new Types.ObjectId() : null,
    });
  return _id;
};

const insertRevision = async (entityType: string, snapshotData: Record<string, unknown>): Promise<void> => {
  await connection().collection('revisions').insertOne({
    _id: new Types.ObjectId(),
    entityType,
    entityId: new Types.ObjectId(),
    versionNumber: 1,
    snapshotData,
  });
};

const articleSchema = (): Schema => connection().models.articles.schema;

describe('removedMediaAssetIds', () => {
  it('names an id the after state no longer carries', () => {
    const oldId = new Types.ObjectId();
    const newId = new Types.ObjectId();

    expect(removedMediaAssetIds(articleSchema(), { coverMediaId: oldId }, { coverMediaId: newId })).toEqual([
      oldId.toString(),
    ]);
  });

  it('names nothing when the field is unchanged', () => {
    const id = new Types.ObjectId();

    expect(removedMediaAssetIds(articleSchema(), { coverMediaId: id }, { coverMediaId: id })).toEqual([]);
  });

  it('names nothing when there is no before state', () => {
    const id = new Types.ObjectId();

    expect(removedMediaAssetIds(articleSchema(), null, { coverMediaId: id })).toEqual([]);
  });
});

describe('orphanedMediaCandidates', () => {
  it('offers an image the save removed and nothing else references', async () => {
    const assetId = await insertAsset('orphan-a');

    expect(await orphanedMediaCandidates(connection(), [assetId])).toEqual([assetId.toString()]);
  });

  it('does not offer an image still used somewhere else', async () => {
    const assetId = await insertAsset('orphan-b');
    await connection()
      .collection('albums')
      .insertOne({ _id: new Types.ObjectId(), coverImageId: assetId, name: { en: 'A', ar: 'أ' } });

    expect(await orphanedMediaCandidates(connection(), [assetId])).toEqual([]);
  });

  // Revisions are deliberately excluded — a replaced image is in every
  // earlier revision by definition, so counting them would mean nothing is
  // ever suggested.
  it('still offers an image that is held only by a revision', async () => {
    const assetId = await insertAsset('orphan-c');
    await insertRevision('articles', { coverMediaId: assetId });

    expect(await orphanedMediaCandidates(connection(), [assetId])).toEqual([assetId.toString()]);
  });

  it('answers empty rather than throwing when the scan fails', async () => {
    const assetId = await insertAsset('orphan-d');
    jest.spyOn(connection().models.heroSlides, 'find').mockImplementation(() => {
      throw new Error('down');
    });

    await expect(orphanedMediaCandidates(connection(), [assetId])).resolves.toEqual([]);
  });
});

describe('archivedReferencedMediaAssetIds', () => {
  it('names an archived id the content points at, without restoring it', async () => {
    const assetId = await insertAsset('restore-a', new Date());

    const archived = await archivedReferencedMediaAssetIds(connection(), articleSchema(), { coverMediaId: assetId });

    expect(archived.map(String)).toEqual([assetId.toString()]);
    // Read-only: the caller (`MediaAssetsService.unarchive`) does the write.
    const row = await connection().collection('mediaAssets').findOne({ _id: assetId });
    expect(row?.archivedAt).not.toBeNull();
  });

  it('names nothing for an id that was never archived', async () => {
    const assetId = await insertAsset('restore-b', null);

    const archived = await archivedReferencedMediaAssetIds(connection(), articleSchema(), { coverMediaId: assetId });

    expect(archived).toEqual([]);
  });

  it('names nothing, and queries nothing, when the content carries no media ref', async () => {
    const find = jest.spyOn(connection().models.mediaAssets, 'find');

    const archived = await archivedReferencedMediaAssetIds(connection(), articleSchema(), { coverMediaId: null });

    expect(archived).toEqual([]);
    expect(find).not.toHaveBeenCalled();
  });

  it('refuses rather than silently doing nothing when mediaAssets has no model', async () => {
    const models = connection().models as Record<string, unknown>;
    const registered = models.mediaAssets;
    delete models.mediaAssets;

    try {
      await expect(
        archivedReferencedMediaAssetIds(connection(), articleSchema(), { coverMediaId: new Types.ObjectId() }),
      ).rejects.toThrow('mediaAssets has no model');
    } finally {
      models.mediaAssets = registered;
    }
  });
});
