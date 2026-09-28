import { Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NotificationSchema } from './schemas/notification.schema.js';
import type { NotificationDocument } from './schemas/notification.schema.js';
import { NotificationsRepository } from './notifications.repository.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
  registerTestModel,
} from '../../../../test/utils/mongo-memory-server.js';

describe('NotificationsRepository', () => {
  let server: MongoMemoryServer;
  let model: Model<NotificationDocument>;
  let repository: NotificationsRepository;

  beforeAll(async () => {
    server = await connectTestDatabase();
    model = registerTestModel<NotificationDocument>('Notification', NotificationSchema);
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

  /**
   * The own-scope rule (owner decision 2026-09-27, Q-C): marking a
   * notification read needs no `notifications:Update` permission, because it
   * is an act on the caller's own record, verified by the notification
   * belonging to them — scoped in this repository query, not in the service
   * (`NotificationsController`'s `PATCH :id/read` carries no
   * `@RequirePermission` at all). Task 6 batch: the scoping itself already
   * existed; these two tests (positive and the negative one this rule
   * depends on) did not.
   */
  describe('markReadForRecipient() — the own scope', () => {
    it("marks the caller's own notification read", async () => {
      const recipientId = new Types.ObjectId();
      const triggerId = new Types.ObjectId();
      const created = await repository.create({
        type: 'General',
        recipientId,
        triggerType: 'ContactMessage',
        triggerId,
        channel: 'In-App',
        timestamp: new Date(),
      });

      const updated = await repository.markReadForRecipient(created._id.toString(), recipientId);

      expect(updated?.readState).toBe(true);
    });

    // Run against the real query, not a mock: a mock only proves the test
    // calls the right method, never that the filter actually excludes
    // another recipient's row.
    it("cannot mark another recipient's notification read", async () => {
      const recipientId = new Types.ObjectId();
      const otherRecipientId = new Types.ObjectId();
      const triggerId = new Types.ObjectId();
      const created = await repository.create({
        type: 'General',
        recipientId,
        triggerType: 'ContactMessage',
        triggerId,
        channel: 'In-App',
        timestamp: new Date(),
      });

      const result = await repository.markReadForRecipient(created._id.toString(), otherRecipientId);

      expect(result).toBeNull();
      const stillUnread = await repository.findById(created._id.toString());
      expect(stillUnread?.readState).toBe(false);
    });
  });
});
