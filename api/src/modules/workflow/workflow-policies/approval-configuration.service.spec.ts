import { jest } from '@jest/globals';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ApprovalConfigurationService } from './approval-configuration.service.js';
import { WorkflowPoliciesService } from './workflow-policies.service.js';
import { WorkflowDefinitionsService } from '../workflow-definitions/workflow-definitions.service.js';
import { WorkflowStepsService } from '../workflow-steps/workflow-steps.service.js';

/**
 * Turning approvals on for any entity type, from one screen.
 *
 * Before this, configuring a review meant creating a definition, then its
 * steps, then a policy pointing at it — three calls an administrator had to
 * get right in order, with no screen for any of them. That is why eleven of
 * the twelve governed types had no policy at all, and why publishing them
 * failed closed with a message about configuration nobody could act on.
 */
describe('ApprovalConfigurationService', () => {
  const entityType = 'articles' as const;
  const definitionId = new Types.ObjectId();
  const [a, b, c] = [new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId()];
  const ids = [a, b, c].map(String);

  const makeDeps = (existingDefinition: unknown = null) => {
    const definitionsService = {
      findByEntityType: jest.fn(async () => existingDefinition),
      create: jest.fn(async () => ({ _id: definitionId })),
      setActive: jest.fn(async () => ({ _id: definitionId })),
    } as unknown as jest.Mocked<WorkflowDefinitionsService>;
    const stepsService = {
      replaceForDefinition: jest.fn(async () => undefined),
      findByDefinition: jest.fn(async () => []),
    } as unknown as jest.Mocked<WorkflowStepsService>;
    const policiesService = {
      upsert: jest.fn(async () => ({ _id: new Types.ObjectId() })),
      findByEntityTypeAndOperation: jest.fn(async () => null),
    } as unknown as jest.Mocked<WorkflowPoliciesService>;

    return { definitionsService, stepsService, policiesService };
  };

  const makeService = (deps: ReturnType<typeof makeDeps>) =>
    new ApprovalConfigurationService(deps.policiesService, deps.definitionsService, deps.stepsService);

  it('refuses an entity type the platform does not guard', async () => {
    const deps = makeDeps();

    // `PERMISSION_RESOURCES` is the closed list of things this platform has
    // permissions for. A policy for anything else is configuration that gates
    // no route — the "looks granted, guards nothing" failure that list exists
    // to prevent.
    await expect(
      makeService(deps).configure('notAThing', { enabled: true, mode: 'ALL', approverIds: ids }),
    ).rejects.toThrow(BadRequestException);
    expect(deps.definitionsService.create).not.toHaveBeenCalled();
  });

  it('refuses an entity type that cannot be governed by a workflow', async () => {
    const deps = makeDeps();

    // `users` is a real permission resource and is not in the workflow entity
    // list: reviewing an account before it takes effect is not a thing this
    // engine does.
    await expect(
      makeService(deps).configure('users', { enabled: true, mode: 'ALL', approverIds: ids }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates the definition, its steps and the policy when enabling for the first time', async () => {
    const deps = makeDeps();

    await makeService(deps).configure(entityType, { enabled: true, mode: 'ALL', approverIds: ids });

    expect(deps.definitionsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ entityType, isActive: true }),
    );
    expect(deps.policiesService.upsert).toHaveBeenCalledWith(
      entityType,
      'Edit',
      expect.objectContaining({ workflowRequired: true, workflowDefinitionId: definitionId.toString() }),
    );
  });

  it('reuses the definition it already has rather than adding a second', async () => {
    const deps = makeDeps({ _id: definitionId, entityType, isActive: true });

    await makeService(deps).configure(entityType, { enabled: true, mode: 'THRESHOLD', approverIds: ids, threshold: 2 });

    // Two definitions for one type is a state where which approvers apply
    // depends on which row a query happened to return first.
    expect(deps.definitionsService.create).not.toHaveBeenCalled();
    expect(deps.stepsService.replaceForDefinition).toHaveBeenCalledWith(
      definitionId,
      expect.arrayContaining([expect.objectContaining({ requiredApprovals: 2, stepType: 'Parallel' })]),
    );
  });

  it('replaces the steps rather than adding to them', async () => {
    const deps = makeDeps({ _id: definitionId, entityType, isActive: true });

    await makeService(deps).configure(entityType, { enabled: true, mode: 'SEQUENTIAL', approverIds: ids });

    // The steps ARE the administrator's choice. Merging would leave an
    // approver nobody chose still able to hold up every publication.
    const [, steps] = deps.stepsService.replaceForDefinition.mock.calls[0] as [Types.ObjectId, unknown[]];
    expect(steps).toHaveLength(3);
  });

  it('refuses a threshold no set of approvers could ever meet', async () => {
    const deps = makeDeps();

    await expect(
      makeService(deps).configure(entityType, { enabled: true, mode: 'THRESHOLD', approverIds: ids, threshold: 5 }),
    ).rejects.toThrow(ConflictException);
    expect(deps.stepsService.replaceForDefinition).not.toHaveBeenCalled();
  });

  it('turns approvals off without discarding who the approvers were', async () => {
    const deps = makeDeps({ _id: definitionId, entityType, isActive: true });

    await makeService(deps).configure(entityType, { enabled: false });

    expect(deps.policiesService.upsert).toHaveBeenCalledWith(
      entityType,
      'Edit',
      expect.objectContaining({ workflowRequired: false }),
    );
    // Turning it back on later should restore the same people, so the steps
    // survive being switched off.
    expect(deps.stepsService.replaceForDefinition).not.toHaveBeenCalled();
  });

  it('can disable a type that was never configured, without inventing a definition', async () => {
    const deps = makeDeps();

    await makeService(deps).configure(entityType, { enabled: false });

    expect(deps.definitionsService.create).not.toHaveBeenCalled();
    expect(deps.policiesService.upsert).toHaveBeenCalledWith(
      entityType,
      'Edit',
      expect.objectContaining({ workflowRequired: false, workflowDefinitionId: null }),
    );
  });
});
