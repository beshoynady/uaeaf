import { jest } from '@jest/globals';
import mongoose, { Types } from 'mongoose';
import type { Connection, Model } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { RoleSchema } from './schemas/role.schema.js';
import type { RoleDocument } from './schemas/role.schema.js';
import { UserSchema } from '../users/schemas/user.schema.js';
import type { UserDocument } from '../users/schemas/user.schema.js';
import { AuditLogSchema } from '../../workflow/audit-logs/schemas/audit-log.schema.js';
import type { AuditLogDocument } from '../../workflow/audit-logs/schemas/audit-log.schema.js';
import { AuditLogsRepository } from '../../workflow/audit-logs/audit-logs.repository.js';
import { AuditLogsService } from '../../workflow/audit-logs/audit-logs.service.js';
import { RolesRepository } from './roles.repository.js';
import { RoleAssignmentsRepository } from './role-assignments.repository.js';
import { ROLE_ARCHIVE_DETACH_REASON, RolesService } from './roles.service.js';
import type { PermissionsService } from '../permissions/permissions.service.js';
import { registerTestModel } from '../../../../test/utils/mongo-memory-server.js';

// Transactions need a replica set; the shared helper starts a standalone server.
const LAUNCH_TIMEOUT_MS = 25_000;

/**
 * `DELETE /roles/:id` has to leave the log able to answer "which accounts lost
 * this role", and has to leave nothing half-applied when any part of it fails.
 *
 * Runs against a real replica set because both statements are properties of the
 * server: a mocked session commits whatever it is handed.
 */
describe('RolesService.remove — one transaction, one row per detached account', () => {
  let replSet: MongoMemoryReplSet;
  let connection: Connection;
  let roleModel: Model<RoleDocument>;
  let userModel: Model<UserDocument>;
  let auditModel: Model<AuditLogDocument>;
  let auditLogs: AuditLogsService;
  let service: RolesService;

  const ACTOR = new Types.ObjectId();
  const CONTEXT = { ipAddress: '10.0.0.7', userAgent: 'jest-agent' };

  /** Inserted through the driver, as `role-assignments.repository.spec.ts` does:
   *  these rows only need to hold role references, not to pass every rule the
   *  account schema applies to a real registration. */
  const account = (email: string, roleIds: unknown[]) => ({
    _id: new Types.ObjectId(),
    email,
    passwordHash: 'x',
    name: { en: email, ar: email },
    roleIds,
    accountStatus: 'Active',
    archivedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  const liveRole = async (): Promise<RoleDocument> => {
    const [role] = await roleModel.create([
      { name: { en: 'Content Editor', ar: 'Content Editor' }, permissionIds: [], isSystemRole: false },
    ]);
    return role;
  };

  const storedRoleIds = async (id: Types.ObjectId): Promise<string[]> => {
    const stored = await userModel.collection.findOne<{ roleIds?: unknown[] }>({ _id: id });
    return (stored?.roleIds ?? []).map(String);
  };

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
      instanceOpts: [{ launchTimeout: LAUNCH_TIMEOUT_MS }],
    });
    connection = await mongoose.createConnection(replSet.getUri()).asPromise();
    roleModel = registerTestModel<RoleDocument>('Role', RoleSchema, connection);
    userModel = registerTestModel<UserDocument>('User', UserSchema, connection);
    auditModel = registerTestModel<AuditLogDocument>('AuditLog', AuditLogSchema, connection);
    // init() waits for the collection and its index builds; a catalog change still
    // in flight when a transaction first writes makes that write fail intermittently.
    await Promise.all([roleModel.init(), userModel.init(), auditModel.init()]);
    auditLogs = new AuditLogsService(new AuditLogsRepository(auditModel));
    service = new RolesService(
      new RolesRepository(roleModel),
      { findById: jest.fn(), findByIds: jest.fn() } as unknown as PermissionsService,
      new RoleAssignmentsRepository(userModel),
      auditLogs,
    );
  }, 60_000);

  afterEach(async () => {
    await Promise.all([roleModel.deleteMany({}), userModel.deleteMany({}), auditModel.deleteMany({})]);
  });

  afterAll(async () => {
    await connection?.close();
    await replSet?.stop();
  });

  it('writes one row per account it detached, naming the account and the role it lost', async () => {
    const role = await liveRole();
    const roleId = role._id.toString();
    const holderA = account('a@uaeaf.ae', [role._id]);
    const holderB = account('b@uaeaf.ae', [role._id, new Types.ObjectId()]);
    const bystander = account('c@uaeaf.ae', [new Types.ObjectId()]);
    await userModel.collection.insertMany([holderA, holderB, bystander] as never[]);

    const archived = await service.remove(roleId, ACTOR, [], CONTEXT);

    expect(archived.archivedAt).toBeInstanceOf(Date);
    expect(await storedRoleIds(bystander._id)).toHaveLength(1);

    const rows = await auditModel.find({}).lean();
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.entityId?.toString()).sort()).toEqual(
      [holderA._id.toString(), holderB._id.toString()].sort(),
    );
    for (const row of rows) {
      expect(row.actorId.toString()).toBe(ACTOR.toString());
      expect(row).toMatchObject({
        action: 'Update',
        entityType: 'users',
        previousValue: { roleId },
        newValue: null,
        reason: ROLE_ARCHIVE_DETACH_REASON,
        ipAddress: CONTEXT.ipAddress,
        userAgent: CONTEXT.userAgent,
      });
    }
  });

  it('archives a role nobody holds without writing an account row', async () => {
    const role = await liveRole();

    await service.remove(role._id.toString(), ACTOR, [], CONTEXT);

    expect(await auditModel.countDocuments({})).toBe(0);
    expect((await roleModel.findById(role._id).lean())?.archivedAt).toBeInstanceOf(Date);
  });

  it('rolls the archive, the detach and the rows back together when a later row fails', async () => {
    const role = await liveRole();
    const roleId = role._id.toString();
    const holders = [account('a@uaeaf.ae', [role._id]), account('b@uaeaf.ae', [role._id])];
    await userModel.collection.insertMany(holders as never[]);

    // The failure is forced AFTER a sound row has reached the server. A row
    // refused by client-side validation is never sent, so such a test passes
    // whether or not the session is threaded through, and proves nothing.
    const original = auditLogs.write.bind(auditLogs);
    const write = jest.spyOn(auditLogs, 'write').mockImplementation(async (entry, session) => {
      const created = await original(entry, session);
      if (write.mock.calls.length === 2) {
        throw new Error('forced failure after a sound audit write');
      }
      return created;
    });

    try {
      await expect(service.remove(roleId, ACTOR, [], CONTEXT)).rejects.toThrow('forced failure');
    } finally {
      write.mockRestore();
    }

    expect(await auditModel.countDocuments({})).toBe(0);
    expect((await roleModel.findById(role._id).lean())?.archivedAt).toBeNull();
    for (const holder of holders) {
      expect(await storedRoleIds(holder._id)).toEqual([roleId]);
    }
  });
});
