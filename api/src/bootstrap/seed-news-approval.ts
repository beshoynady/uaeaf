import { Types, type Model } from 'mongoose';

/**
 * The approval configuration a newsroom needs before it can publish anything.
 *
 * Deliberately NOT a `seed-dev` fixture. That system validates each document
 * field-for-field, refuses any reference to a document the fixtures do not
 * also carry, and — by its own stated rule — never carries users. A workflow
 * step names its approvers by user id, so it could not satisfy that rule for
 * any real database. This runs against whichever users the target database
 * actually has instead.
 *
 * What it writes is exactly what the dashboard's policy screen writes through
 * the API: one definition, its steps, and the single
 * `workflowPolicies(articles, Edit)` row that decides whether a review is
 * required at all (owner decision 2026-09-20).
 *
 * Idempotent. A definition already present is reused, its steps are replaced
 * only when they differ, and a policy already pointing at it is left alone.
 */

/** How the administrator's choice of approvers becomes workflow steps.
 *
 *  Exported as a runtime list as well as a type because the HTTP layer
 *  validates against it (`ConfigureApprovalDto`) and a type alone cannot be
 *  checked at a request boundary. */
export const APPROVAL_MODES = ['ALL', 'THRESHOLD', 'SEQUENTIAL'] as const;
export type ApprovalMode = (typeof APPROVAL_MODES)[number];

/** One step as `workflowSteps` holds it, minus the definition it belongs to —
 *  the caller adds that once the definition exists, so this stays a pure
 *  translation of the choice. */
export interface StepInput {
  sequenceOrder: number;
  stepType: 'Sequential' | 'Parallel';
  assigneeIds: Types.ObjectId[];
  requiredApprovals: number;
}

export const NEWS_WORKFLOW_NAME = { ar: 'اعتماد الأخبار', en: 'News approval' } as const;

/**
 * The administrator's choice, as steps.
 *
 * The three modes are not three mechanisms: `stepType` and `requiredApprovals`
 * already express all of them, which is why no new schema was needed for the
 * policy (owner decision 2026-09-20).
 *
 *  - ALL — one parallel step that needs every approver.
 *  - THRESHOLD — one parallel step that needs the chosen number.
 *  - SEQUENTIAL — one step per approver, decided in the order given.
 *
 * @throws Error when the choice could never be satisfied. `WorkflowStepsService`
 *   refuses the same thing; refusing it here too means the caller is told at
 *   the choice rather than by a rejected write.
 */
export const buildSteps = (
  mode: ApprovalMode,
  approverIds: readonly Types.ObjectId[],
  threshold?: number,
): StepInput[] => {
  // Counted as a set, because `countDistinctApprovers` counts distinct actors:
  // the same person named twice is one approver, however the list is written.
  const distinct = [...new Map(approverIds.map((id) => [id.toString(), id])).values()];

  if (distinct.length === 0) {
    throw new Error('An approval workflow needs at least one approver.');
  }

  if (mode === 'SEQUENTIAL') {
    return distinct.map((id, index) => ({
      sequenceOrder: index + 1,
      stepType: 'Sequential',
      assigneeIds: [id],
      requiredApprovals: 1,
    }));
  }

  const required = mode === 'ALL' ? distinct.length : (threshold ?? 1);

  if (required > distinct.length) {
    throw new Error(
      `This policy needs ${required} approvals but names only ${distinct.length} distinct ${
        distinct.length === 1 ? 'approver' : 'approvers'
      }. It could never be satisfied.`,
    );
  }

  return [{ sequenceOrder: 1, stepType: 'Parallel', assigneeIds: distinct, requiredApprovals: required }];
};

export interface NewsApprovalModels {
  workflowDefinitions: Model<Record<string, unknown>>;
  workflowSteps: Model<Record<string, unknown>>;
  workflowPolicies: Model<Record<string, unknown>>;
}

export interface NewsApprovalSeedReport {
  definition: 'created' | 'reused';
  steps: number;
  policy: 'created' | 'updated' | 'unchanged';
}

/**
 * Configures the articles approval policy.
 *
 * @param approverIds the users who decide. Typically the administrator alone
 *   on a development machine.
 * @param mode how their approvals combine.
 * @param threshold the number needed, for `THRESHOLD` only.
 */
export const seedNewsApproval = async (
  models: NewsApprovalModels,
  approverIds: readonly Types.ObjectId[],
  mode: ApprovalMode = 'THRESHOLD',
  threshold = 1,
): Promise<NewsApprovalSeedReport> => {
  const steps = buildSteps(mode, approverIds, threshold);

  const existingDefinition = await models.workflowDefinitions
    .findOne({ entityType: 'articles', archivedAt: null })
    .lean<{ _id: Types.ObjectId }>();

  const definitionId =
    existingDefinition?._id ??
    ((
      await models.workflowDefinitions.create({
        name: NEWS_WORKFLOW_NAME,
        entityType: 'articles',
        isActive: true,
      })
    )._id as Types.ObjectId);

  // Only when they differ.
  //
  // Replacing unconditionally looked idempotent and was not: every run
  // archived the step that in-flight reviews pointed at and created a new one
  // in its place, orphaning each of them. `findById` is soft-delete aware, so
  // those reviews then matched nobody's queue and could never be decided —
  // a newsroom's work quietly stranded by a seed that reported success.
  //
  // Compared by what a step MEANS rather than by its id: the same approvers,
  // the same threshold, in the same order.
  const existingSteps = await models.workflowSteps
    .find({ workflowDefinitionId: definitionId, archivedAt: null })
    .sort({ sequenceOrder: 1 })
    .lean<{ sequenceOrder: number; assigneeIds: Types.ObjectId[]; requiredApprovals: number }[]>();

  const shape = (rows: readonly { assigneeIds: readonly Types.ObjectId[]; requiredApprovals: number }[]) =>
    rows.map((row) => `${row.assigneeIds.map(String).sort().join(',')}:${row.requiredApprovals}`).join('|');

  if (shape(existingSteps) !== shape(steps)) {
    // Archived rather than deleted, so the partial-unique index on
    // (definition, order) does not refuse the replacements, and so a finished
    // review's history still points at the step that decided it.
    await models.workflowSteps.updateMany(
      { workflowDefinitionId: definitionId, archivedAt: null },
      { $set: { archivedAt: new Date() } },
    );

    for (const step of steps) {
      await models.workflowSteps.create({ ...step, workflowDefinitionId: definitionId, assigneeType: 'User' });
    }
  }

  const existingPolicy = await models.workflowPolicies
    .findOne({ entityType: 'articles', operation: 'Edit', archivedAt: null })
    .lean<{ _id: Types.ObjectId; workflowRequired: boolean; workflowDefinitionId: Types.ObjectId | null }>();

  if (!existingPolicy) {
    await models.workflowPolicies.create({
      entityType: 'articles',
      operation: 'Edit',
      workflowRequired: true,
      workflowDefinitionId: definitionId,
      allowHardDelete: false,
    });
    return { definition: existingDefinition ? 'reused' : 'created', steps: steps.length, policy: 'created' };
  }

  const alreadyRight =
    existingPolicy.workflowRequired && existingPolicy.workflowDefinitionId?.toString() === definitionId.toString();

  if (!alreadyRight) {
    await models.workflowPolicies.updateOne(
      { _id: existingPolicy._id },
      { $set: { workflowRequired: true, workflowDefinitionId: definitionId } },
    );
  }

  return {
    definition: existingDefinition ? 'reused' : 'created',
    steps: steps.length,
    policy: alreadyRight ? 'unchanged' : 'updated',
  };
};
