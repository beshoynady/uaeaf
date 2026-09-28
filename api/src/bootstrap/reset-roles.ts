import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import type { LocalizedText } from '../common/schemas/localized-text.schema.js';
import type { Role } from '../modules/platform-administration/roles/schemas/role.schema.js';
import type { User } from '../modules/platform-administration/users/schemas/user.schema.js';
import type { WorkflowStep } from '../modules/workflow/workflow-steps/schemas/workflow-step.schema.js';
import type {
  WorkflowInstance,
  WorkflowInstanceStatus,
} from '../modules/workflow/workflow-instances/schemas/workflow-instance.schema.js';
import type { AuditLogsService } from '../modules/workflow/audit-logs/audit-logs.service.js';

/** What `resetRoles` reads and writes. Audit rows go through the service only;
 *  `AuditLogsRepository` is append-only and never reached from here. */
export interface ResetRolesModels {
  roles: Model<Role>;
  users: Model<User>;
  workflowSteps: Model<WorkflowStep>;
  workflowInstances: Model<WorkflowInstance>;
  auditLogs: AuditLogsService;
}

/** What the run did and what it leaves for an administrator to settle by hand. */
export interface ResetReport {
  archivedRoles: { id: string; name: LocalizedText }[];
  rolelessAccounts: { id: string; email: string; name: LocalizedText }[];
  detachedFrom: number;
  blockedSteps: {
    definitionId: string;
    stepId: string;
    assigneeIds: string[];
    openInstanceCount: number;
    unsatisfiable: boolean;
  }[];
}

interface StoredUser {
  _id: Types.ObjectId;
  email: string;
  name: LocalizedText;
  roleIds?: unknown[];
  accountStatus: string;
  archivedAt: Date | null;
}

const OPEN_STATUSES: WorkflowInstanceStatus[] = ['InProgress', 'Returned'];
const REASON = 'reset-roles';

const holdsAny = (user: StoredUser, roleIds: Set<string>): boolean =>
  (user.roleIds ?? []).some((roleId) => roleIds.has(String(roleId)));

// A string id never matches the ObjectId filter a detach uses, so that account
// would silently keep its role. Refused whole, before anything is written.
const assertObjectIdRoleRefs = (users: StoredUser[]): void => {
  const offending = users.filter((user) => (user.roleIds ?? []).some((roleId) => !(roleId instanceof Types.ObjectId)));
  if (offending.length > 0) {
    throw new Error(
      `Refusing: ${offending.length} account(s) store a role id that is not an ObjectId, which a detach cannot match: ` +
        offending.map((user) => `${user.email} (${user._id.toString()})`).join(', '),
    );
  }
};

const resolveActor = (users: StoredUser[], systemRoleIds: Set<string>): Types.ObjectId => {
  const actor = users
    .filter((user) => user.accountStatus === 'Active' && user.archivedAt == null && holdsAny(user, systemRoleIds))
    .sort((a, b) => a._id.toString().localeCompare(b._id.toString()))[0];
  if (!actor) {
    throw new Error('Refusing: no active Super Admin account exists to own the audit rows this run writes.');
  }
  return actor._id;
};

const findBlockedSteps = async (
  models: ResetRolesModels,
  canAct: Set<string>,
): Promise<ResetReport['blockedSteps']> => {
  const open = await models.workflowInstances
    .find({ status: { $in: OPEN_STATUSES }, currentStepId: { $ne: null }, archivedAt: null })
    .select('currentStepId')
    .lean();
  const openCount = new Map<string, number>();
  for (const instance of open) {
    const stepId = String(instance.currentStepId);
    openCount.set(stepId, (openCount.get(stepId) ?? 0) + 1);
  }

  const steps = await models.workflowSteps
    .find({ _id: { $in: [...openCount.keys()].map((stepId) => new Types.ObjectId(stepId)) } })
    .sort({ workflowDefinitionId: 1, sequenceOrder: 1, _id: 1 })
    .lean();

  return steps.flatMap((step) => {
    const assignees = [...new Set(step.assigneeIds.map(String))];
    const unable = assignees.filter((assigneeId) => !canAct.has(assigneeId));
    if (unable.length === 0) {
      return [];
    }
    return [
      {
        definitionId: step.workflowDefinitionId.toString(),
        stepId: step._id.toString(),
        assigneeIds: unable,
        openInstanceCount: openCount.get(step._id.toString()) ?? 0,
        unsatisfiable: assignees.length - unable.length < step.requiredApprovals,
      },
    ];
  });
};

/** Archives every non-system role and detaches it from each account without a system role. Idempotent;
 *  changes no workflow step. Throws before any write on a non-ObjectId role id or with no active Super Admin.
 *  See ADR-0113. */
export const resetRoles = async (models: ResetRolesModels): Promise<ResetReport> => {
  const users = await models.users.collection.find<StoredUser>({}).toArray();
  assertObjectIdRoleRefs(users);

  const roles = await models.roles.find().lean();
  const systemRoleIds = new Set(roles.filter((role) => role.isSystemRole === true).map((role) => role._id.toString()));
  const actorId = resolveActor(users, systemRoleIds);

  const toArchive = roles.filter((role) => role.isSystemRole !== true && role.archivedAt == null);
  const archivedAt = new Date();
  for (const role of toArchive) {
    await models.roles.updateOne({ _id: role._id, archivedAt: null }, { archivedAt, archivedBy: actorId });
  }

  const nonSystemIds = roles.filter((role) => role.isSystemRole !== true).map((role) => role._id);
  const nonSystemSet = new Set(nonSystemIds.map(String));
  let detachedFrom = 0;
  for (const user of users) {
    if (holdsAny(user, systemRoleIds) || !holdsAny(user, nonSystemSet)) {
      continue;
    }
    const pulled = (user.roleIds as Types.ObjectId[]).filter((roleId) => nonSystemSet.has(roleId.toString()));
    const result = await models.users.updateOne(
      { _id: user._id, roleIds: { $in: pulled, $nin: [...systemRoleIds].map((roleId) => new Types.ObjectId(roleId)) } },
      { $pull: { roleIds: { $in: pulled } } },
    );
    if (result.modifiedCount === 0) {
      continue;
    }
    detachedFrom += 1;
    for (const roleId of pulled) {
      await models.auditLogs.write({
        actorId,
        action: 'Update',
        entityType: 'users',
        entityId: user._id,
        previousValue: { roleId: roleId.toString() },
        newValue: null,
        reason: REASON,
        ipAddress: '',
        userAgent: '',
      });
    }
  }

  const liveRoleIds = new Set(
    (await models.roles.find({ archivedAt: null }).select('_id').lean()).map((role) => role._id.toString()),
  );
  const current = await models.users.collection.find<StoredUser>({}).sort({ _id: 1 }).toArray();
  const canAct = new Set(
    current
      .filter((user) => user.accountStatus === 'Active' && user.archivedAt == null && holdsAny(user, liveRoleIds))
      .map((user) => user._id.toString()),
  );

  const rolelessAccounts = current
    .filter((user) => user.archivedAt == null && !holdsAny(user, liveRoleIds))
    .sort((a, b) => a.email.localeCompare(b.email))
    .map((user) => ({ id: user._id.toString(), email: user.email, name: { en: user.name.en, ar: user.name.ar } }));

  return {
    archivedRoles: toArchive.map((role) => ({ id: role._id.toString(), name: { en: role.name.en, ar: role.name.ar } })),
    rolelessAccounts,
    detachedFrom,
    blockedSteps: await findBlockedSteps(models, canAct),
  };
};
