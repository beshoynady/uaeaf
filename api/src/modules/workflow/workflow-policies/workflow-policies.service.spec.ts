import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { WorkflowPoliciesService } from './workflow-policies.service.js';
import { WorkflowPoliciesRepository } from './workflow-policies.repository.js';
import { WorkflowDefinitionsService } from '../workflow-definitions/workflow-definitions.service.js';
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
    new WorkflowPoliciesService(makeRepository(policy), makeDefinitions(definition)).resolve(
      'presidentMessagePage',
      'Edit',
    );

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
