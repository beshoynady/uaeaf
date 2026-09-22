import { Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ContactMessageSchema } from './schemas/contact-messages.schema.js';
import type { ContactMessageDocument, ContactMessageStatus } from './schemas/contact-messages.schema.js';
import { ContactMessagesRepository } from './contact-messages.repository.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
  registerTestModel,
} from '../../../../test/utils/mongo-memory-server.js';

/**
 * The inbox's two reads: the list the messages screen shows, and the count
 * the header bell shows.
 */
describe('ContactMessagesRepository', () => {
  let server: MongoMemoryServer;
  let model: Model<ContactMessageDocument>;
  let repository: ContactMessagesRepository;

  beforeAll(async () => {
    server = await connectTestDatabase();
    model = registerTestModel<ContactMessageDocument>('ContactMessage', ContactMessageSchema);
    await model.ensureIndexes();
    repository = new ContactMessagesRepository(model);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  const message = (senderName: string, status: ContactMessageStatus, createdAt: string, archived = false) =>
    model.collection.insertOne({
      messageType: 'Inquiry',
      senderName,
      messageBody: 'Body text.',
      status,
      createdAt: new Date(createdAt),
      updatedAt: new Date(createdAt),
      archivedAt: archived ? new Date() : null,
      archivedBy: archived ? new Types.ObjectId() : null,
    });

  it('lists the newest message first and leaves archived ones out', async () => {
    // An inbox read oldest-first puts this morning's complaint under last
    // month's, where nobody scrolls.
    await message('oldest', 'New', '2026-09-01T08:00:00Z');
    await message('newest', 'Resolved', '2026-09-20T08:00:00Z');
    await message('middle', 'InProgress', '2026-09-10T08:00:00Z');
    await message('archived', 'New', '2026-09-21T08:00:00Z', true);

    const listed = await repository.findNewestFirst();

    expect(listed.map((row) => row.senderName)).toEqual(['newest', 'middle', 'oldest']);
  });

  it('counts the messages in one status, archived ones excluded', async () => {
    await message('a', 'New', '2026-09-01T08:00:00Z');
    await message('b', 'New', '2026-09-02T08:00:00Z');
    await message('c', 'InProgress', '2026-09-03T08:00:00Z');
    await message('d', 'New', '2026-09-04T08:00:00Z', true);

    await expect(repository.countByStatus('New')).resolves.toBe(2);
  });
});
