import mongoose, { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { jest } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
  registerTestModel,
} from '../../test/utils/mongo-memory-server.js';
import { Role, RoleSchema } from '../modules/platform-administration/roles/schemas/role.schema.js';
import { User, UserSchema } from '../modules/platform-administration/users/schemas/user.schema.js';
import {
  WorkflowStep,
  WorkflowStepSchema,
} from '../modules/workflow/workflow-steps/schemas/workflow-step.schema.js';
import {
  WorkflowInstance,
  WorkflowInstanceSchema,
  type WorkflowInstanceStatus,
} from '../modules/workflow/workflow-instances/schemas/workflow-instance.schema.js';
import { AuditLog, AuditLogSchema } from '../modules/workflow/audit-logs/schemas/audit-log.schema.js';
import { AuditLogsRepository } from '../modules/workflow/audit-logs/audit-logs.repository.js';
import { AuditLogsService } from '../modules/workflow/audit-logs/audit-logs.service.js';
import { resetRoles, type ResetRolesModels } from './reset-roles.js';

/** Runs against a real MongoDB: idempotency is only a property of what the
 *  second run reads back from the first, never of a mocked answer. */
describe('resetRoles', () => {
  let server: MongoMemoryServer;
  let models: ResetRolesModels;
  let roleModel: Model<Role>;
  let userModel: Model<User>;
  let stepModel: Model<WorkflowStep>;
  let instanceModel: Model<WorkflowInstance>;
  let auditModel: Model<AuditLog>;

  const id = () => new Types.ObjectId();
  const SUPER_ROLE = id();
  const ROLE_A = id();
  const ROLE_B = id();
  const ROLE_OLD = id();
  const SUPER_ADMIN = id();
  const ALICE = id();
  const BOB = id();
  const CAROL = id();
  const ERIN = id();
  const FRANK = id();
  const DEFINITION = id();
  const STEP_PARTIAL = id();
  const STEP_DEAD = id();
  const STEP_HEALTHY = id();
  const STEP_CLOSED = id();
  const STEP_DEDUP = id();

  const user = (_id: Types.ObjectId, email: string, roleIds: Types.ObjectId[], extra: object = {}) => ({
    _id,
    email,
    name: { en: email, ar: email },
    roleIds,
    accountStatus: 'Active' as const,
    ...extra,
  });

  const step = (_id: Types.ObjectId, sequenceOrder: number, assigneeIds: Types.ObjectId[], requiredApprovals: number) => ({
    _id,
    workflowDefinitionId: DEFINITION,
    sequenceOrder,
    stepType: 'Parallel' as const,
    assigneeIds,
    requiredApprovals,
  });

  const instance = (currentStepId: Types.ObjectId | null, status: WorkflowInstanceStatus, extra: object = {}) => ({
    workflowDefinitionId: DEFINITION,
    entityType: 'articles' as const,
    entityId: id(),
    currentStepId,
    status,
    ...extra,
  });

  beforeAll(async () => {
    server = await connectTestDatabase();
    roleModel = registerTestModel<Role>('Role', RoleSchema);
    userModel = registerTestModel<User>('User', UserSchema);
    stepModel = registerTestModel<WorkflowStep>('WorkflowStep', WorkflowStepSchema);
    instanceModel = registerTestModel<WorkflowInstance>('WorkflowInstance', WorkflowInstanceSchema);
    auditModel = registerTestModel<AuditLog>('AuditLog', AuditLogSchema);
  });

  beforeEach(async () => {
    const auditLogs = new AuditLogsService(new AuditLogsRepository(auditModel as never));
    models = { roles: roleModel, users: userModel, workflowSteps: stepModel, workflowInstances: instanceModel, auditLogs };

    await roleModel.create([
      { _id: SUPER_ROLE, name: { en: 'Super Admin', ar: 'مسؤول عام' }, isSystemRole: true },
      { _id: ROLE_A, name: { en: 'Editor', ar: 'محرر' } },
      { _id: ROLE_B, name: { en: 'Reviewer', ar: 'مراجع' } },
      { _id: ROLE_OLD, name: { en: 'Old', ar: 'قديم' }, archivedAt: new Date('2026-01-01') },
    ]);
    await userModel.create([
      user(SUPER_ADMIN, 'root@uaeaf.ae', [SUPER_ROLE]),
      user(ALICE, 'alice@uaeaf.ae', [ROLE_A]),
      user(BOB, 'bob@uaeaf.ae', [ROLE_A, ROLE_B]),
      user(CAROL, 'carol@uaeaf.ae', []),
      user(ERIN, 'erin@uaeaf.ae', [ROLE_OLD]),
      user(FRANK, 'frank@uaeaf.ae', [ROLE_B], { archivedAt: new Date('2026-02-01') }),
    ]);
    await stepModel.create([
      step(STEP_PARTIAL, 1, [ALICE, SUPER_ADMIN], 1),
      step(STEP_DEAD, 2, [BOB, ALICE], 1),
      step(STEP_HEALTHY, 3, [SUPER_ADMIN], 1),
      step(STEP_CLOSED, 4, [BOB], 1),
      step(STEP_DEDUP, 5, [SUPER_ADMIN, SUPER_ADMIN, ALICE], 2),
    ]);
    await instanceModel.create([
      instance(STEP_PARTIAL, 'InProgress'),
      instance(STEP_PARTIAL, 'Returned'),
      instance(STEP_DEAD, 'InProgress'),
      instance(STEP_HEALTHY, 'InProgress'),
      instance(STEP_CLOSED, 'Approved'),
      instance(STEP_CLOSED, 'Rejected'),
      instance(STEP_CLOSED, 'InProgress', { archivedAt: new Date('2026-03-01') }),
      instance(null, 'InProgress'),
      instance(STEP_DEDUP, 'Returned'),
    ]);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  const roleIdsOf = async (userId: Types.ObjectId) =>
    ((await userModel.findById(userId).lean())?.roleIds ?? []).map(String);

  describe('archiving', () => {
    it('archives every live non-system role and reports each one', async () => {
      const report = await resetRoles(models);

      expect(report.archivedRoles.map((role) => role.id).sort()).toEqual([ROLE_A, ROLE_B].map(String).sort());
      expect(report.archivedRoles.find((role) => role.id === ROLE_A.toString())?.name).toEqual({
        en: 'Editor',
        ar: 'محرر',
      });
      expect(await roleModel.countDocuments({ isSystemRole: { $ne: true }, archivedAt: null })).toBe(0);
    });

    it('stamps the archive with the Super Admin that owns the run', async () => {
      await resetRoles(models);

      expect((await roleModel.findById(ROLE_A).lean())?.archivedBy?.toString()).toBe(SUPER_ADMIN.toString());
    });

    it('leaves the Super Admin role live and untouched', async () => {
      const before = await roleModel.findById(SUPER_ROLE).lean();
      await resetRoles(models);

      expect(await roleModel.findById(SUPER_ROLE).lean()).toEqual(before);
    });

    it('leaves the roles of every account holding the Super Admin role untouched', async () => {
      await userModel.updateOne({ _id: SUPER_ADMIN }, { roleIds: [SUPER_ROLE, ROLE_B] });
      const before = await userModel.findById(SUPER_ADMIN).lean();
      await resetRoles(models);

      expect(await userModel.findById(SUPER_ADMIN).lean()).toEqual(before);
    });

    it('keeps every account', async () => {
      const before = await userModel.countDocuments();
      await resetRoles(models);

      expect(await userModel.countDocuments()).toBe(before);
    });
  });

  describe('detaching', () => {
    it('pulls every non-system role out of the accounts that held it, archived accounts included', async () => {
      await resetRoles(models);

      expect(await roleIdsOf(ALICE)).toEqual([]);
      expect(await roleIdsOf(BOB)).toEqual([]);
      expect(await roleIdsOf(ERIN)).toEqual([]);
      expect(await roleIdsOf(FRANK)).toEqual([]);
    });

    it('reports how many accounts it detached from', async () => {
      expect((await resetRoles(models)).detachedFrom).toBe(4);
    });

    it('writes one audit row per account and role detached, through AuditLogsService', async () => {
      const write = jest.spyOn(models.auditLogs, 'write');
      await resetRoles(models);

      expect(write).toHaveBeenCalledTimes(5);
      const rows = await auditModel.find().lean();
      const pairs = rows.map((row) => `${row.entityId?.toString()}:${String(row.previousValue?.roleId)}`).sort();
      expect(pairs).toEqual(
        [
          `${ALICE}:${ROLE_A}`,
          `${BOB}:${ROLE_A}`,
          `${BOB}:${ROLE_B}`,
          `${ERIN}:${ROLE_OLD}`,
          `${FRANK}:${ROLE_B}`,
        ].sort(),
      );
      for (const row of rows) {
        expect(row).toMatchObject({ entityType: 'users', reason: 'reset-roles', action: 'Update' });
        expect(row.actorId.toString()).toBe(SUPER_ADMIN.toString());
      }
    });
  });

  describe('role-less accounts', () => {
    it('lists live accounts left with no live role, including one that already held none', async () => {
      const report = await resetRoles(models);

      expect(report.rolelessAccounts.map((account) => account.email)).toEqual([
        'alice@uaeaf.ae',
        'bob@uaeaf.ae',
        'carol@uaeaf.ae',
        'erin@uaeaf.ae',
      ]);
      expect(report.rolelessAccounts[0]).toEqual({
        id: ALICE.toString(),
        email: 'alice@uaeaf.ae',
        name: { en: 'alice@uaeaf.ae', ar: 'alice@uaeaf.ae' },
      });
    });
  });

  describe('a second run', () => {
    it('archives nothing, detaches nothing, writes no audit row and reports the same accounts and steps', async () => {
      const first = await resetRoles(models);
      const rowsAfterFirst = await auditModel.countDocuments();
      const second = await resetRoles(models);

      expect(second.archivedRoles).toEqual([]);
      expect(second.detachedFrom).toBe(0);
      expect(await auditModel.countDocuments()).toBe(rowsAfterFirst);
      expect(second.rolelessAccounts).toEqual(first.rolelessAccounts);
      expect(second.blockedSteps).toEqual(first.blockedSteps);
    });
  });

  describe('open workflow steps', () => {
    it('reports every open step with an assignee who can no longer act, and marks the unsatisfiable ones', async () => {
      const report = await resetRoles(models);

      expect(report.blockedSteps).toEqual([
        {
          definitionId: DEFINITION.toString(),
          stepId: STEP_PARTIAL.toString(),
          assigneeIds: [ALICE.toString()],
          openInstanceCount: 2,
          unsatisfiable: false,
        },
        {
          definitionId: DEFINITION.toString(),
          stepId: STEP_DEAD.toString(),
          assigneeIds: [BOB.toString(), ALICE.toString()],
          openInstanceCount: 1,
          unsatisfiable: true,
        },
        {
          definitionId: DEFINITION.toString(),
          stepId: STEP_DEDUP.toString(),
          assigneeIds: [ALICE.toString()],
          openInstanceCount: 1,
          unsatisfiable: true,
        },
      ]);
    });

    it('changes no workflow step', async () => {
      const before = await stepModel.find().sort({ _id: 1 }).lean();
      await resetRoles(models);

      expect(await stepModel.find().sort({ _id: 1 }).lean()).toEqual(before);
    });
  });

  describe('refusals, before any write', () => {
    const nothingWritten = async () => {
      expect(await roleModel.countDocuments({ archivedAt: { $ne: null } })).toBe(1);
      expect(await roleIdsOf(ALICE)).toEqual([ROLE_A.toString()]);
      expect(await auditModel.countDocuments()).toBe(0);
    };

    it('refuses when an account stores a role id as a string, and names the account', async () => {
      const stringy = id();
      await userModel.collection.insertOne({
        _id: stringy,
        email: 'stringy@uaeaf.ae',
        name: { en: 'Stringy', ar: 'Stringy' },
        roleIds: [ROLE_A.toString()],
        accountStatus: 'Active',
        archivedAt: null,
      });

      await expect(resetRoles(models)).rejects.toThrow(/stringy@uaeaf\.ae/);
      await nothingWritten();
    });

    it('refuses when no active Super Admin exists to own the audit rows', async () => {
      await userModel.updateOne({ _id: SUPER_ADMIN }, { accountStatus: 'Suspended' });

      await expect(resetRoles(models)).rejects.toThrow(/Super Admin/);
      await nothingWritten();
    });

    it('does not accept an archived account as the Super Admin', async () => {
      await userModel.updateOne({ _id: SUPER_ADMIN }, { archivedAt: new Date() });

      await expect(resetRoles(models)).rejects.toThrow(/Super Admin/);
      await nothingWritten();
    });
  });
});
