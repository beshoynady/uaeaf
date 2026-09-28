import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { ApprovalConfigurationService } from './approval-configuration.service.js';
import { WorkflowPoliciesService } from './workflow-policies.service.js';
import { WorkflowDefinitionsService } from '../workflow-definitions/workflow-definitions.service.js';
import { WorkflowStepsService } from '../workflow-steps/workflow-steps.service.js';
import { WorkflowInstancesService } from '../workflow-instances/workflow-instances.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

/**
 * ADR-0107 — a policy cannot change while content is under review.
 *
 * `configure` already refused an *arrangement* change while reviews were
 * running. `disable` did not, and the consequence was that turning approvals off
 * stranded every in-flight review: `publishDirect` refuses because an active
 * review exists, and `publishApproved` refuses because the policy now resolves
 * to `direct` and says to publish directly — which the first refusal forbids.
 * The content waited until somebody thought to cancel the review.
 */
describe('ApprovalConfigurationService — the change lock', () => {
  let service: ApprovalConfigurationService;
  let policiesService: jest.Mocked<WorkflowPoliciesService>;
  let definitionsService: jest.Mocked<WorkflowDefinitionsService>;
  let stepsService: jest.Mocked<WorkflowStepsService>;
  let instancesService: jest.Mocked<WorkflowInstancesService>;

  const definitionId = new Types.ObjectId();
  const approverId = new Types.ObjectId().toString();

  /** ADR-0107: the policy change records who made it. */
  const actor = {
    userId: new Types.ObjectId().toString(),
    roleIds: [],
    permissions: [],
  } as never;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalConfigurationService,
        {
          provide: WorkflowPoliciesService,
          useValue: { upsert: jest.fn(), findByEntityTypeAndOperation: jest.fn() },
        },
        {
          provide: WorkflowDefinitionsService,
          useValue: { findByEntityType: jest.fn(), create: jest.fn() },
        },
        {
          provide: WorkflowStepsService,
          useValue: { findByDefinition: jest.fn(), replaceForDefinition: jest.fn() },
        },
        {
          provide: WorkflowInstancesService,
          useValue: {
            countOpenForDefinition: jest.fn(),
            findOpenForDefinition: jest.fn(),
            countUnapprovedForEntityType: jest.fn(),
            findUnapprovedForEntityType: jest.fn(),
          },
        },
        { provide: AuditLogsService, useValue: { write: jest.fn() } },
      ],
    }).compile();

    service = module.get(ApprovalConfigurationService);
    policiesService = module.get(WorkflowPoliciesService);
    definitionsService = module.get(WorkflowDefinitionsService);
    stepsService = module.get(WorkflowStepsService);
    instancesService = module.get(WorkflowInstancesService);

    definitionsService.findByEntityType.mockResolvedValue({
      _id: definitionId,
      entityType: 'articles',
      isActive: true,
    } as never);
    stepsService.findByDefinition.mockResolvedValue([] as never);
    policiesService.findByEntityTypeAndOperation.mockResolvedValue(null as never);
    policiesService.upsert.mockResolvedValue({ _id: new Types.ObjectId() } as never);
    instancesService.countOpenForDefinition.mockResolvedValue(0 as never);
    instancesService.findOpenForDefinition.mockResolvedValue([] as never);
    instancesService.countUnapprovedForEntityType.mockResolvedValue(0 as never);
    instancesService.findUnapprovedForEntityType.mockResolvedValue([] as never);
  });

  describe('turning approvals off', () => {
    it('refuses while a review is running, and writes no policy', async () => {
      instancesService.countUnapprovedForEntityType.mockResolvedValue(2 as never);

      await expect(service.configure('articles', { enabled: false }, actor)).rejects.toMatchObject({
        response: { code: 'reviewsInFlight' },
      });

      expect(policiesService.upsert).not.toHaveBeenCalled();
    });

    /**
     * The count alone tells an administrator how many, not whether to wait ten
     * minutes or telephone somebody — which is the only decision they are making
     * at that moment. So the refusal carries the rows behind the number.
     */
    it('names the pending records in the refusal', async () => {
      instancesService.countUnapprovedForEntityType.mockResolvedValue(2 as never);
      instancesService.findUnapprovedForEntityType.mockResolvedValue([
        { entityId: new Types.ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa'), currentStepId: new Types.ObjectId() },
        { entityId: new Types.ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'), currentStepId: null },
      ] as never);

      await expect(service.configure('articles', { enabled: false }, actor)).rejects.toMatchObject({
        response: {
          code: 'reviewsInFlight',
          inFlightReviews: 2,
          pending: [
            { entityId: 'aaaaaaaaaaaaaaaaaaaaaaaa' },
            { entityId: 'bbbbbbbbbbbbbbbbbbbbbbbb' },
          ],
        },
      });
    });

    it('turns approvals off when nothing is running', async () => {
      await service.configure('articles', { enabled: false }, actor);

      expect(policiesService.upsert).toHaveBeenCalledWith('articles', 'Edit', {
        workflowRequired: false,
        workflowDefinitionId: null,
      });
    });

    it('turns approvals off when the type has no definition at all', async () => {
      definitionsService.findByEntityType.mockResolvedValue(null as never);

      await service.configure('articles', { enabled: false }, actor);

      expect(instancesService.countOpenForDefinition).not.toHaveBeenCalled();
      expect(policiesService.upsert).toHaveBeenCalled();
    });
  });

  describe('changing the arrangement', () => {
    it('still refuses while reviews run — behaviour this ADR does not change', async () => {
      instancesService.countOpenForDefinition.mockResolvedValue(1 as never);
      // A different shape from the stored one, so the arrangement has changed.
      stepsService.findByDefinition.mockResolvedValue([] as never);

      await expect(
        service.configure('articles', {
          enabled: true,
          mode: 'THRESHOLD',
          approverIds: [approverId],
          threshold: 1,
        }, actor),
      ).rejects.toMatchObject({ response: { code: 'reviewsInFlight' } });
    });
  });
});
