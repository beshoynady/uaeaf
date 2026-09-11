import { jest } from '@jest/globals';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { WorkflowInstancesService } from './workflow-instances.service.js';
import { WorkflowInstancesRepository } from './workflow-instances.repository.js';
import { WorkflowStepsService } from '../workflow-steps/workflow-steps.service.js';
import { WorkflowActionHistoryService } from '../workflow-action-history/workflow-action-history.service.js';
import { PublicationsService } from '../publications/publications.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { RevisionsService } from '../revisions/revisions.service.js';
import { WorkflowDefinitionsService } from '../workflow-definitions/workflow-definitions.service.js';

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

  /** A revision as the revisions collection holds it. */
  const revisionOf = (id: Types.ObjectId, ofType: string, ofId: Types.ObjectId) => ({
    _id: id,
    entityType: ofType,
    entityId: ofId,
    versionNumber: 1,
    snapshotData: {},
    createdBy: new Types.ObjectId(),
    createdAt: new Date(),
  });

  /** A definition as the workflowDefinitions collection holds it. */
  const definitionOf = (id: Types.ObjectId, ofType: string, isActive = true) => ({
    _id: id,
    name: { en: 'Review', ar: 'مراجعة' },
    entityType: ofType,
    isActive,
    archivedAt: null,
  });

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
    // The revisions that exist, by id. `revisionId` is a revision of the
    // record every scenario works on.
    const revisions = new Map([[revisionId.toString(), revisionOf(revisionId, entityType, entityId)]]);
    const revisionsService = {
      findById: jest.fn(async (id: string) => revisions.get(id) ?? null),
    } as unknown as jest.Mocked<RevisionsService>;
    // The definitions that exist and are not archived, by id —
    // `workflowDefinitionId` is an active definition for `entityType`.
    const definitions = new Map([[workflowDefinitionId.toString(), definitionOf(workflowDefinitionId, entityType)]]);
    const definitionsService = {
      findById: jest.fn(async (id: string) => definitions.get(id) ?? null),
    } as unknown as jest.Mocked<WorkflowDefinitionsService>;

    return {
      repository,
      stepsService,
      actionHistoryService,
      publicationsService,
      auditLogsService,
      revisionsService,
      revisions,
      definitionsService,
      definitions,
    };
  };

  const makeService = (deps: ReturnType<typeof makeDeps>) =>
    new WorkflowInstancesService(
      deps.repository,
      deps.stepsService,
      deps.actionHistoryService,
      deps.publicationsService,
      deps.auditLogsService,
      deps.revisionsService,
      deps.definitionsService,
    );

  /** Stores a revision of the named record and returns its id. */
  const storeRevision = (deps: ReturnType<typeof makeDeps>, ofType: string, ofId: Types.ObjectId) => {
    const id = new Types.ObjectId();
    deps.revisions.set(id.toString(), revisionOf(id, ofType, ofId));
    return id;
  };

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
      deps.stepsService.findFirst.mockResolvedValue({ _id: stepAId, workflowDefinitionId, sequenceOrder: 0 } as never);
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

    /**
     * Approval publishes the instance's revision as the record's public
     * content, so a revision of any other record would put that record's
     * text on this one's page.
     */
    it.each([
      { owner: 'another record of the same type', ofType: entityType as string, ofId: new Types.ObjectId() },
      { owner: 'the same id under another type', ofType: 'committees', ofId: entityId },
    ])('refuses a revision of $owner', async ({ ofType, ofId }) => {
      const deps = makeDeps();
      deps.repository.findActive.mockResolvedValue(null);
      deps.stepsService.findFirst.mockResolvedValue({ _id: stepAId, workflowDefinitionId, sequenceOrder: 0 } as never);
      const foreignRevisionId = storeRevision(deps, ofType, ofId);
      const service = makeService(deps);

      await expect(
        service.create({ workflowDefinitionId, entityType, entityId, revisionId: foreignRevisionId, actorId }),
      ).rejects.toThrow(BadRequestException);
      expect(deps.repository.create).not.toHaveBeenCalled();
    });

    it('refuses a revision that does not exist', async () => {
      const deps = makeDeps();
      deps.repository.findActive.mockResolvedValue(null);
      deps.stepsService.findFirst.mockResolvedValue({ _id: stepAId, workflowDefinitionId, sequenceOrder: 0 } as never);
      const service = makeService(deps);

      await expect(
        service.create({ workflowDefinitionId, entityType, entityId, revisionId: new Types.ObjectId(), actorId }),
      ).rejects.toThrow(NotFoundException);
      expect(deps.repository.create).not.toHaveBeenCalled();
    });

    it('submits a contact message without a revision to match — nothing of it is ever published', async () => {
      const deps = makeDeps();
      deps.repository.findActive.mockResolvedValue(null);
      deps.stepsService.findFirst.mockResolvedValue({ _id: stepAId, workflowDefinitionId, sequenceOrder: 0 } as never);
      const created = { _id: new Types.ObjectId(), status: 'InProgress', currentStepId: stepAId };
      deps.repository.create.mockResolvedValue(created as never);
      const contactDefinitionId = new Types.ObjectId();
      deps.definitions.set(contactDefinitionId.toString(), definitionOf(contactDefinitionId, 'contactMessages'));
      const service = makeService(deps);

      const result = await service.create({
        workflowDefinitionId: contactDefinitionId,
        entityType: 'contactMessages',
        entityId,
        revisionId: new Types.ObjectId(),
        actorId,
      });

      expect(result).toBe(created);
    });

    /**
     * The definition names who approves. A record submitted through a
     * definition the federation retired, or through one written for another
     * entity type, would be approved by people its own workflow does not name.
     */
    /** Everything but the definition is ready, so the definition is the only
     *  thing that can refuse the submission. */
    const readyToSubmit = () => {
      const deps = makeDeps();
      deps.repository.findActive.mockResolvedValue(null);
      deps.stepsService.findFirst.mockResolvedValue({ _id: stepAId, workflowDefinitionId, sequenceOrder: 0 } as never);
      deps.repository.create.mockResolvedValue({ _id: new Types.ObjectId(), status: 'InProgress' } as never);
      return deps;
    };

    it('refuses a definition that does not exist or is archived', async () => {
      const deps = readyToSubmit();
      deps.definitions.delete(workflowDefinitionId.toString());
      const service = makeService(deps);

      await expect(
        service.create({ workflowDefinitionId, entityType, entityId, revisionId, actorId }),
      ).rejects.toThrow(NotFoundException);
      expect(deps.repository.create).not.toHaveBeenCalled();
    });

    it('refuses an inactive definition', async () => {
      const deps = readyToSubmit();
      deps.definitions.set(workflowDefinitionId.toString(), definitionOf(workflowDefinitionId, entityType, false));
      const service = makeService(deps);

      await expect(
        service.create({ workflowDefinitionId, entityType, entityId, revisionId, actorId }),
      ).rejects.toThrow(ConflictException);
      expect(deps.repository.create).not.toHaveBeenCalled();
    });

    it('refuses a definition written for another entity type', async () => {
      const deps = readyToSubmit();
      deps.definitions.set(workflowDefinitionId.toString(), definitionOf(workflowDefinitionId, 'committees'));
      const service = makeService(deps);

      await expect(
        service.create({ workflowDefinitionId, entityType, entityId, revisionId, actorId }),
      ).rejects.toThrow(BadRequestException);
      expect(deps.repository.create).not.toHaveBeenCalled();
    });
  });

  /**
   * Every action after submission reads the definition again: an instance
   * whose definition was retired, deactivated, or never governed its entity
   * type stops, rather than finishing under rules that no longer apply.
   * Cancel is the exception — it is the way out of such an instance.
   */
  describe('actions after submission re-read the definition', () => {
    const atStepB = () => ({
      _id: instanceId,
      workflowDefinitionId,
      entityType,
      entityId,
      revisionId,
      currentStepId: stepBId,
      status: 'InProgress',
    });
    const returnedToStepA = () => ({ ...atStepB(), currentStepId: stepAId, status: 'Returned' });
    const ownSteps: Record<string, unknown> = {
      [stepAId.toString()]: {
        _id: stepAId,
        workflowDefinitionId,
        sequenceOrder: 0,
        assigneeIds: [assignedActorObjectId],
        requiredApprovals: 1,
      },
      [stepBId.toString()]: {
        _id: stepBId,
        workflowDefinitionId,
        sequenceOrder: 1,
        assigneeIds: [assignedActorObjectId],
        requiredApprovals: 1,
      },
    };
    const prepare = (instance: object) => {
      const deps = makeDeps();
      deps.repository.findById.mockResolvedValue(instance as never);
      deps.stepsService.findById.mockImplementation((id: unknown) => Promise.resolve(ownSteps[id as string] as never));
      return deps;
    };

    it.each([
      { action: 'approve', instance: atStepB, run: (s: WorkflowInstancesService) => s.approve(instanceId, actorId) },
      { action: 'reject', instance: atStepB, run: (s: WorkflowInstancesService) => s.reject(instanceId, actorId, 'No') },
      {
        action: 'return',
        instance: atStepB,
        run: (s: WorkflowInstancesService) => s.return(instanceId, actorId, stepAId.toString(), 'Again'),
      },
      {
        action: 'resubmit',
        instance: returnedToStepA,
        run: (s: WorkflowInstancesService) => s.resubmit(instanceId, actorId, revisionId.toString()),
      },
    ])('refuses $action once the definition is inactive', async ({ instance, run }) => {
      const deps = prepare(instance());
      deps.definitions.set(workflowDefinitionId.toString(), definitionOf(workflowDefinitionId, entityType, false));

      await expect(run(makeService(deps))).rejects.toThrow(ConflictException);
      expect(deps.actionHistoryService.record).not.toHaveBeenCalled();
      expect(deps.repository.updateById).not.toHaveBeenCalled();
    });

    it.each([
      { problem: 'archived', change: (deps: ReturnType<typeof makeDeps>) => deps.definitions.delete(workflowDefinitionId.toString()) },
      {
        problem: 'written for another entity type',
        change: (deps: ReturnType<typeof makeDeps>) =>
          deps.definitions.set(workflowDefinitionId.toString(), definitionOf(workflowDefinitionId, 'committees')),
      },
    ])('refuses an approval once the definition is $problem', async ({ change }) => {
      const deps = prepare(atStepB());
      change(deps);

      await expect(makeService(deps).approve(instanceId, actorId)).rejects.toThrow(ConflictException);
      expect(deps.actionHistoryService.record).not.toHaveBeenCalled();
    });

    it('refuses to act on a current step that belongs to another definition', async () => {
      const deps = prepare(atStepB());
      deps.stepsService.findById.mockResolvedValue({
        _id: stepBId,
        workflowDefinitionId: new Types.ObjectId(),
        sequenceOrder: 1,
        assigneeIds: [assignedActorObjectId],
        requiredApprovals: 1,
      } as never);

      await expect(makeService(deps).approve(instanceId, actorId)).rejects.toThrow(ConflictException);
      expect(deps.actionHistoryService.record).not.toHaveBeenCalled();
    });

    it('refuses to return to a step of another definition', async () => {
      const deps = prepare(atStepB());
      const foreignStepId = new Types.ObjectId();
      deps.stepsService.findById.mockImplementation((id: unknown) =>
        Promise.resolve(
          (id === foreignStepId.toString()
            ? { _id: foreignStepId, workflowDefinitionId: new Types.ObjectId(), sequenceOrder: 0, assigneeIds: [] }
            : ownSteps[id as string]) as never,
        ),
      );

      await expect(makeService(deps).return(instanceId, actorId, foreignStepId.toString(), 'Elsewhere')).rejects.toThrow(
        BadRequestException,
      );
      expect(deps.actionHistoryService.record).not.toHaveBeenCalled();
    });

    it('refuses to resume at a step that belongs to another definition', async () => {
      const foreignStepId = new Types.ObjectId();
      const deps = prepare({ ...returnedToStepA(), currentStepId: foreignStepId });
      deps.stepsService.findById.mockResolvedValue({
        _id: foreignStepId,
        workflowDefinitionId: new Types.ObjectId(),
        sequenceOrder: 0,
        assigneeIds: [assignedActorObjectId],
        requiredApprovals: 1,
      } as never);

      await expect(makeService(deps).resubmit(instanceId, actorId, revisionId.toString())).rejects.toThrow(
        ConflictException,
      );
      expect(deps.repository.updateById).not.toHaveBeenCalled();
    });

    it('still cancels an instance whose definition is archived', async () => {
      const deps = prepare(returnedToStepA());
      deps.definitions.delete(workflowDefinitionId.toString());
      deps.repository.softDelete.mockResolvedValue({ status: 'Returned', archivedAt: new Date() } as never);

      await makeService(deps).cancel(instanceId, actorId);

      expect(deps.repository.softDelete).toHaveBeenCalledWith(instanceId, new Types.ObjectId(actorId));
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
        workflowDefinitionId,
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
        workflowDefinitionId,
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
        workflowDefinitionId,
        sequenceOrder: 0,
        assigneeIds: [assignedActorObjectId],
        requiredApprovals: 1,
      } as never);
      deps.actionHistoryService.countDistinctApprovers.mockResolvedValue(1);
      deps.stepsService.findNext.mockResolvedValue({ _id: stepBId, workflowDefinitionId, sequenceOrder: 1 } as never);
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
        workflowDefinitionId,
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
        workflowDefinitionId,
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
      deps.definitions.set(workflowDefinitionId.toString(), definitionOf(workflowDefinitionId, 'contactMessages'));
      deps.repository.findById.mockResolvedValue({
        ...inProgressInstance(),
        entityType: 'contactMessages',
        currentStepId: stepBId,
      } as never);
      deps.stepsService.findById.mockResolvedValue({
        _id: stepBId,
        workflowDefinitionId,
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
        workflowDefinitionId,
        entityType,
        entityId,
        revisionId,
        currentStepId: stepAId,
        status: 'InProgress',
      } as never);
      deps.stepsService.findById.mockResolvedValue({
        _id: stepAId,
        workflowDefinitionId,
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
        [stepAId.toString()]: { _id: stepAId, workflowDefinitionId, sequenceOrder: 0, assigneeIds: [assignedActorObjectId] },
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
        [stepBId.toString()]: { _id: stepBId, workflowDefinitionId, sequenceOrder: 1, assigneeIds: [assignedActorObjectId] },
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
      deps.stepsService.findFirst.mockResolvedValue({ _id: stepAId, workflowDefinitionId, sequenceOrder: 0 } as never);
      const newRevisionId = storeRevision(deps, entityType, entityId);
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
      deps.stepsService.findById.mockResolvedValue({ _id: stepAId, workflowDefinitionId, sequenceOrder: 0 } as never);
      const newRevisionId = storeRevision(deps, entityType, entityId);
      deps.repository.updateById.mockResolvedValue({ status: 'InProgress', currentStepId: stepAId } as never);
      const service = makeService(deps);

      await service.resubmit(instanceId, actorId, newRevisionId.toString());

      expect(deps.stepsService.findFirst).not.toHaveBeenCalled();
      expect(deps.repository.updateById).toHaveBeenCalledWith(
        instanceId,
        expect.objectContaining({ status: 'InProgress', currentStepId: stepAId, revisionId: newRevisionId }),
      );
    });

    // The instance still points at the revision it last carried, which is
    // this record's; only the new one is foreign.
    const rejectedInstance = () => ({
      _id: instanceId,
      workflowDefinitionId,
      entityType,
      entityId,
      revisionId,
      currentStepId: stepBId,
      status: 'Rejected',
    });

    it('refuses a revision of another record', async () => {
      const deps = makeDeps();
      deps.repository.findById.mockResolvedValue(rejectedInstance() as never);
      deps.stepsService.findFirst.mockResolvedValue({ _id: stepAId, workflowDefinitionId, sequenceOrder: 0 } as never);
      const foreignRevisionId = storeRevision(deps, entityType, new Types.ObjectId());
      const service = makeService(deps);

      await expect(service.resubmit(instanceId, actorId, foreignRevisionId.toString())).rejects.toThrow(
        BadRequestException,
      );
      expect(deps.repository.updateById).not.toHaveBeenCalled();
    });

    it('refuses a revision that does not exist', async () => {
      const deps = makeDeps();
      deps.repository.findById.mockResolvedValue(rejectedInstance() as never);
      deps.stepsService.findFirst.mockResolvedValue({ _id: stepAId, workflowDefinitionId, sequenceOrder: 0 } as never);
      const service = makeService(deps);

      await expect(service.resubmit(instanceId, actorId, new Types.ObjectId().toString())).rejects.toThrow(
        NotFoundException,
      );
      expect(deps.repository.updateById).not.toHaveBeenCalled();
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

  /**
   * Delegation is switched off: it adds the delegate to the step's
   * assigneeIds, and a step belongs to the definition, so one delegation would
   * let the delegate approve every instance of that definition.
   */
  describe('delegate', () => {
    // TODO(workflow-integrity-review F7, before 6 November): delegation
    // returns scoped to one instance. Replace this with tests of that
    // behaviour, including who counts toward the threshold (D-04).
    it('is refused while delegation is disabled, and changes no step', async () => {
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
      deps.stepsService.findById.mockResolvedValue({
        _id: stepAId,
        workflowDefinitionId,
        assigneeIds: [assignedActorObjectId],
      } as never);
      const service = makeService(deps);

      await expect(
        service.delegate(instanceId, actorId, new Types.ObjectId().toString(), 'covering for me'),
      ).rejects.toThrow(ForbiddenException);
      expect(deps.stepsService.addAssignee).not.toHaveBeenCalled();
      expect(deps.actionHistoryService.record).not.toHaveBeenCalled();
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
