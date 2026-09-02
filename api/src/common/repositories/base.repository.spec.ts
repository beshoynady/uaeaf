import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BaseSchema } from '../schemas/base.schema.js';
import { BaseRepository } from './base.repository.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../../test/utils/mongo-memory-server.js';

@Schema()
class TestDoc extends BaseSchema {
  @Prop({ required: true })
  name: string;
}
const TestDocSchema = SchemaFactory.createForClass(TestDoc);

class TestDocRepository extends BaseRepository<TestDoc> {}

describe('BaseRepository', () => {
  let server: MongoMemoryServer;
  let model: Model<TestDoc>;
  let repository: TestDocRepository;

  beforeAll(async () => {
    server = await connectTestDatabase();
    model = mongoose.model<TestDoc>('TestDoc', TestDocSchema);
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
});
