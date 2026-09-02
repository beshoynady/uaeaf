import { jest } from '@jest/globals';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { WorkflowInstancesService } from './workflow-instances.service.js';
import { WorkflowInstancesRepository } from './workflow-instances.repository.js';
import { WorkflowStepsService } from '../workflow-steps/workflow-steps.service.js';
import { WorkflowActionHistoryService } from '../workflow-action-history/workflow-action-history.service.js';
import { PublicationsService } from '../publications/publications.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

describe('WorkflowInstancesService', () => {
  const entityType = 'articles' as const;
  const entityId = new Types.ObjectId();
  const workflowDefinitionId = new Types.ObjectId();
  const revisionId = new Types.ObjectId();
  const instanceId = new Types.ObjectId().toString();
  const actorId = new Types.ObjectId().toString();
  const assignedActorObjectId = new Types.ObjectId(actorId);
  const stepAId = new Types.ObjectId(); // sequenceOrder 0
  const stepBId = new Types.ObjectId(); // sequenceOrder 1 (final)

  const makeDeps = () => {
    const repository = {
      findActive: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      updateById: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<WorkflowInstancesRepository>;
    const stepsService = {
      findFirst: jest.fn(),
      findNext: jest.fn(),
      findById: jest.fn(),
      addAssignee: jest.fn(),
    } as unknown as jest.Mocked<WorkflowStepsService>;
    const actionHistoryService = {
      record: jest.fn(),
      countDistinctApprovers: jest.fn(),
    } as unknown as jest.Mocked<WorkflowActionHistoryService>;
    const publicationsService = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<PublicationsService>;
    const auditLogsService = {
      write: jest.fn(),
    } as unknown as jest.Mocked<AuditLogsService>;

    return { repository, stepsService, actionHistoryService, publicationsService, auditLogsService };
  };

  const makeService = (deps: ReturnType<typeof makeDeps>) =>
    new WorkflowInstancesService(
      deps.repository,
      deps.stepsService,
      deps.actionHistoryService,
      deps.publicationsService,
      deps.auditLogsService,
    );

  describe('create (submit)', () => {
    it('rejects when an active instance already exists for (entityType, entityId)', async () => {
      const deps = makeDeps();
      deps.repository.findActive.mockResolvedValue({ _id: new Types.ObjectId() } as never);
      const service = makeService(deps);

      await expect(
        service.create({ workflowDefinitionId, entityType, entityId, revisionId, actorId }),
      ).rejects.toThrow(ConflictException);
      expect(deps.repository.create).not.toHaveBeenCalled();
    });

    it('creates the instance at the first step and records a Submitted action when none is active', async () => {
      const deps = makeDeps();
      deps.repository.findActive.mockResolvedValue(null);
      deps.stepsService.findFirst.mockResolvedValue({ _id: stepAId, sequenceOrder: 0 } as never);
      const created = { _id: new Types.ObjectId(), status: 'InProgress', currentStepId: stepAId };
      deps.repository.create.mockResolvedValue(created as never);
      const service = makeService(deps);

      const result = await service.create({ workflowDefinitionId, entityType, entityId, revisionId, actorId });

      expect(deps.repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'InProgress', currentStepId: stepAId, revisionId }),
      );
      expect(deps.actionHistoryService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'Submitted', workflowStepId: stepAId }),
      );
      expect(deps.auditLogsService.write).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'StatusChange', entityType, entityId }),
      );
      expect(result).toBe(created);
    });
  });

  describe('approve', () => {
    const inProgressInstance = () => ({
      _id: instanceId,
      workflowDefinitionId,
      entityType,
      entityId,
      revisionId,
      currentStepId: stepAId,
      status: 'InProgress',
    });

    it('denies approval when the actor is not in the current step\'s assigneeIds', async () => {
      const deps = makeDeps();
      deps.repository.findById.mockResolvedValue(inProgressInstance() as never);
      deps.stepsService.findById.mockResolvedValue({
        _id: stepAId,
        sequenceOrder: 0,
        assigneeIds: [new Types.ObjectId()],
        requiredApprovals: 1,
      } as never);
      const service = makeService(deps);

      await expect(service.approve(instanceId, actorId)).rejects.toThrow(ForbiddenException);
      expect(deps.actionHistoryService.record).not.toHaveBeenCalled();
    });

    it('allows approval when the actor IS in the current step\'s assigneeIds, self-submission or not', async () => {
      const deps = makeDeps();
      deps.repository.findById.mockResolvedValue(inProgressInstance() as never);
      deps.stepsService.findById.mockResolvedValue({
        _id: stepAId,
        sequenceOrder: 0,
        assigneeIds: [assignedActorObjectId],
        requiredApprovals: 1,
      } as never);
      deps.actionHistoryService.countDistinctApprovers.mockResolvedValue(1);
      deps.stepsService.findNext.mockResolvedValue(null);
      deps.repository.updateById.mockResolvedValue({ status: 'Approved' } as never);
      const service = makeService(deps);

      await service.approve(instanceId, actorId);

      expect(deps.actionHistoryService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'Approved', workflowStepId: stepAId }),
      );
    });

    it('rejects approving an instance that is not InProgress', async () => {
      const deps = makeDeps();
      deps.repository.findById.mockResolvedValue({ ...inProgressInstance(), status: 'Rejected' } as never);
      const service = makeService(deps);

      await expect(service.approve(instanceId, actorId)).rejects.toThrow(ConflictException);
    });

    it('advances currentStepId to the next step without finishing, when a next step exists', async () => {
      const deps = makeDeps();
      deps.repository.findById.mockResolvedValue(inProgressInstance() as never);
      deps.stepsService.findById.mockResolvedValue({
        _id: stepAId,
        sequenceOrder: 0,
        assigneeIds: [assignedActorObjectId],
        requiredApprovals: 1,
      } as never);
      deps.actionHistoryService.countDistinctApprovers.mockResolvedValue(1);
      deps.stepsService.findNext.mockResolvedValue({ _id: stepBId, sequenceOrder: 1 } as never);
      deps.repository.updateById.mockResolvedValue({ status: 'InProgress', currentStepId: stepBId } as never);
      const service = makeService(deps);

      await service.approve(instanceId, actorId);

      expect(deps.repository.updateById).toHaveBeenCalledWith(
        instanceId,
        expect.objectContaining({ currentStepId: stepBId, status: 'InProgress' }),
      );
      expect(deps.publicationsService.publish).not.toHaveBeenCalled();
    });

    it('does not advance a Parallel step until requiredApprovals is met', async () => {
      const deps = makeDeps();
      deps.repository.findById.mockResolvedValue(inProgressInstance() as never);
      deps.stepsService.findById.mockResolvedValue({
        _id: stepAId,
        sequenceOrder: 0,
        stepType: 'Parallel',
        assigneeIds: [assignedActorObjectId, new Types.ObjectId(), new Types.ObjectId()],
        requiredApprovals: 2,
      } as never);
      deps.actionHistoryService.countDistinctApprovers.mockResolvedValue(1); // only this approval so far
      deps.repository.updateById.mockResolvedValue({ status: 'InProgress', currentStepId: stepAId } as never);
      const service = makeService(deps);

      await service.approve(instanceId, actorId);

      expect(deps.stepsService.findNext).not.toHaveBeenCalled();
      expect(deps.repository.updateById).toHaveBeenCalledWith(
        instanceId,
        expect.objectContaining({ currentStepId: stepAId, status: 'InProgress' }),
      );
    });

    it('finishes the instance and publishes when the final step reaches its approval threshold', async () => {
      const deps = makeDeps();
      deps.repository.findById.mockResolvedValue({ ...inProgressInstance(), currentStepId: stepBId } as never);
      deps.stepsService.findById.mockResolvedValue({
        _id: stepBId,
        sequenceOrder: 1,
        assigneeIds: [assignedActorObjectId],
        requiredApprovals: 1,
      } as never);
      deps.actionHistoryService.countDistinctApprovers.mockResolvedValue(1);
      deps.stepsService.findNext.mockResolvedValue(null); // stepB is last
      deps.repository.updateById.mockResolvedValue({ status: 'Approved', currentStepId: null } as never);
      const service = makeService(deps);

      await service.approve(instanceId, actorId);

      expect(deps.repository.updateById).toHaveBeenCalledWith(
        instanceId,
        expect.objectContaining({ status: 'Approved', currentStepId: null }),
      );
      expect(deps.publicationsService.publish).toHaveBeenCalledWith(
        expect.objectContaining({ entityType, entityId, revisionId, workflowInstanceId: new Types.ObjectId(instanceId) }),
      );
    });

    it('finishes a contactMessages instance as Approved WITHOUT publishing — contactMessages has no publications lifecycle', async () => {
      const deps = makeDeps();
      deps.repository.findById.mockResolvedValue({
        ...inProgressInstance(),
        entityType: 'contactMessages',
        currentStepId: stepBId,
      } as never);
      deps.stepsService.findById.mockResolvedValue({
        _id: stepBId,
        sequenceOrder: 1,
        assigneeIds: [assignedActorObjectId],
        requiredApprovals: 1,
      } as never);
      deps.actionHistoryService.countDistinctApprovers.mockResolvedValue(1);
      deps.stepsService.findNext.mockResolvedValue(null);
      deps.repository.updateById.mockResolvedValue({ status: 'Approved', currentStepId: null } as never);
      const service = makeService(deps);

      await service.approve(instanceId, actorId);

      expect(deps.repository.updateById).toHaveBeenCalledWith(
        instanceId,
        expect.objectContaining({ status: 'Approved', currentStepId: null }),
      );
      expect(deps.publicationsService.publish).not.toHaveBeenCalled();
    });
  });

  describe('reject', () => {
    it('keeps the same instance (does not spawn a new one) and records the reason permanently', async () => {
      const deps = makeDeps();
      deps.repository.findById.mockResolvedValue({
        _id: instanceId,
        entityType,
        entityId,
        revisionId,
        currentStepId: stepAId,
        status: 'InProgress',
      } as never);
      deps.stepsService.findById.mockResolvedValue({
        _id: stepAId,
        assigneeIds: [assignedActorObjectId],
      } as never);
      deps.repository.updateById.mockResolvedValue({ status: 'Rejected' } as never);
      const service = makeService(deps);

      await service.reject(instanceId, actorId, 'Needs more detail');

      expect(deps.repository.updateById).toHaveBeenCalledWith(instanceId, { status: 'Rejected' });
      expect(deps.actionHistoryService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'Rejected', reason: 'Needs more detail' }),
      );
    });
  });

  describe('return', () => {
    it('rejects returning to a step that is not earlier than the current one', async () => {
      const deps = makeDeps();
      deps.repository.findById.mockResolvedValue({
        _id: instanceId,
        workflowDefinitionId,
        entityType,
        entityId,
        revisionId,
        currentStepId: stepAId,
        status: 'InProgress',
      } as never);
      const stepsById: Record<string, unknown> = {
        [stepAId.toString()]: { _id: stepAId, sequenceOrder: 0, assigneeIds: [assignedActorObjectId] },
        [stepBId.toString()]: { _id: stepBId, sequenceOrder: 1, workflowDefinitionId },
      };
      deps.stepsService.findById.mockImplementation((id: unknown) => Promise.resolve(stepsById[id as string] as never));
      const service = makeService(deps);

      await expect(service.return(instanceId, actorId, stepBId.toString(), 'go back')).rejects.toThrow(
        ConflictException,
      );
    });

    it('moves currentStepId back to the earlier step and marks the instance Returned', async () => {
      const deps = makeDeps();
      deps.repository.findById.mockResolvedValue({
        _id: instanceId,
        workflowDefinitionId,
        entityType,
        entityId,
        revisionId,
        currentStepId: stepBId,
        status: 'InProgress',
      } as never);
      const stepsById: Record<string, unknown> = {
        [stepBId.toString()]: { _id: stepBId, sequenceOrder: 1, assigneeIds: [assignedActorObjectId] },
        [stepAId.toString()]: { _id: stepAId, sequenceOrder: 0, workflowDefinitionId },
      };
      deps.stepsService.findById.mockImplementation((id: unknown) => Promise.resolve(stepsById[id as string] as never));
      deps.repository.updateById.mockResolvedValue({ status: 'Returned', currentStepId: stepAId } as never);
      const service = makeService(deps);

      await service.return(instanceId, actorId, stepAId.toString(), 'please revise the intro');

      expect(deps.repository.updateById).toHaveBeenCalledWith(
        instanceId,
        expect.objectContaining({ status: 'Returned', currentStepId: stepAId }),
      );
      expect(deps.actionHistoryService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'Returned', returnedToStepId: stepAId }),
      );
    });
  });

  describe('resubmit', () => {
    it('restarts at the first step when resubmitting after Rejected', async () => {
      const deps = makeDeps();
      deps.repository.findById.mockResolvedValue({
        _id: instanceId,
        workflowDefinitionId,
        entityType,
        entityId,
        currentStepId: stepBId,
        status: 'Rejected',
      } as never);
      deps.stepsService.findFirst.mockResolvedValue({ _id: stepAId, sequenceOrder: 0 } as never);
      const newRevisionId = new Types.ObjectId();
      deps.repository.updateById.mockResolvedValue({ status: 'InProgress', currentStepId: stepAId } as never);
      const service = makeService(deps);

      await service.resubmit(instanceId, actorId, newRevisionId.toString());

      expect(deps.repository.updateById).toHaveBeenCalledWith(
        instanceId,
        expect.objectContaining({ status: 'InProgress', currentStepId: stepAId, revisionId: newRevisionId }),
      );
    });

    it('resumes at the already-returned-to step when resubmitting after Returned', async () => {
      const deps = makeDeps();
      deps.repository.findById.mockResolvedValue({
        _id: instanceId,
        workflowDefinitionId,
        entityType,
        entityId,
        currentStepId: stepAId,
        status: 'Returned',
      } as never);
      deps.stepsService.findById.mockResolvedValue({ _id: stepAId, sequenceOrder: 0 } as never);
      const newRevisionId = new Types.ObjectId();
      deps.repository.updateById.mockResolvedValue({ status: 'InProgress', currentStepId: stepAId } as never);
      const service = makeService(deps);

      await service.resubmit(instanceId, actorId, newRevisionId.toString());

      expect(deps.stepsService.findFirst).not.toHaveBeenCalled();
      expect(deps.repository.updateById).toHaveBeenCalledWith(
        instanceId,
        expect.objectContaining({ status: 'InProgress', currentStepId: stepAId, revisionId: newRevisionId }),
      );
    });

    it('rejects resubmitting an instance that is InProgress', async () => {
      const deps = makeDeps();
      deps.repository.findById.mockResolvedValue({ _id: instanceId, status: 'InProgress' } as never);
      const service = makeService(deps);

      await expect(service.resubmit(instanceId, actorId, new Types.ObjectId().toString())).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('delegate', () => {
    it('adds the delegate to the current step\'s assigneeIds and records a Delegated action', async () => {
      const deps = makeDeps();
      deps.repository.findById.mockResolvedValue({
        _id: instanceId,
        entityType,
        entityId,
        revisionId,
        currentStepId: stepAId,
        status: 'InProgress',
      } as never);
      deps.stepsService.findById.mockResolvedValue({
        _id: stepAId,
        assigneeIds: [assignedActorObjectId],
      } as never);
      const delegatedToUserId = new Types.ObjectId().toString();
      const service = makeService(deps);

      await service.delegate(instanceId, actorId, delegatedToUserId, 'covering for me');

      expect(deps.stepsService.addAssignee).toHaveBeenCalledWith(stepAId, new Types.ObjectId(delegatedToUserId));
      expect(deps.actionHistoryService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'Delegated', delegatedToUserId: new Types.ObjectId(delegatedToUserId) }),
      );
    });
  });

  describe('cancel', () => {
    it('soft-deletes an active (non-Approved) instance', async () => {
      const deps = makeDeps();
      deps.repository.findById.mockResolvedValue({
        _id: instanceId,
        entityType,
        entityId,
        status: 'Returned',
      } as never);
      deps.repository.softDelete.mockResolvedValue({ status: 'Returned', archivedAt: new Date() } as never);
      const service = makeService(deps);

      await service.cancel(instanceId, actorId);

      expect(deps.repository.softDelete).toHaveBeenCalledWith(instanceId, new Types.ObjectId(actorId));
    });

    it('rejects cancelling an already-Approved (terminal) instance', async () => {
      const deps = makeDeps();
      deps.repository.findById.mockResolvedValue({ _id: instanceId, status: 'Approved' } as never);
      const service = makeService(deps);

      await expect(service.cancel(instanceId, actorId)).rejects.toThrow(ConflictException);
      expect(deps.repository.softDelete).not.toHaveBeenCalled();
    });
  });
});
