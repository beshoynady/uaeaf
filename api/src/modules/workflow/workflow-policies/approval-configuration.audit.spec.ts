import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { ApprovalConfigurationService } from './approval-configuration.service.js';
import { WorkflowPoliciesService } from './workflow-policies.service.js';
import { WorkflowDefinitionsService } from '../workflow-definitions/workflow-definitions.service.js';
import { WorkflowStepsService } from '../workflow-steps/workflow-steps.service.js';
import { WorkflowInstancesService } from '../workflow-instances/workflow-instances.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';

/**
 * ADR-0107 — every approval-policy change records what it was and what it became.
 *
 * This is the one write on the platform the audit interceptor cannot describe.
 * `configure` returns a `GovernableEntity`, which carries no `_id`, and the
 * route's path parameter is `entityType` rather than `:id` — so both of the
 * interceptor's identity sources are undefined and it wrote nothing at all.
 * Turning the federation's approval requirement on or off for a content type,
 * and changing who approves, left no trace.
 *
 * Even with ADR-0112's fix to the silent skip, the interceptor still could not
 * supply `previousValue`: its pre-read also needs a path `:id`. The service
 * knows both sides, so the service writes them.
 */
describe('ApprovalConfigurationService — the policy change log', () => {
  let service: ApprovalConfigurationService;
  let policiesService: jest.Mocked<WorkflowPoliciesService>;
  let definitionsService: jest.Mocked<WorkflowDefinitionsService>;
  let stepsService: jest.Mocked<WorkflowStepsService>;
  let instancesService: jest.Mocked<WorkflowInstancesService>;
  let auditLogsService: jest.Mocked<AuditLogsService>;

  const definitionId = new Types.ObjectId();
  const approverId = new Types.ObjectId().toString();

  const actor: AuthenticatedUser = {
    userId: new Types.ObjectId().toString(),
    roleIds: [],
    permissions: [{ resourceType: 'workflowPolicies', action: 'Update' }],
  };

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
    auditLogsService = module.get(AuditLogsService);

    definitionsService.findByEntityType.mockResolvedValue({
      _id: definitionId,
      entityType: 'articles',
      isActive: true,
    } as never);
    definitionsService.create.mockResolvedValue({ _id: definitionId } as never);
    stepsService.findByDefinition.mockResolvedValue([] as never);
    stepsService.replaceForDefinition.mockResolvedValue(undefined as never);
    policiesService.upsert.mockResolvedValue({ _id: new Types.ObjectId() } as never);
    instancesService.countOpenForDefinition.mockResolvedValue(0 as never);
    instancesService.findOpenForDefinition.mockResolvedValue([] as never);
    instancesService.countUnapprovedForEntityType.mockResolvedValue(0 as never);
    instancesService.findUnapprovedForEntityType.mockResolvedValue([] as never);
    auditLogsService.write.mockResolvedValue({} as never);
  });

  /** A policy that currently requires no review. */
  const currentlyOff = () => {
    policiesService.findByEntityTypeAndOperation.mockResolvedValue({
      workflowRequired: false,
      workflowDefinitionId: null,
    } as never);
  };

  /** A policy that currently requires a review by one named approver. */
  const currentlyOn = () => {
    policiesService.findByEntityTypeAndOperation.mockResolvedValue({
      workflowRequired: true,
      workflowDefinitionId: definitionId,
    } as never);
    stepsService.findByDefinition.mockResolvedValue([
      {
        _id: new Types.ObjectId(),
        assigneeIds: [new Types.ObjectId(approverId)],
        requiredApprovals: 1,
        sequenceOrder: 1,
      },
    ] as never);
  };

  // Chapter 17 §7: "a vague or generic access log MUST NOT be considered
  // sufficient". This route writes its own row, so the interceptor's
  // `extractRequestContext` never runs for it and the context has to be threaded
  // through — otherwise the platform's most governance-sensitive write records
  // who and when but not from where.
  it('records where the change came from', async () => {
    currentlyOff();

    await service.configure('articles', { enabled: false }, actor, {
      ipAddress: '10.0.0.7',
      userAgent: 'Firefox',
    });

    expect(auditLogsService.write).toHaveBeenCalledWith(
      expect.objectContaining({ ipAddress: '10.0.0.7', userAgent: 'Firefox' }),
    );
  });

  it('records who changed it, against the workflowPolicies entity type', async () => {
    currentlyOff();

    await service.configure(
      'articles',
      { enabled: true, mode: 'THRESHOLD', approverIds: [approverId], threshold: 1 },
      actor,
    );

    expect(auditLogsService.write).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: new Types.ObjectId(actor.userId),
        action: 'StatusChange',
        entityType: 'workflowPolicies',
      }),
    );
  });

  /**
   * The stored policy is read twice — once before the write and once after — so
   * the mock has to answer differently across the two, the way the collection
   * does. A single static value would make `previousValue` and `newValue`
   * identical and the test would pass while proving nothing.
   */
  const policyReadsAs = (...states: { workflowRequired: boolean }[]) => {
    for (const state of states) {
      policiesService.findByEntityTypeAndOperation.mockResolvedValueOnce({
        ...state,
        workflowDefinitionId: state.workflowRequired ? definitionId : null,
      } as never);
    }
  };

  it('records the arrangement before and after turning approvals on', async () => {
    policyReadsAs({ workflowRequired: false }, { workflowRequired: true });

    await service.configure(
      'articles',
      { enabled: true, mode: 'THRESHOLD', approverIds: [approverId], threshold: 1 },
      actor,
    );

    expect(auditLogsService.write).toHaveBeenCalledWith(
      expect.objectContaining({
        previousValue: expect.objectContaining({ enabled: false }),
        newValue: expect.objectContaining({ enabled: true }),
      }),
    );
  });

  it('records what it was when approvals are turned off', async () => {
    currentlyOn();
    policyReadsAs({ workflowRequired: true }, { workflowRequired: false });

    await service.configure('articles', { enabled: false }, actor);

    expect(auditLogsService.write).toHaveBeenCalledWith(
      expect.objectContaining({
        previousValue: expect.objectContaining({ enabled: true }),
        newValue: expect.objectContaining({ enabled: false }),
      }),
    );
  });

  it('names the entity type whose policy changed, inside the values', async () => {
    currentlyOff();

    await service.configure('articles', { enabled: false }, actor);

    expect(auditLogsService.write).toHaveBeenCalledWith(
      expect.objectContaining({
        newValue: expect.objectContaining({ entityType: 'articles' }),
      }),
    );
  });

  // A refusal changed nothing, so there is nothing to record. An audit row for a
  // rejected attempt would read as a change that happened.
  it('writes no row when the change was refused', async () => {
    currentlyOn();
    instancesService.countUnapprovedForEntityType.mockResolvedValue(3 as never);
    instancesService.findUnapprovedForEntityType.mockResolvedValue([
      { entityId: new Types.ObjectId(), currentStepId: new Types.ObjectId() },
    ] as never);

    await expect(service.configure('articles', { enabled: false }, actor)).rejects.toBeDefined();

    expect(auditLogsService.write).not.toHaveBeenCalled();
  });
});
