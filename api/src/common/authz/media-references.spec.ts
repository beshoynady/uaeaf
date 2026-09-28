import { jest } from '@jest/globals';
import mongoose, { Schema, Types } from 'mongoose';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  MediaReferenceCheckFailedError,
  SCANNED_COLLECTIONS,
  dynamicReferencePathsIn,
  findMediaAssetReferrers,
  findReferencedMediaAssetIds,
  referencePathsFor,
  referencePathsIn,
} from './media-references.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../../test/utils/mongo-memory-server.js';

/**
 * The one function that answers "is this media file still used?" before
 * anything destroys it.
 *
 * One ephemeral mongod for the whole file: the searches are regexes and `$or`
 * filters over real documents, and a hand-written fake that interpreted them
 * would be a second implementation of the thing under test.
 */
let server: MongoMemoryServer;

const connection = () => mongoose.connection;

/** Every collection-backed schema, registered under its collection name. The
 *  scan refuses a connection missing any of them, and a five-model fixture
 *  would exercise a roster the application never has. */
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
  // The fixtures are inserted through the driver, so no index is needed, and
  // building every collection's indexes would only slow the file down.
  mongoose.set('autoIndex', false);
  server = await connectTestDatabase();
  await registerEveryCollection();
}, 60_000);

afterEach(async () => {
  mongoose.set('debug', false);
  jest.restoreAllMocks();
  await clearTestDatabase();
});

afterAll(async () => {
  await disconnectTestDatabase(server);
});

/** Documents are inserted through the driver, not the model: these fixtures
 *  carry the one field each test is about, and model validation would demand
 *  every required sibling for no gain. */
const insertAsset = async (storageKey: string): Promise<Types.ObjectId> => {
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
      archivedAt: null,
    });
  return _id;
};

const insertHeroSlide = async (fields: Record<string, unknown>): Promise<Types.ObjectId> => {
  const _id = new Types.ObjectId();
  await connection()
    .collection('heroSlides')
    .insertOne({ _id, ...fields });
  return _id;
};

const insertRevision = async (snapshotData: Record<string, unknown>): Promise<Types.ObjectId> => {
  const _id = new Types.ObjectId();
  await connection().collection('revisions').insertOne({
    _id,
    entityType: 'articles',
    entityId: new Types.ObjectId(),
    versionNumber: 1,
    snapshotData,
  });
  return _id;
};

const richTextBody = (href: string) => ({
  en: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'the poster', marks: [{ type: 'link', attrs: { href } }] }],
      },
    ],
  },
  ar: { type: 'doc', content: [] },
});

const STORAGE_KEY = 'uaeaf/media/poster-9f2';
const DELIVERED = `https://res.cloudinary.com/demo/image/upload/v1712345/${STORAGE_KEY}.jpg`;

/**
 * The shapes are read from Mongoose's own metadata rather than from a list,
 * because a hand-written list stops being a check the day somebody adds the
 * next field — and that failure arrives in front of an irreversible delete.
 */
describe('reference paths read from schema metadata', () => {
  // Written the way an ordinary developer writes each shape, including the
  // array spelling whose `ref` is readable ONLY at `options.type[0].ref` on
  // Mongoose 9.9.4 (measured). The assertions name the FIELD found, never the
  // property the implementation happened to read it from: a test that asserts
  // on the property passes whenever test and implementation are wrong together.
  const probe = new Schema({
    direct: { type: Schema.Types.ObjectId, ref: 'MediaAsset' },
    inArray: [{ type: Schema.Types.ObjectId, ref: 'MediaAsset' }],
    altForm: { type: [Schema.Types.ObjectId], ref: 'MediaAsset' },
    nested: new Schema({ deep: { type: Schema.Types.ObjectId, ref: 'MediaAsset' } }),
    nestedArray: [new Schema({ deeper: { type: Schema.Types.ObjectId, ref: 'MediaAsset' } })],
    dynamic: { type: Schema.Types.ObjectId, refPath: 'dynamicModel' },
    dynamicModel: { type: String },
    unrelated: { type: Schema.Types.ObjectId, ref: 'User' },
    plain: { type: Schema.Types.ObjectId },
  });

  it('finds the reference in every shape Mongoose can express it', () => {
    expect(
      referencePathsIn(probe, 'MediaAsset')
        .map((found) => found.path)
        .sort(),
    ).toEqual(['altForm', 'direct', 'inArray', 'nested.deep', 'nestedArray.deeper']);
  });

  it('follows a discriminator, whose paths live on a schema of its own', () => {
    const base = new Schema({ kind: { type: String } }, { discriminatorKey: 'kind' });
    base.discriminator('WithPhoto', new Schema({ photoId: { type: Schema.Types.ObjectId, ref: 'MediaAsset' } }));

    expect(referencePathsIn(base, 'MediaAsset').map((found) => found.path)).toEqual(['photoId']);
  });

  // `refPath` names a field holding the model name, so it cannot be resolved
  // without a document. It is reported separately rather than dropped: dropped,
  // a dynamic reference is invisible to the check that guards the delete.
  it('keeps a refPath out of the static list and names it separately', () => {
    expect(referencePathsIn(probe, 'MediaAsset').some((found) => found.path === 'dynamic')).toBe(false);
    expect(dynamicReferencePathsIn(probe).map((found) => found.path)).toEqual(['dynamic']);
  });

  it('ignores a ref to another model and an ObjectId with no ref at all', () => {
    const paths = referencePathsIn(probe, 'MediaAsset').map((found) => found.path);

    expect(paths).not.toContain('unrelated');
    expect(paths).not.toContain('plain');
  });

  it('finds the declared references of the registered models, without a hand-written list', () => {
    expect(referencePathsFor(connection(), 'MediaAsset')).toEqual(
      expect.arrayContaining([
        { collection: 'heroSlides', path: 'imageAssetId' },
        { collection: 'albums', path: 'coverImageId' },
        { collection: 'articles', path: 'coverMediaId' },
      ]),
    );
  });
});

describe('findMediaAssetReferrers', () => {
  it('reports a schema reference with its collection, path, document and kind', async () => {
    const assetId = await insertAsset(STORAGE_KEY);
    const slideId = await insertHeroSlide({ imageAssetId: assetId });

    expect(await findMediaAssetReferrers(connection(), assetId)).toEqual([
      { collection: 'heroSlides', path: 'imageAssetId', documentId: slideId.toString(), kind: 'ref' },
    ]);
  });

  // The class metadata cannot see. A published revision is a frozen copy of a
  // record, so an id inside it is embedded JSON, not a `ref` — and purging an
  // asset a live publication still displays would otherwise succeed.
  it('finds an id embedded in a revision snapshot', async () => {
    const assetId = await insertAsset(STORAGE_KEY);
    await insertRevision({ coverMediaId: assetId });

    expect(await findMediaAssetReferrers(connection(), assetId)).toEqual([
      expect.objectContaining({ collection: 'revisions', path: 'snapshotData.coverMediaId', kind: 'ref' }),
    ]);
  });

  it('leaves the revision out when the caller counts live references only', async () => {
    const assetId = await insertAsset(STORAGE_KEY);
    await insertRevision({ coverMediaId: assetId });

    expect(await findMediaAssetReferrers(connection(), assetId, { includeRevisions: false })).toEqual([]);
    expect(await findMediaAssetReferrers(connection(), assetId)).toHaveLength(1);
  });

  it('finds the storageKey inside a rich-text link mark', async () => {
    const assetId = await insertAsset(STORAGE_KEY);
    await connection()
      .collection('articles')
      .insertOne({ _id: new Types.ObjectId(), body: richTextBody(DELIVERED) });

    expect(await findMediaAssetReferrers(connection(), assetId)).toEqual([
      expect.objectContaining({ collection: 'articles', path: 'body', kind: 'richTextLink' }),
    ]);
  });

  it('finds the storageKey pasted into a plain URL field', async () => {
    const assetId = await insertAsset(STORAGE_KEY);
    await insertHeroSlide({ primaryCta: { isVisible: true, label: null, url: DELIVERED } });

    expect(await findMediaAssetReferrers(connection(), assetId)).toEqual([
      expect.objectContaining({ collection: 'heroSlides', path: 'primaryCta.url', kind: 'urlField' }),
    ]);
  });

  // Four of the scanned paths sit inside an array of subdocuments, where the
  // filter relies on Mongo's dotted paths traversing the array.
  it('finds the storageKey inside an array of subdocuments', async () => {
    const assetId = await insertAsset(STORAGE_KEY);
    await connection()
      .collection('federationPersonnel')
      .insertOne({
        _id: new Types.ObjectId(),
        socialLinks: [
          { platform: 'X', url: 'https://x.com/uaeaf' },
          { platform: 'Instagram', url: DELIVERED },
        ],
      });

    expect(await findMediaAssetReferrers(connection(), assetId)).toEqual([
      expect.objectContaining({ collection: 'federationPersonnel', path: 'socialLinks.url', kind: 'urlField' }),
    ]);
  });

  // A pasted URL that never became a link is the ordinary case, not an exotic
  // one: the key has to be found in the text of a node as well as in a mark.
  it('finds the storageKey pasted as plain text in a rich-text body', async () => {
    const assetId = await insertAsset(STORAGE_KEY);
    await connection()
      .collection('articles')
      .insertOne({
        _id: new Types.ObjectId(),
        body: {
          en: {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: `see ${DELIVERED}` }] }],
          },
          ar: { type: 'doc', content: [] },
        },
      });

    expect(await findMediaAssetReferrers(connection(), assetId)).toEqual([
      expect.objectContaining({ collection: 'articles', path: 'body', kind: 'richTextLink' }),
    ]);
  });

  // `DocumentFileVariantDto.url` is `@IsString() @MinLength(1)` and the service
  // stores `dto.file` as given, so an editor can put any URL here.
  it('finds the storageKey in a document file url', async () => {
    const assetId = await insertAsset(STORAGE_KEY);
    await connection()
      .collection('documents')
      .insertOne({
        _id: new Types.ObjectId(),
        file: {
          en: { url: DELIVERED, mimeType: 'image/jpeg', size: 1, filename: 'poster.jpg' },
          ar: { url: 'https://example.com/other.pdf', mimeType: 'application/pdf', size: 1, filename: 'a.pdf' },
        },
      });

    expect(await findMediaAssetReferrers(connection(), assetId)).toEqual([
      expect.objectContaining({ collection: 'documents', path: 'file.en.url', kind: 'urlField' }),
    ]);
  });

  /**
   * Cloudinary puts transformations and a version into the delivered URL, so
   * two links to the same file are different strings. Matching the whole URL
   * would miss every transformed one — which is most of them, since the
   * frontend asks for `f_auto` and a width.
   */
  it('matches a URL carrying transformations and a version', async () => {
    const assetId = await insertAsset(STORAGE_KEY);
    await insertHeroSlide({
      primaryCta: {
        isVisible: true,
        label: null,
        url: `https://res.cloudinary.com/demo/image/upload/w_800,f_auto,q_auto/v1712345/${STORAGE_KEY}.webp`,
      },
    });

    expect(await findMediaAssetReferrers(connection(), assetId)).toHaveLength(1);
  });

  // A storageKey is provider-generated, but it reaches a regex and must not be
  // able to alter the query it lands in.
  it('escapes the storageKey before it reaches the query', async () => {
    const tricky = 'folder/a.b+c(d)';
    const assetId = await insertAsset(tricky);
    await insertHeroSlide({
      primaryCta: { isVisible: true, label: null, url: `https://res.cloudinary.com/demo/upload/${tricky}.jpg` },
    });
    // The escape has to be a real escape rather than a deletion, and the
    // decoy proves it: `folder/a.b+c(d)` UNESCAPED matches `folder/aXbcd`,
    // which does not hold the key at all.
    await insertHeroSlide({
      primaryCta: { isVisible: true, label: null, url: 'https://res.cloudinary.com/demo/upload/folder/aXbcd.jpg' },
    });

    expect(await findMediaAssetReferrers(connection(), assetId)).toHaveLength(1);
  });

  // Both of the next two carry a referenced asset as a positive control. An
  // implementation that always answered `[]` would pass them otherwise — and
  // passing exactly these two is the failure that destroys a referenced file.
  it('answers empty for an asset nothing points at, while still finding one that is referenced', async () => {
    const lonely = await insertAsset(STORAGE_KEY);
    const used = await insertAsset('uaeaf/media/used-1a2');
    await insertHeroSlide({ imageAssetId: used });

    expect(await findMediaAssetReferrers(connection(), lonely)).toEqual([]);
    expect(await findMediaAssetReferrers(connection(), used)).toHaveLength(1);
  });

  it('does not report the asset own file as a reference to itself, and still finds a real referrer', async () => {
    // `mediaAssets.file.url` contains the storageKey by definition. Scanning it
    // would make every asset self-referencing and nothing would be purgeable.
    const assetId = await insertAsset(STORAGE_KEY);

    expect(await findMediaAssetReferrers(connection(), assetId)).toEqual([]);

    await connection().collection('articles').insertOne({ _id: new Types.ObjectId(), coverMediaId: assetId });

    expect(await findMediaAssetReferrers(connection(), assetId)).toEqual([
      expect.objectContaining({ collection: 'articles', path: 'coverMediaId' }),
    ]);
  });

  // The album about to stop referencing the asset must not count its own row,
  // or an asset used nowhere else would never be archivable.
  it('drops a referrer the caller names in `ignore`, and keeps every other', async () => {
    const assetId = await insertAsset(STORAGE_KEY);
    const albumId = new Types.ObjectId();
    await connection().collection('albums').insertOne({ _id: albumId, slug: 'leaving', coverImageId: assetId });
    const ignore = [{ collection: 'albums', documentId: albumId.toString() }];

    expect(await findMediaAssetReferrers(connection(), assetId)).toHaveLength(1);
    expect(await findMediaAssetReferrers(connection(), assetId, { ignore })).toEqual([]);

    const otherAlbum = new Types.ObjectId();
    await connection().collection('albums').insertOne({ _id: otherAlbum, slug: 'staying', coverImageId: assetId });

    expect(await findMediaAssetReferrers(connection(), assetId, { ignore })).toEqual([
      expect.objectContaining({ documentId: otherAlbum.toString() }),
    ]);
  });
});

/**
 * Fail-closed. "The scan could not run" must never become "no references
 * found", because the action it guards is irreversible. A `catch` that
 * swallowed an error into `[]` would destroy a referenced file.
 */
describe('findMediaAssetReferrers — when part of the check cannot run', () => {
  it('refuses when a referrer query throws, naming what could not be checked', async () => {
    const assetId = await insertAsset(STORAGE_KEY);
    jest.spyOn(connection().models.heroSlides, 'find').mockImplementation(() => {
      throw new Error('collection unavailable');
    });

    await expect(findMediaAssetReferrers(connection(), assetId)).rejects.toMatchObject({
      code: 'referenceCheckFailed',
      unchecked: ['heroSlides'],
    });
  });

  it('refuses when the revision snapshot scan throws', async () => {
    const assetId = await insertAsset(STORAGE_KEY);
    jest.spyOn(connection().models.revisions, 'find').mockImplementation(() => {
      throw new Error('down');
    });

    await expect(findMediaAssetReferrers(connection(), assetId)).rejects.toBeInstanceOf(
      MediaReferenceCheckFailedError,
    );
  });

  // A collection with no model on the connection is a collection nothing reads,
  // so its documents are never searched and an empty answer would be a lie.
  it('refuses when a collection has no model on the connection, naming it', async () => {
    const assetId = await insertAsset(STORAGE_KEY);
    const models = connection().models as Record<string, unknown>;
    const registered = models.venues;
    delete models.venues;

    try {
      await expect(findMediaAssetReferrers(connection(), assetId)).rejects.toMatchObject({
        code: 'referenceCheckFailed',
        unchecked: ['venues'],
      });
    } finally {
      models.venues = registered;
    }
  });

  it('expects every collection the project declares', () => {
    expect(SCANNED_COLLECTIONS.filter((collection) => !connection().models[collection])).toEqual([]);
  });

  it('refuses when the asset whose key the text scan needs cannot be read', async () => {
    await expect(findMediaAssetReferrers(connection(), new Types.ObjectId())).rejects.toMatchObject({
      code: 'referenceCheckFailed',
    });
  });

  // An empty key would become a regex matching every string, so every asset
  // would look referenced. Refusing is the safe direction, but "matches
  // everything" is not the same answer as "could not be checked".
  it('refuses when the stored storageKey is empty', async () => {
    const _id = new Types.ObjectId();
    await connection()
      .collection('mediaAssets')
      .insertOne({ _id, file: { storageKey: '', url: 'https://res.cloudinary.com/demo/upload/.jpg' } });

    await expect(findMediaAssetReferrers(connection(), _id)).rejects.toMatchObject({
      code: 'referenceCheckFailed',
    });
  });

  // A filter operator arriving where an id is expected would otherwise be
  // forwarded into the query: `{ $ne: null }` matches every document, and
  // `new Types.ObjectId(null)` mints a random id instead of throwing.
  it('refuses an id that is not an id, rather than forwarding it into the filter', async () => {
    await expect(
      findMediaAssetReferrers(connection(), { $ne: null } as unknown as Types.ObjectId),
    ).rejects.toBeInstanceOf(TypeError);
    await expect(findMediaAssetReferrers(connection(), null as unknown as Types.ObjectId)).rejects.toBeInstanceOf(
      TypeError,
    );
  });
});

/**
 * The batch sibling the unused-media report needs: the same field map and the
 * same searches, one query per collection for ALL candidates.
 */
describe('findReferencedMediaAssetIds', () => {
  it('agrees with the single-asset form on the same data', async () => {
    const referenced = await insertAsset('uaeaf/media/a1');
    const pasted = await insertAsset('uaeaf/media/b2');
    const lonely = await insertAsset('uaeaf/media/c3');
    await insertHeroSlide({ imageAssetId: referenced });
    await insertHeroSlide({
      primaryCta: {
        isVisible: true,
        label: null,
        url: 'https://res.cloudinary.com/demo/upload/v1/uaeaf/media/b2.webp',
      },
    });

    const candidates = [referenced, pasted, lonely];
    const batch = await findReferencedMediaAssetIds(connection(), candidates);
    const oneByOne: string[] = [];
    for (const candidate of candidates) {
      if ((await findMediaAssetReferrers(connection(), candidate)).length > 0) oneByOne.push(candidate.toString());
    }

    expect([...batch].sort()).toEqual(oneByOne.sort());
    expect([...batch].sort()).toEqual([referenced.toString(), pasted.toString()].sort());
  });

  /**
   * The invariant is independence from the candidate count, not a ceiling: one
   * query per collection plus the revision scan is well over any small number,
   * so a ceiling would be failed by a correct implementation and passed by one
   * that scans only a few collections.
   */
  it('runs the same number of queries for twenty candidates as for one', async () => {
    const candidates: Types.ObjectId[] = [];
    for (let index = 0; index < 20; index += 1) candidates.push(await insertAsset(`uaeaf/media/k${index}`));

    const countQueries = async (ids: Types.ObjectId[]): Promise<number> => {
      let queries = 0;
      mongoose.set('debug', () => {
        queries += 1;
      });
      await findReferencedMediaAssetIds(connection(), ids);
      mongoose.set('debug', false);
      return queries;
    };

    const forOne = await countQueries(candidates.slice(0, 1));
    const forTwenty = await countQueries(candidates);

    expect(forOne).toBeGreaterThan(0);
    expect(forTwenty).toBe(forOne);
  });

  it('refuses the whole batch when a query throws, rather than reporting the rest as unused', async () => {
    const candidates = [await insertAsset('uaeaf/media/z1')];
    jest.spyOn(connection().models.heroSlides, 'find').mockImplementation(() => {
      throw new Error('collection unavailable');
    });

    await expect(findReferencedMediaAssetIds(connection(), candidates)).rejects.toBeInstanceOf(
      MediaReferenceCheckFailedError,
    );
  });

  it('answers an empty set for no candidates without querying anything', async () => {
    let queries = 0;
    mongoose.set('debug', () => {
      queries += 1;
    });

    expect([...(await findReferencedMediaAssetIds(connection(), []))]).toEqual([]);
    expect(queries).toBe(0);
  });
});
