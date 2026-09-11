import mongoose, { Schema, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../test/utils/mongo-memory-server.js';
import {
  ContactUsPage,
  ContactUsPageSchema,
} from '../modules/federation-governance/contact-us-page/schemas/contact-us-page.schema.js';
import { MediaAsset, MediaAssetSchema } from '../modules/media-center/media-assets/schemas/media-asset.schema.js';
import { applyCreatedAtBackfill, planCreatedAtBackfill } from './backfill-created-at.js';

/**
 * Restores `createdAt` on documents written while the schemas had no
 * `timestamps`, from the one record of their creation that survived: the
 * seconds encoded in the first four bytes of a MongoDB ObjectId.
 *
 * `updatedAt` is not restored. Nothing recorded when those documents last
 * changed, and a date made up to fill the gap would look exactly like a
 * real one.
 */
describe('createdAt backfill', () => {
  let server: MongoMemoryServer;

  const since = new Date('2026-09-02T21:00:00Z');
  const now = new Date('2026-09-11T12:00:00Z');
  const at = (iso: string) => Types.ObjectId.createFromTime(Math.floor(Date.parse(iso) / 1000));
  const raw = (collection: string) => mongoose.connection.db!.collection(collection);

  const affected = at('2026-09-09T21:35:48Z');
  const earliest = at('2026-09-04T08:00:00Z');
  const alreadyDated = at('2026-09-08T10:00:00Z');
  const beforeTheDefect = at('2026-08-20T10:00:00Z');
  const fromTheFuture = at('2030-01-01T00:00:00Z');
  const explicitNull = at('2026-09-10T10:00:00Z');
  const pageId = at('2026-09-08T17:53:45Z');

  beforeAll(async () => {
    server = await connectTestDatabase();
    mongoose.model(ContactUsPage.name, ContactUsPageSchema);
    mongoose.model(MediaAsset.name, MediaAssetSchema);
    mongoose.model('Unstamped', new Schema({ name: String }, { collection: 'unstamped' }));
  });

  beforeEach(async () => {
    await raw('mediaAssets').insertMany([
      { _id: affected, displayOrder: 1 },
      { _id: earliest, displayOrder: 2 },
      { _id: alreadyDated, displayOrder: 3, createdAt: new Date('2026-09-08T10:00:05Z') },
      { _id: beforeTheDefect, displayOrder: 4 },
      { _id: fromTheFuture, displayOrder: 5 },
      { _id: explicitNull, displayOrder: 6, createdAt: null },
    ] as never[]);
    await raw('mediaAssets').insertOne({ _id: 'not-an-object-id', displayOrder: 7 } as never);
    await raw('contactUsPage').insertOne({ _id: pageId, email: 'info@uaeaf.ae' });
    await raw('unstamped').insertOne({ _id: at('2026-09-09T00:00:00Z'), name: 'no timestamps here' });
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  it('plans, per collection, what it would fill and the range of dates it would infer — and writes nothing', async () => {
    const before = await raw('mediaAssets').find().toArray();

    const plan = await planCreatedAtBackfill(mongoose.connection, { since, now });

    const media = plan.find((row) => row.collection === 'mediaAssets')!;
    expect(media.fillable.map(String).sort()).toEqual([String(affected), String(earliest)].sort());
    expect(media.oldest).toEqual(earliest.getTimestamp());
    expect(media.newest).toEqual(affected.getTimestamp());
    expect(media.skipped).toEqual({ notAnObjectId: 1, beforeSince: 1, inTheFuture: 1, explicitNull: 1 });
    expect(plan.find((row) => row.collection === 'contactUsPage')!.fillable.map(String)).toEqual([String(pageId)]);
    expect(await raw('mediaAssets').find().toArray()).toEqual(before);
  });

  it('only looks at collections whose schema keeps createdAt', async () => {
    const plan = await planCreatedAtBackfill(mongoose.connection, { since, now });

    expect(plan.map((row) => row.collection)).not.toContain('unstamped');
  });

  it('writes createdAt from the ObjectId, and nothing else', async () => {
    const plan = await planCreatedAtBackfill(mongoose.connection, { since, now });

    const written = await applyCreatedAtBackfill(mongoose.connection, plan);

    const doc = await raw('mediaAssets').findOne({ _id: affected });
    expect(doc!.createdAt).toEqual(affected.getTimestamp());
    expect(doc).not.toHaveProperty('updatedAt');
    expect(written.find((row) => row.collection === 'mediaAssets')!.written).toBe(2);
  });

  it('leaves every document it skipped exactly as it was', async () => {
    const plan = await planCreatedAtBackfill(mongoose.connection, { since, now });
    const untouched = [alreadyDated, beforeTheDefect, fromTheFuture, explicitNull];
    const before = await raw('mediaAssets').find({ _id: { $in: untouched } }).toArray();
    const stringId = await raw('mediaAssets').findOne({ _id: 'not-an-object-id' as never });

    await applyCreatedAtBackfill(mongoose.connection, plan);

    expect(await raw('mediaAssets').find({ _id: { $in: untouched } }).toArray()).toEqual(before);
    expect(await raw('mediaAssets').findOne({ _id: 'not-an-object-id' as never })).toEqual(stringId);
  });

  it('never overwrites a createdAt that appeared between the plan and the write', async () => {
    const plan = await planCreatedAtBackfill(mongoose.connection, { since, now });
    const meanwhile = new Date('2026-09-11T11:00:00Z');
    await raw('mediaAssets').updateOne({ _id: affected }, { $set: { createdAt: meanwhile } });

    const written = await applyCreatedAtBackfill(mongoose.connection, plan);

    expect((await raw('mediaAssets').findOne({ _id: affected }))!.createdAt).toEqual(meanwhile);
    expect(written.find((row) => row.collection === 'mediaAssets')!.written).toBe(1);
  });

  it('has nothing left to do the second time', async () => {
    await applyCreatedAtBackfill(mongoose.connection, await planCreatedAtBackfill(mongoose.connection, { since, now }));

    const again = await planCreatedAtBackfill(mongoose.connection, { since, now });

    expect(again.every((row) => row.fillable.length === 0)).toBe(true);
  });
});
