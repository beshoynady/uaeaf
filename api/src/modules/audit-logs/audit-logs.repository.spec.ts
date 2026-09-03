import { Model, Types } from 'mongoose';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuditLogSchema } from './schemas/audit-log.schema.js';
import type { AuditLogDocument } from './schemas/audit-log.schema.js';
import { AuditLogsRepository } from './audit-logs.repository.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../../test/utils/mongo-memory-server.js';

describe('AuditLogsRepository', () => {
  let server: MongoMemoryServer;
  let model: Model<AuditLogDocument>;
  let repository: AuditLogsRepository;

  beforeAll(async () => {
    server = await connectTestDatabase();
    model = mongoose.model<AuditLogDocument>('AuditLog', AuditLogSchema);
    await model.ensureIndexes();
    repository = new AuditLogsRepository(model);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  it('create() writes a new row and returns it', async () => {
    const actorId = new Types.ObjectId();
    const entityId = new Types.ObjectId();

    const created = await repository.create({
      actorId,
      action: 'Update',
      entityType: 'athleteProfiles',
      entityId,
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(created._id).toBeDefined();
    const stored = await model.findById(created._id).exec();
    expect(stored?.actorId.toString()).toBe(actorId.toString());
    expect(stored?.entityType).toBe('athleteProfiles');
  });

  /**
   * Structural tamper-resistance check (schema-audit-2026-09-04.md §3.2,
   * P0 finding): unlike the earlier `BaseRepository`-extending version,
   * this repository must not expose any mutation method beyond `create()`
   * — no `updateById`, no `softDelete`, no `hardDelete`, ever. Asserted
   * directly against the class's own public surface, not just by absence
   * of a caller, so a future addition of one of these methods fails this
   * test rather than silently reintroducing the gap the audit found.
   */
  it('exposes no update, soft-delete, or hard-delete method — create() and reads only', () => {
    const surface = repository as unknown as Record<string, unknown>;
    expect(surface.updateById).toBeUndefined();
    expect(surface.softDelete).toBeUndefined();
    expect(surface.hardDelete).toBeUndefined();
    expect(surface.deleteOne).toBeUndefined();
    expect(surface.findByIdAndUpdate).toBeUndefined();
    expect(typeof surface.create).toBe('function');
  });

  /**
   * Both named query patterns this collection exists to serve — per-record
   * history and per-actor activity — were previously unindexed
   * (schema-audit-2026-09-04.md §3.2/§7, P1 finding). Asserted directly
   * against the built indexes rather than only the schema source, so an
   * accidental future removal of either `.index()` call fails this test.
   */
  it('has the entityType+entityId+timestamp and actorId+timestamp indexes', async () => {
    const indexes = await model.collection.indexes();
    const indexKeys = indexes.map((index) => index.key);

    expect(indexKeys).toContainEqual({ entityType: 1, entityId: 1, timestamp: -1 });
    expect(indexKeys).toContainEqual({ actorId: 1, timestamp: -1 });
  });
});
