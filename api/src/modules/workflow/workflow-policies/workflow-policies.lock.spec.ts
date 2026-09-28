import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { WorkflowPoliciesService } from './workflow-policies.service.js';
import { WorkflowPoliciesRepository } from './workflow-policies.repository.js';
import { WorkflowDefinitionsService } from '../workflow-definitions/workflow-definitions.service.js';
import { WorkflowStepsService } from '../workflow-steps/workflow-steps.service.js';
import { WorkflowInstancesService } from '../workflow-instances/workflow-instances.service.js';

/**
 * The change lock belongs to the writer, not to one of its callers.
 *
 * ADR-0107 put `assertNothingRunning` in `ApprovalConfigurationService`, which
 * owns `PUT /workflow-policies/:entityType/approval`. But `workflowPolicies` has
 * a **second** door: `PUT /workflow-policies/:entityType/:operation` calls
 * `WorkflowPoliciesService.upsert` directly, writes the same `workflowRequired`
 * field on the same document, carries the same `workflowPolicies:Update`
 * permission, and had no lock at all. So the refusal could be walked around in
 * one extra call, and the P1-2 deadlock it exists to prevent came straight back.
 *
 * The guard now lives here, where every writer must pass.
 */
describe('WorkflowPoliciesService — the change lock lives with the writer', () => {
  let service: WorkflowPoliciesService;
  let repository: jest.Mocked<WorkflowPoliciesRepository>;
  let instancesService: jest.Mocked<WorkflowInstancesService>;

  const policyId = new Types.ObjectId();
  const definitionId = new Types.ObjectId();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowPoliciesService,
        {
          provide: WorkflowPoliciesRepository,
          useValue: {
            findByEntityTypeAndOperation: jest.fn(),
            updateById: jest.fn(),
            create: jest.fn(),
          },
        },
        { provide: WorkflowDefinitionsService, useValue: { findById: jest.fn() } },
        { provide: WorkflowStepsService, useValue: { findByDefinition: jest.fn() } },
        {
          provide: WorkflowInstancesService,
          useValue: { countUnapprovedForEntityType: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(WorkflowPoliciesService);
    repository = module.get(WorkflowPoliciesRepository);
    instancesService = module.get(WorkflowInstancesService);

    repository.updateById.mockResolvedValue({ _id: policyId } as never);
    repository.create.mockResolvedValue({ _id: policyId } as never);
    instancesService.countUnapprovedForEntityType.mockResolvedValue(0 as never);
  });

  /** The policy as stored: currently requiring a review. */
  const currentlyRequiresReview = () => {
    repository.findByEntityTypeAndOperation.mockResolvedValue({
      _id: policyId,
      workflowRequired: true,
      workflowDefinitionId: definitionId,
    } as never);
  };

  it('refuses to turn Edit approvals off while content is unapproved', async () => {
    currentlyRequiresReview();
    instancesService.countUnapprovedForEntityType.mockResolvedValue(2 as never);

    await expect(
      service.upsert('articles', 'Edit', { workflowRequired: false, workflowDefinitionId: null }),
    ).rejects.toMatchObject({ response: { code: 'reviewsInFlight', inFlightReviews: 2 } });

    expect(repository.updateById).not.toHaveBeenCalled();
  });

  /**
   * The predicate is `status !== 'Approved'`, matching `findActive` — the query
   * that actually blocks the publish. `countOpenForDefinition` uses the narrower
   * `['InProgress','Returned']`, which is correct for an ARRANGEMENT change (a
   * Rejected review is restarted from the first step, so replacing the steps
   * does not strand it) and wrong for turning approvals off, where a Rejected
   * review is still `findActive` and still blocks both publish paths.
   */
  it('counts a Rejected review too, because findActive does', async () => {
    currentlyRequiresReview();
    instancesService.countUnapprovedForEntityType.mockResolvedValue(1 as never);

    await expect(
      service.upsert('articles', 'Edit', { workflowRequired: false, workflowDefinitionId: null }),
    ).rejects.toMatchObject({ response: { code: 'reviewsInFlight' } });

    // By entity type, not by definition id: a second definition for the same
    // type would hide its reviews from a definition-scoped count while
    // `findActive` still blocks their records.
    expect(instancesService.countUnapprovedForEntityType).toHaveBeenCalledWith('articles');
  });

  it('allows turning approvals off once nothing is unapproved', async () => {
    currentlyRequiresReview();

    await expect(
      service.upsert('articles', 'Edit', { workflowRequired: false, workflowDefinitionId: null }),
    ).resolves.toBeDefined();
  });

  it('does not lock a policy that already required no review — nothing transitions', async () => {
    repository.findByEntityTypeAndOperation.mockResolvedValue({
      _id: policyId,
      workflowRequired: false,
      workflowDefinitionId: null,
    } as never);
    instancesService.countUnapprovedForEntityType.mockResolvedValue(5 as never);

    await expect(
      service.upsert('articles', 'Edit', { workflowRequired: false, workflowDefinitionId: null }),
    ).resolves.toBeDefined();
  });

  it('does not lock turning approvals ON, which strands nothing', async () => {
    repository.findByEntityTypeAndOperation.mockResolvedValue({
      _id: policyId,
      workflowRequired: false,
      workflowDefinitionId: null,
    } as never);
    instancesService.countUnapprovedForEntityType.mockResolvedValue(3 as never);

    await expect(
      service.upsert('articles', 'Edit', {
        workflowRequired: true,
        workflowDefinitionId: definitionId.toString(),
      }),
    ).rejects.toMatchObject({ response: { code: expect.not.stringMatching('reviewsInFlight') } });
  });

  /** Only `Edit` governs the publish path. `Delete`/`Archive` policies strand
   *  nothing, so locking them would refuse a change with no consequence. */
  it('does not lock an operation other than Edit', async () => {
    currentlyRequiresReview();
    instancesService.countUnapprovedForEntityType.mockResolvedValue(4 as never);

    await expect(
      service.upsert('articles', 'Delete', { workflowRequired: false, workflowDefinitionId: null }),
    ).resolves.toBeDefined();
  });

  it('does not lock a policy that does not exist yet', async () => {
    repository.findByEntityTypeAndOperation.mockResolvedValue(null as never);
    instancesService.countUnapprovedForEntityType.mockResolvedValue(9 as never);

    await expect(
      service.upsert('articles', 'Edit', { workflowRequired: false, workflowDefinitionId: null }),
    ).resolves.toBeDefined();
  });
});
