import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { buildSteps, seedNewsApproval } from './seed-news-approval.js';
import type { NewsApprovalModels } from './seed-news-approval.js';

/**
 * The translation from "who approves, and how" into workflow steps.
 *
 * This is the whole of the approval policy: the three modes the owner asked
 * for are `stepType` and `requiredApprovals` in combination, which is why no
 * new policy schema was written for them. The dashboard's policy screen
 * performs the same translation, so what is pinned here is the contract both
 * ends share.
 */
describe('buildSteps', () => {
  const [a, b, c] = [new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId()];
  const idsOf = (step: { assigneeIds: Types.ObjectId[] }) => step.assigneeIds.map(String);

  it('turns ALL into one parallel step that needs everybody', () => {
    const [step, ...rest] = buildSteps('ALL', [a, b, c]);

    expect(rest).toHaveLength(0);
    expect(step).toMatchObject({ sequenceOrder: 1, stepType: 'Parallel', requiredApprovals: 3 });
    expect(idsOf(step)).toEqual([a, b, c].map(String));
  });

  it('turns THRESHOLD into one parallel step that needs the chosen number', () => {
    const [step] = buildSteps('THRESHOLD', [a, b, c], 2);

    expect(step).toMatchObject({ stepType: 'Parallel', requiredApprovals: 2 });
    expect(idsOf(step)).toHaveLength(3);
  });

  it('turns SEQUENTIAL into one step per approver, in the order chosen', () => {
    const steps = buildSteps('SEQUENTIAL', [a, b]);

    expect(steps.map((step) => step.sequenceOrder)).toEqual([1, 2]);
    expect(steps.map(idsOf)).toEqual([[String(a)], [String(b)]]);
    expect(steps.every((step) => step.requiredApprovals === 1)).toBe(true);
  });

  it('counts a repeated approver once', () => {
    // `countDistinctApprovers` counts distinct actors, so listing the same
    // person twice raises the apparent headcount without raising the real one.
    const [step] = buildSteps('ALL', [a, a, b]);

    expect(idsOf(step)).toEqual([String(a), String(b)]);
    expect(step.requiredApprovals).toBe(2);
  });

  it('refuses a threshold above the number of distinct approvers', () => {
    // The API refuses this too. Refusing it here means the administrator is
    // told at the control they just moved, not by a rejected save.
    expect(() => buildSteps('THRESHOLD', [a, b], 3)).toThrow(/could never be satisfied/);
    expect(() => buildSteps('THRESHOLD', [a, a], 2)).toThrow(/could never be satisfied/);
  });

  it('refuses a workflow with nobody in it', () => {
    expect(() => buildSteps('ALL', [])).toThrow(/at least one approver/);
  });
});

describe('seedNewsApproval', () => {
  const approver = new Types.ObjectId();
  const definitionId = new Types.ObjectId();

  const makeModels = (
    existing: { definition?: unknown; policy?: unknown; steps?: unknown[] } = {},
  ) => {
    const lean = (value: unknown) => ({ lean: async () => value });
    const workflowDefinitions = {
      findOne: jest.fn(() => lean(existing.definition ?? null)),
      create: jest.fn(async () => ({ _id: definitionId })),
    };
    const workflowSteps = {
      // `find(...).sort(...).lean()` — the shape the seed reads the existing
      // arrangement through before deciding whether to replace it.
      find: jest.fn(() => ({ sort: () => ({ lean: async () => existing.steps ?? [] }) })),
      updateMany: jest.fn(async () => undefined),
      create: jest.fn(async () => ({ _id: new Types.ObjectId() })),
    };
    const workflowPolicies = {
      findOne: jest.fn(() => lean(existing.policy ?? null)),
      create: jest.fn(async () => ({ _id: new Types.ObjectId() })),
      updateOne: jest.fn(async () => undefined),
    };
    return { workflowDefinitions, workflowSteps, workflowPolicies } as unknown as NewsApprovalModels & {
      workflowDefinitions: { create: jest.Mock };
      workflowSteps: { create: jest.Mock; updateMany: jest.Mock };
      workflowPolicies: { create: jest.Mock; updateOne: jest.Mock };
    };
  };

  it('creates the definition, its steps and the policy on an empty database', async () => {
    const models = makeModels();

    const report = await seedNewsApproval(models, [approver]);

    expect(report).toEqual({ definition: 'created', steps: 1, policy: 'created' });
    expect(models.workflowPolicies.create).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'articles', operation: 'Edit', workflowRequired: true }),
    );
  });

  it('archives the previous steps instead of adding to them', async () => {
    const models = makeModels({ definition: { _id: definitionId } });

    await seedNewsApproval(models, [approver, new Types.ObjectId()], 'SEQUENTIAL');

    // The steps ARE the choice. Merging would leave an approver nobody chose
    // still able to hold up every article.
    expect(models.workflowSteps.updateMany).toHaveBeenCalledWith(
      { workflowDefinitionId: definitionId, archivedAt: null },
      { $set: { archivedAt: expect.any(Date) } },
    );
    expect(models.workflowSteps.create).toHaveBeenCalledTimes(2);
  });


  it('leaves the steps alone when the arrangement is already the one asked for', async () => {
    const approverTwo = new Types.ObjectId();
    const models = makeModels({
      definition: { _id: definitionId },
      steps: [{ sequenceOrder: 1, assigneeIds: [approver, approverTwo], requiredApprovals: 2 }],
    });

    await seedNewsApproval(models, [approver, approverTwo], 'ALL');

    // Replacing unconditionally looked idempotent and was not: every run
    // archived the step in-flight reviews pointed at and made a new one, so
    // `findById` — which is soft-delete aware — stopped finding it and those
    // reviews matched nobody's queue. Work stranded by a seed reporting
    // success.
    expect(models.workflowSteps.updateMany).not.toHaveBeenCalled();
    expect(models.workflowSteps.create).not.toHaveBeenCalled();
  });

  it('replaces the steps when the arrangement genuinely changed', async () => {
    const models = makeModels({
      definition: { _id: definitionId },
      steps: [{ sequenceOrder: 1, assigneeIds: [approver], requiredApprovals: 1 }],
    });

    await seedNewsApproval(models, [approver, new Types.ObjectId()], 'ALL');

    expect(models.workflowSteps.updateMany).toHaveBeenCalled();
  });

  it('leaves a policy that already points at the definition alone', async () => {
    const models = makeModels({
      definition: { _id: definitionId },
      policy: { _id: new Types.ObjectId(), workflowRequired: true, workflowDefinitionId: definitionId },
    });

    const report = await seedNewsApproval(models, [approver]);

    expect(report.policy).toBe('unchanged');
    expect(models.workflowPolicies.updateOne).not.toHaveBeenCalled();
  });

  it('repairs a policy that requires no review, or names another definition', async () => {
    const models = makeModels({
      definition: { _id: definitionId },
      policy: { _id: new Types.ObjectId(), workflowRequired: false, workflowDefinitionId: null },
    });

    const report = await seedNewsApproval(models, [approver]);

    expect(report.policy).toBe('updated');
    expect(models.workflowPolicies.updateOne).toHaveBeenCalledWith(
      expect.anything(),
      { $set: { workflowRequired: true, workflowDefinitionId: definitionId } },
    );
  });

  it('writes nothing at all when the choice could never be satisfied', async () => {
    const models = makeModels();

    await expect(seedNewsApproval(models, [approver], 'THRESHOLD', 5)).rejects.toThrow(/never be satisfied/);
    expect(models.workflowDefinitions.create).not.toHaveBeenCalled();
    expect(models.workflowSteps.create).not.toHaveBeenCalled();
  });
});
