import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { WorkflowPoliciesService } from './workflow-policies.service.js';
import { WorkflowPoliciesRepository } from './workflow-policies.repository.js';
import { WorkflowDefinitionsService } from '../workflow-definitions/workflow-definitions.service.js';
import { WorkflowStepsService } from '../workflow-steps/workflow-steps.service.js';
import type { WorkflowPolicyDocument } from './schemas/workflow-policy.schema.js';
import type { WorkflowDefinitionDocument } from '../workflow-definitions/schemas/workflow-definition.schema.js';

/**
 * `resolve` is the mechanism audit finding OUT-07 says was missing: the
 * `workflowPolicies` collection existed and nothing read it, so every
 * entity published by whatever path its own module happened to implement.
 * These tests fix the three answers it may give and, most importantly, fix
 * which way it fails.
 */
describe('WorkflowPoliciesService.resolve', () => {
  const definitionId = new Types.ObjectId();

  const makeRepository = (policy: Partial<WorkflowPolicyDocument> | null) =>
    ({
      findByEntityTypeAndOperation: jest.fn<() => Promise<unknown>>().mockResolvedValue(policy),
    }) as unknown as jest.Mocked<WorkflowPoliciesRepository>;

  const makeDefinitions = (definition: Partial<WorkflowDefinitionDocument> | null) =>
    ({
      findById: jest.fn<() => Promise<unknown>>().mockResolvedValue(definition),
    }) as unknown as jest.Mocked<WorkflowDefinitionsService>;

  const resolve = (
    policy: Partial<WorkflowPolicyDocument> | null,
    definition: Partial<WorkflowDefinitionDocument> | null = null,
  ) =>
    new WorkflowPoliciesService(
      makeRepository(policy),
      makeDefinitions(definition),
      // `resolve` reads no step — it answers what the policy SAYS, and whether
      // the workflow has anybody on it is checked when the policy is stored.
      { findByDefinition: jest.fn<() => Promise<unknown>>().mockResolvedValue([]) } as unknown as jest.Mocked<WorkflowStepsService>,
    ).resolve('presidentMessagePage', 'Edit');

  it('resolves workflow when required with an active definition of the same type', async () => {
    const result = await resolve(
      { workflowRequired: true, workflowDefinitionId: definitionId },
      { _id: definitionId, entityType: 'presidentMessagePage', isActive: true },
    );

    expect(result.mode).toBe('workflow');
    expect(result.workflowDefinitionId).toBe(definitionId);
    expect(result.reason).toBeNull();
  });

  it('resolves direct when approvals are not required', async () => {
    const result = await resolve({ workflowRequired: false, workflowDefinitionId: null });

    expect(result.mode).toBe('direct');
    expect(result.workflowDefinitionId).toBeNull();
  });

  it('blocks when no policy row exists at all', async () => {
    const result = await resolve(null);

    expect(result.mode).toBe('blocked');
    expect(result.reason).toBe('noPolicy');
  });

  it('blocks when approvals are required but no definition is named', async () => {
    const result = await resolve({ workflowRequired: true, workflowDefinitionId: null });

    expect(result.mode).toBe('blocked');
    expect(result.reason).toBe('definitionMissing');
  });

  it('blocks when the named definition does not exist', async () => {
    const result = await resolve({ workflowRequired: true, workflowDefinitionId: definitionId }, null);

    expect(result.mode).toBe('blocked');
    expect(result.reason).toBe('definitionMissing');
  });

  it('blocks when the named definition is inactive', async () => {
    const result = await resolve(
      { workflowRequired: true, workflowDefinitionId: definitionId },
      { _id: definitionId, entityType: 'presidentMessagePage', isActive: false },
    );

    expect(result.mode).toBe('blocked');
    expect(result.reason).toBe('definitionInactive');
  });

  it('blocks when the named definition governs another entity type', async () => {
    const result = await resolve(
      { workflowRequired: true, workflowDefinitionId: definitionId },
      { _id: definitionId, entityType: 'articles', isActive: true },
    );

    expect(result.mode).toBe('blocked');
    expect(result.reason).toBe('definitionForeignType');
  });

  it('never downgrades a misconfiguration to direct publishing', async () => {
    // The whole point of the fail-closed default: every broken configuration
    // above lands on `blocked`, and none of them on `direct`. A system whose
    // least-configured state is its most permissive state is not a
    // permission system.
    const broken = [
      await resolve(null),
      await resolve({ workflowRequired: true, workflowDefinitionId: null }),
      await resolve({ workflowRequired: true, workflowDefinitionId: definitionId }, null),
      await resolve(
        { workflowRequired: true, workflowDefinitionId: definitionId },
        { _id: definitionId, entityType: 'presidentMessagePage', isActive: false },
      ),
    ];

    expect(broken.map((result) => result.mode)).toEqual(['blocked', 'blocked', 'blocked', 'blocked']);
  });
});

/**
 * A policy that demands a review nobody can ever give.
 *
 * `resolve()` already refuses to ACT on one — it answers `blocked` — and that
 * is exactly the problem the reviewer of Phase 5 raised: the administrator who
 * stored it sees a success, and an editor discovers it weeks later as a
 * publication that will not go. Same class of risk as `unsatisfiableStep`,
 * which is refused at the keystroke; this was not.
 *
 * Two shapes are storable today, and both are deadlocks:
 *  - requires review, names no definition at all;
 *  - requires review, names a definition with no live step, so there is
 *    nobody to approve and `submit` throws at the editor.
 */
describe('WorkflowPoliciesService.upsert — the deadlock it must refuse', () => {
  const definitionId = new Types.ObjectId();

  const makeService = (
    definition: Partial<WorkflowDefinitionDocument> | null,
    steps: unknown[] = [],
  ) => {
    const repository = {
      findByEntityTypeAndOperation: jest.fn<() => Promise<unknown>>().mockResolvedValue(null),
      // `upsert` falls through to `create` when no row exists, so both are
      // mocked — asserting on `create` would pin the wrong half of the pair.
      create: jest.fn<() => Promise<unknown>>().mockResolvedValue({ _id: new Types.ObjectId() }),
      updateById: jest.fn<() => Promise<unknown>>().mockResolvedValue({ _id: new Types.ObjectId() }),
    } as unknown as jest.Mocked<WorkflowPoliciesRepository>;
    const definitions = makeDefinitionsFor(definition);
    const stepsService = {
      findByDefinition: jest.fn<() => Promise<unknown>>().mockResolvedValue(steps),
    } as unknown as jest.Mocked<WorkflowStepsService>;

    return {
      repository,
      service: new WorkflowPoliciesService(repository, definitions, stepsService),
    };
  };

  const makeDefinitionsFor = (definition: Partial<WorkflowDefinitionDocument> | null) =>
    ({
      findById: jest.fn<() => Promise<unknown>>().mockResolvedValue(definition),
    }) as unknown as jest.Mocked<WorkflowDefinitionsService>;

  const active = {
    _id: definitionId,
    entityType: 'presidentMessagePage',
    isActive: true,
  } as unknown as Partial<WorkflowDefinitionDocument>;
  const oneStep = [{ _id: new Types.ObjectId(), assigneeIds: [new Types.ObjectId()], requiredApprovals: 1 }];

  it('refuses a policy that requires review and names no definition', async () => {
    const { repository, service } = makeService(null);

    // The existing guard returns early on a null definition, so this stored
    // cleanly and `resolve()` answered `definitionMissing` — at publish time,
    // to the wrong person.
    await expect(
      service.upsert('presidentMessagePage', 'Edit', { workflowRequired: true, workflowDefinitionId: null }),
    ).rejects.toMatchObject({ response: { code: 'unsatisfiablePolicy' } });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('refuses a policy whose definition has nobody on it', async () => {
    const { repository, service } = makeService(active, []);

    // A definition with no live step has no assignee, so no submission can
    // reach anybody. `submit` throws "this workflow definition has no steps"
    // at an editor who did nothing wrong.
    await expect(
      service.upsert('presidentMessagePage', 'Edit', {
        workflowRequired: true,
        workflowDefinitionId: definitionId.toString(),
      }),
    ).rejects.toMatchObject({ response: { code: 'unsatisfiablePolicy' } });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('stores a policy that requires review and can actually be satisfied', async () => {
    const { repository, service } = makeService(active, oneStep);

    await service.upsert('presidentMessagePage', 'Edit', {
      workflowRequired: true,
      workflowDefinitionId: definitionId.toString(),
    });

    expect(repository.create).toHaveBeenCalled();
  });

  it('stores a policy that requires no review, with no definition and no steps', async () => {
    const { repository, service } = makeService(null);

    // Nothing to satisfy, so nothing to check: this is the ordinary shape of
    // every type that publishes directly, and refusing it would make "turn
    // approvals off" impossible.
    await service.upsert('presidentMessagePage', 'Edit', {
      workflowRequired: false,
      workflowDefinitionId: null,
    });

    expect(repository.create).toHaveBeenCalled();
  });
});
