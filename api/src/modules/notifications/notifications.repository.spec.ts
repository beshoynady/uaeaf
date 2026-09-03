import { Model, Types } from 'mongoose';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NotificationSchema } from './schemas/notification.schema.js';
import type { NotificationDocument } from './schemas/notification.schema.js';
import { NotificationsRepository } from './notifications.repository.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../../test/utils/mongo-memory-server.js';

describe('NotificationsRepository', () => {
  let server: MongoMemoryServer;
  let model: Model<NotificationDocument>;
  let repository: NotificationsRepository;

  beforeAll(async () => {
    server = await connectTestDatabase();
    model = mongoose.model<NotificationDocument>('Notification', NotificationSchema);
    await model.ensureIndexes();
    repository = new NotificationsRepository(model);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  it('findByRecipient() returns only that recipient\'s notifications, newest first', async () => {
    const recipientId = new Types.ObjectId();
    const otherRecipientId = new Types.ObjectId();
    const triggerId = new Types.ObjectId();

    await repository.create({
      type: 'General',
      recipientId,
      triggerType: 'ContactMessage',
      triggerId,
      channel: 'In-App',
      timestamp: new Date('2026-01-01'),
    });
    const newer = await repository.create({
      type: 'General',
      recipientId,
      triggerType: 'ContactMessage',
      triggerId,
      channel: 'In-App',
      timestamp: new Date('2026-02-01'),
    });
    await repository.create({
      type: 'General',
      recipientId: otherRecipientId,
      triggerType: 'ContactMessage',
      triggerId,
      channel: 'In-App',
      timestamp: new Date('2026-03-01'),
    });

    const results = await repository.findByRecipient(recipientId);

    expect(results).toHaveLength(2);
    expect(results[0]?._id.toString()).toBe(newer._id.toString());
  });

  /**
   * The Notification Centre's own named query pattern — "unread
   * notifications for this user, newest first" — was previously unindexed
   * (schema-audit-2026-09-04.md §3.2/§7, P1 finding). Asserted directly
   * against the built index rather than only the schema source.
   */
  it('has the recipientId+readState+timestamp index', async () => {
    const indexes = await model.collection.indexes();
    const indexKeys = indexes.map((index) => index.key);

    expect(indexKeys).toContainEqual({ recipientId: 1, readState: 1, timestamp: -1 });
  });
});
