import mongoose, { Schema, Types } from 'mongoose';
import type { Connection, Model } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { AuditLogSchema } from './schemas/audit-log.schema.js';
import type { AuditLogDocument } from './schemas/audit-log.schema.js';
import { AuditLogsRepository } from './audit-logs.repository.js';
import { AuditLogsService } from './audit-logs.service.js';
import type { WriteAuditLogInput } from './dto/write-audit-log.dto.js';
import { registerTestModel } from '../../../../test/utils/mongo-memory-server.js';

type ProbeDocument = mongoose.HydratedDocument<{ label: string }>;

// Transactions need a replica set; the shared helper starts a standalone server.
const LAUNCH_TIMEOUT_MS = 25_000;

const validEntry = (): WriteAuditLogInput => ({
  actorId: new Types.ObjectId(),
  action: 'Update',
  entityType: 'probes',
  entityId: new Types.ObjectId(),
  ipAddress: '127.0.0.1',
  userAgent: 'jest',
});

describe('AuditLogsService.write inside a transaction', () => {
  let replSet: MongoMemoryReplSet;
  let connection: Connection;
  let auditModel: Model<AuditLogDocument>;
  let probeModel: Model<ProbeDocument>;
  let service: AuditLogsService;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
      instanceOpts: [{ launchTimeout: LAUNCH_TIMEOUT_MS }],
    });
    connection = await mongoose.createConnection(replSet.getUri()).asPromise();
    auditModel = registerTestModel<AuditLogDocument>('AuditLog', AuditLogSchema, connection);
    probeModel = registerTestModel<ProbeDocument>('Probe', new Schema({ label: String }), connection);
    // init() waits for the collection and its index builds; a catalog change still
    // in flight when a transaction first writes makes that write fail intermittently.
    await Promise.all([auditModel.init(), probeModel.init()]);
    service = new AuditLogsService(new AuditLogsRepository(auditModel));
  }, 60_000);

  afterEach(async () => {
    await auditModel.deleteMany({});
    await probeModel.deleteMany({});
  });

  afterAll(async () => {
    await connection?.close();
    await replSet?.stop();
  });

  it('rolls back the other write when the audit write throws', async () => {
    const session = await connection.startSession();
    try {
      await expect(
        session.withTransaction(async () => {
          await probeModel.create([{ label: 'first' }], { session });
          const { actorId: _omitted, ...withoutActor } = validEntry();
          await service.write(withoutActor as WriteAuditLogInput, session);
        }),
      ).rejects.toThrow(/actorId/);
    } finally {
      await session.endSession();
    }

    expect(await probeModel.countDocuments({ label: 'first' })).toBe(0);
    expect(await auditModel.countDocuments({})).toBe(0);
  });

  it('writes the audit row inside the session, so an abort discards it too', async () => {
    const session = await connection.startSession();
    try {
      session.startTransaction();
      await probeModel.create([{ label: 'first' }], { session });
      await service.write(validEntry(), session);
      await session.abortTransaction();
    } finally {
      await session.endSession();
    }

    expect(await probeModel.countDocuments({})).toBe(0);
    expect(await auditModel.countDocuments({})).toBe(0);
  });

  it('returns a single document, not the array model.create([...]) yields', async () => {
    const session = await connection.startSession();
    try {
      const created = await session.withTransaction(() => service.write(validEntry(), session));
      expect(Array.isArray(created)).toBe(false);
      expect(created._id).toBeInstanceOf(Types.ObjectId);
    } finally {
      await session.endSession();
    }

    expect(await auditModel.countDocuments({})).toBe(1);
  });

  it('still writes without a session, as every existing caller does', async () => {
    const created = await service.write(validEntry());

    expect(await auditModel.findById(created._id).exec()).not.toBeNull();
  });
});
