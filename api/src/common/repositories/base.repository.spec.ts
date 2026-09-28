import { jest } from '@jest/globals';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Model, type HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BaseSchema } from '../schemas/base.schema.js';
import { BaseRepository } from './base.repository.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
  registerTestModel,
} from '../../../test/utils/mongo-memory-server.js';

@Schema()
class TestDoc extends BaseSchema {
  @Prop({ required: true })
  name: string;
}
const TestDocSchema = SchemaFactory.createForClass(TestDoc);

class TestDocRepository extends BaseRepository<HydratedDocument<TestDoc>> {}

describe('BaseRepository', () => {
  let server: MongoMemoryServer;
  let model: Model<HydratedDocument<TestDoc>>;
  let repository: TestDocRepository;

  beforeAll(async () => {
    server = await connectTestDatabase();
    model = registerTestModel<HydratedDocument<TestDoc>>('TestDoc', TestDocSchema);
    repository = new TestDocRepository(model);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  it('creates a document', async () => {
    const created = await repository.create({ name: 'Alpha' });

    expect(created.name).toBe('Alpha');
  });

  it('finds a non-archived document by id', async () => {
    const created = await repository.create({ name: 'Bravo' });

    const found = await repository.findById(created._id.toString());

    expect(found?.name).toBe('Bravo');
  });

  it('does not find an archived document by id', async () => {
    const created = await repository.create({ name: 'Charlie' });
    const archivedBy = new mongoose.Types.ObjectId();
    await repository.softDelete(created._id.toString(), archivedBy);

    const found = await repository.findById(created._id.toString());

    expect(found).toBeNull();
  });

  it('excludes archived documents from find()', async () => {
    const kept = await repository.create({ name: 'Delta' });
    const archived = await repository.create({ name: 'Echo' });
    await repository.softDelete(archived._id.toString(), new mongoose.Types.ObjectId());

    const results = await repository.find();

    expect(results.map((doc) => doc.name)).toEqual([kept.name]);
  });

  it('softDelete sets archivedAt and archivedBy', async () => {
    const created = await repository.create({ name: 'Foxtrot' });
    const archivedBy = new mongoose.Types.ObjectId();

    const archived = await repository.softDelete(created._id.toString(), archivedBy);

    expect(archived?.archivedAt).toBeInstanceOf(Date);
    expect(archived?.archivedBy?.toString()).toBe(archivedBy.toString());
  });

  it('softDelete leaves the original archive date and actor alone on a second archive', async () => {
    const created = await repository.create({ name: 'Golf' });
    const first = new mongoose.Types.ObjectId();
    const archived = await repository.softDelete(created._id.toString(), first);

    const again = await repository.softDelete(created._id.toString(), new mongoose.Types.ObjectId());

    expect(again?.archivedAt?.getTime()).toBe(archived?.archivedAt?.getTime());
    expect(again?.archivedBy?.toString()).toBe(first.toString());
  });

  it('softDelete still answers the row it left untouched', async () => {
    const created = await repository.create({ name: 'Hotel' });
    await repository.softDelete(created._id.toString(), new mongoose.Types.ObjectId());

    const again = await repository.softDelete(created._id.toString(), new mongoose.Types.ObjectId());

    expect(again?._id.toString()).toBe(created._id.toString());
  });

  it('restore clears archivedAt and archivedBy together', async () => {
    const created = await repository.create({ name: 'India' });
    await repository.softDelete(created._id.toString(), new mongoose.Types.ObjectId());

    const restored = await repository.restore(created._id.toString());

    expect(restored?.archivedAt).toBeNull();
    expect(restored?.archivedBy).toBeNull();
    expect(await repository.findById(created._id.toString())).not.toBeNull();
  });

  it('restore answers null for an id that does not exist', async () => {
    expect(await repository.restore(new mongoose.Types.ObjectId().toString())).toBeNull();
  });

  /** The two transition primitives: what a caller reads to act exactly once on
   *  an archive — the denormalized photo count of an album, today. */
  it('archiveIfLive answers null for a row that is already archived', async () => {
    const created = await repository.create({ name: 'Juliett' });
    await repository.softDelete(created._id.toString(), new mongoose.Types.ObjectId());

    expect(
      await repository.archiveIfLive(created._id.toString(), new mongoose.Types.ObjectId()),
    ).toBeNull();
  });

  it('restoreIfArchived answers null for a row that is already live', async () => {
    const created = await repository.create({ name: 'Kilo' });

    expect(await repository.restoreIfArchived(created._id.toString())).toBeNull();
  });

  describe('findByIds', () => {
    // Added 2026-09-07 alongside the roleIds-only JWT decision: permission
    // resolution moved from login time to every request, so the old
    // one-findById-per-id pattern (165 round trips for the Super Admin)
    // had to become a single batched read.
    it('returns every matching document in one query', async () => {
      const first = await repository.create({ name: 'Golf' });
      const second = await repository.create({ name: 'Hotel' });

      const found = await repository.findByIds([first._id.toString(), second._id.toString()]);

      expect(found.map((doc) => doc.name).sort()).toEqual(['Golf', 'Hotel']);
    });

    it('excludes archived documents', async () => {
      const kept = await repository.create({ name: 'India' });
      const archived = await repository.create({ name: 'Juliett' });
      await repository.softDelete(archived._id.toString(), new mongoose.Types.ObjectId());

      const found = await repository.findByIds([kept._id.toString(), archived._id.toString()]);

      expect(found.map((doc) => doc.name)).toEqual(['India']);
    });

    it('silently omits ids that do not exist rather than throwing', async () => {
      const kept = await repository.create({ name: 'Kilo' });

      const found = await repository.findByIds([
        kept._id.toString(),
        new mongoose.Types.ObjectId().toString(),
      ]);

      expect(found).toHaveLength(1);
    });

    it('issues no query at all for an empty id list', async () => {
      const spy = jest.spyOn(model, 'find');

      const found = await repository.findByIds([]);

      expect(found).toEqual([]);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  // A partial update built from a validated DTO carries every field the class
  // declares, `undefined` when the request did not send it. Whether that clears
  // stored data is decided here, by Mongoose, and every explicit-field update in
  // the API relies on the answer (2026-09-17 audit of the partial-update defect).
  describe('updateById with fields a request did not send', () => {
    it('leaves a stored field alone when its value in the update is undefined', async () => {
      const created = await repository.create({ name: 'Kept' });

      const updated = await repository.updateById(created._id.toString(), { name: undefined });

      expect(updated?.name).toBe('Kept');
      expect((await model.findById(created._id).lean())?.name).toBe('Kept');
    });

    it('clears a stored field only when the update sends null', async () => {
      const created = await repository.create({ name: 'Cleared' });

      await repository.updateById(created._id.toString(), { name: null } as unknown as { name: string });

      expect((await model.findById(created._id).lean())?.name).toBeNull();
    });
  });
});
