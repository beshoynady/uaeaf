import { Model } from 'mongoose';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { PublicationSchema } from './schemas/publication.schema.js';
import type { PublicationDocument } from './schemas/publication.schema.js';
import { PublicationsRepository } from './publications.repository.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../../../test/utils/mongo-memory-server.js';

describe('PublicationsRepository', () => {
  let server: MongoMemoryServer;
  let model: Model<PublicationDocument>;
  let repository: PublicationsRepository;

  beforeAll(async () => {
    server = await connectTestDatabase();
    model = mongoose.model<PublicationDocument>('Publication', PublicationSchema);
    repository = new PublicationsRepository(model);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  it('createLive() leaves exactly one Live row per entity, retiring the previous one to Archived', async () => {
    const entityType = 'articles' as const;
    const entityId = new Types.ObjectId();
    const publishedBy = new Types.ObjectId();

    const first = await repository.createLive({
      entityType,
      entityId,
      revisionId: new Types.ObjectId(),
      workflowInstanceId: null,
      publishedBy,
      publishedAt: new Date(),
    });

    const second = await repository.createLive({
      entityType,
      entityId,
      revisionId: new Types.ObjectId(),
      workflowInstanceId: null,
      publishedBy,
      publishedAt: new Date(),
    });

    const all = await model.find({ entityType, entityId }).exec();
    expect(all).toHaveLength(2);

    const liveRows = all.filter((row) => row.status === 'Live');
    expect(liveRows).toHaveLength(1);
    expect(liveRows[0]._id.toString()).toBe(second._id.toString());

    const retired = all.find((row) => row._id.toString() === first._id.toString());
    expect(retired?.status).toBe('Archived');

    const live = await repository.findLive(entityType, entityId);
    expect(live?._id.toString()).toBe(second._id.toString());
  });
});
