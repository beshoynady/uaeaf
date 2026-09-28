import { jest } from '@jest/globals';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ApprovalConfigurationService } from './approval-configuration.service.js';
import { WorkflowPoliciesService } from './workflow-policies.service.js';
import { WorkflowDefinitionsService } from '../workflow-definitions/workflow-definitions.service.js';
import { WorkflowStepsService } from '../workflow-steps/workflow-steps.service.js';
import { WorkflowInstancesService } from '../workflow-instances/workflow-instances.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

/**
 * Turning approvals on for any entity type, from one screen.
 *
 * Before this, configuring a review meant creating a definition, then its
 * steps, then a policy pointing at it — three calls an administrator had to
 * get right in order, with no screen for any of them. That is why eleven of
 * the twelve governed types had no policy at all, and why publishing them
 * failed closed with a message about configuration nobody could act on.
 */
/** ADR-0107: the policy change records who made it. Module scope, so both
  *  describes below can use it — it was appended past the closing brace and
  *  worked only because every reference runs inside an it() callback. */
const actor = {
  userId: new Types.ObjectId().toString(),
  roleIds: [],
  permissions: [],
} as never;

describe('ApprovalConfigurationService', () => {
  const entityType = 'articles' as const;
  const definitionId = new Types.ObjectId();
  const [a, b, c] = [new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId()];
  const ids = [a, b, c].map(String);

  const makeDeps = (existingDefinition: unknown = null, openReviews = 0) => {
    const instancesService = {
      countOpenForDefinition: jest.fn(async () => openReviews),
      // ADR-0107 D1: the refusal names the pending records, not just how many.
      // The disable path is entity-type scoped and includes Rejected, because
      // that is what `findActive` matches — see the repository.
      countUnapprovedForEntityType: jest.fn(async () => openReviews),
      findUnapprovedForEntityType: jest.fn(async () =>
        Array.from({ length: openReviews }, () => ({
          entityId: new Types.ObjectId(),
          currentStepId: new Types.ObjectId(),
          status: 'InProgress',
        })),
      ),
      findOpenForDefinition: jest.fn(async () =>
        Array.from({ length: openReviews }, () => ({
          entityId: new Types.ObjectId(),
          currentStepId: new Types.ObjectId(),
        })),
      ),
    } as unknown as jest.Mocked<WorkflowInstancesService>;
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

    // ADR-0107: the service records every policy change itself. This spec is
    // about the arrangement rules, so the row is captured and not asserted —
    // `approval-configuration.audit.spec.ts` is where its contents are pinned.
    const auditLogsService = {
      write: jest.fn(async () => ({})),
    } as unknown as jest.Mocked<AuditLogsService>;

    return { definitionsService, stepsService, policiesService, instancesService, auditLogsService };
  };

  const makeService = (deps: ReturnType<typeof makeDeps>) =>
    new ApprovalConfigurationService(
      deps.policiesService,
      deps.definitionsService,
      deps.stepsService,
      deps.instancesService,
      deps.auditLogsService,
    );

  it('refuses an entity type the platform does not guard', async () => {
    const deps = makeDeps();

    // `PERMISSION_RESOURCES` is the closed list of things this platform has
    // permissions for. A policy for anything else is configuration that gates
    // no route — the "looks granted, guards nothing" failure that list exists
    // to prevent.
    await expect(
      makeService(deps).configure('notAThing', { enabled: true, mode: 'ALL', approverIds: ids }, actor),
    ).rejects.toThrow(BadRequestException);
    expect(deps.definitionsService.create).not.toHaveBeenCalled();
  });

  it('refuses an entity type that cannot be governed by a workflow', async () => {
    const deps = makeDeps();

    // `users` is a real permission resource and is not in the workflow entity
    // list: reviewing an account before it takes effect is not a thing this
    // engine does.
    await expect(
      makeService(deps).configure('users', { enabled: true, mode: 'ALL', approverIds: ids }, actor),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates the definition, its steps and the policy when enabling for the first time', async () => {
    const deps = makeDeps();

    await makeService(deps).configure(entityType, { enabled: true, mode: 'ALL', approverIds: ids }, actor);

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

    await makeService(deps).configure(entityType, { enabled: true, mode: 'THRESHOLD', approverIds: ids, threshold: 2 }, actor);

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

    await makeService(deps).configure(entityType, { enabled: true, mode: 'SEQUENTIAL', approverIds: ids }, actor);

    // The steps ARE the administrator's choice. Merging would leave an
    // approver nobody chose still able to hold up every publication.
    const [, steps] = deps.stepsService.replaceForDefinition.mock.calls[0] as [Types.ObjectId, unknown[]];
    expect(steps).toHaveLength(3);
  });


  describe('while reviews are running under this policy', () => {
    it('refuses to change who decides', async () => {
      const deps = makeDeps({ _id: definitionId, entityType, isActive: true }, 2);

      // Changing the approvers replaces the steps, and a replaced step is
      // archived — which is the step every running review points at. They
      // would match nobody's queue and could never be decided again: work
      // stranded by a settings change that reported success.
      await expect(
        makeService(deps).configure(entityType, { enabled: true, mode: 'ALL', approverIds: [String(a), String(b)] }, actor),
      ).rejects.toMatchObject({ response: { code: 'reviewsInFlight' } });
    });

    it('leaves the running reviews completely untouched when it refuses', async () => {
      const deps = makeDeps({ _id: definitionId, entityType, isActive: true }, 2);

      await expect(
        makeService(deps).configure(entityType, { enabled: true, mode: 'ALL', approverIds: [String(a), String(b)] }, actor),
      ).rejects.toThrow(ConflictException);

      // Nothing was archived, nothing was created, and the policy still names
      // the same definition. A refusal that half-applied would be worse than
      // the defect it prevents.
      expect(deps.stepsService.replaceForDefinition).not.toHaveBeenCalled();
      expect(deps.policiesService.upsert).not.toHaveBeenCalled();
    });

    it('says how many reviews are in the way', async () => {
      const deps = makeDeps({ _id: definitionId, entityType, isActive: true }, 3);

      await expect(
        makeService(deps).configure(entityType, { enabled: true, mode: 'ALL', approverIds: [String(a), String(b)] }, actor),
      ).rejects.toMatchObject({ response: { message: expect.stringContaining('3') } });
    });

    /**
     * Reversed by ADR-0107 (owner decision A7, 2026-09-26).
     *
     * This test previously asserted that disabling was allowed, on the reasoning
     * that it orphans no step. That reasoning was right about steps and wrong
     * about outcomes: disabling leaves every in-flight review unpublishable by
     * BOTH paths — `publishDirect` refuses because an active review exists, and
     * `publishApproved` refuses because the policy now resolves to `direct` and
     * says to publish directly. So the content was not orphaned, it was stranded,
     * and nothing on any screen said so.
     *
     * The old comment's worry — that a misconfigured policy becomes impossible to
     * turn off exactly when it matters — is answered by the refusal naming the
     * pending records, so the administrator can finish or cancel them
     * deliberately rather than stranding them silently.
     */
    it('refuses to switch approvals off while reviews are running', async () => {
      const deps = makeDeps({ _id: definitionId, entityType, isActive: true }, 2);

      await expect(
        makeService(deps).configure(entityType, { enabled: false }, actor),
      ).rejects.toMatchObject({ response: { code: 'reviewsInFlight', inFlightReviews: 2 } });
      expect(deps.policiesService.upsert).not.toHaveBeenCalled();
    });

    it('switches approvals off once nothing is running', async () => {
      const deps = makeDeps({ _id: definitionId, entityType, isActive: true }, 0);

      await expect(makeService(deps).configure(entityType, { enabled: false }, actor)).resolves.toBeDefined();
    });

    it('allows a save that changes nothing about the arrangement', async () => {
      const deps = makeDeps({ _id: definitionId, entityType, isActive: true }, 2);
      deps.stepsService.findByDefinition = jest.fn(async () => [
        { _id: new Types.ObjectId(), assigneeIds: [new Types.ObjectId(a)], requiredApprovals: 1 },
      ]) as never;

      // Re-saving the same people is a no-op. Refusing it would tell an
      // administrator their own unchanged settings are now illegal.
      await expect(
        makeService(deps).configure(entityType, { enabled: true, mode: 'ALL', approverIds: [String(a)] }, actor),
      ).resolves.toBeDefined();
      expect(deps.stepsService.replaceForDefinition).not.toHaveBeenCalled();
    });
  });

  it('changes the arrangement freely when nothing is running', async () => {
    const deps = makeDeps({ _id: definitionId, entityType, isActive: true }, 0);

    await makeService(deps).configure(entityType, { enabled: true, mode: 'ALL', approverIds: [String(a), String(b)] }, actor);

    expect(deps.stepsService.replaceForDefinition).toHaveBeenCalled();
  });

  /**
   * The order an administrator put the approvers in, kept.
   *
   * `buildSteps` already numbers a SEQUENTIAL arrangement from the array's own
   * order, and `findByDefinition` already reads steps back sorted by
   * `sequenceOrder`. What was missing was any test saying so — so the order was
   * a property of two implementations that happened to agree, which is exactly
   * the kind of agreement that stops holding.
   */
  describe('the order of a sequential arrangement', () => {
    const stepsSentTo = (deps: ReturnType<typeof makeDeps>) =>
      (deps.stepsService.replaceForDefinition.mock.calls[0] as unknown as [
        Types.ObjectId,
        { sequenceOrder: number; assigneeIds: Types.ObjectId[] }[],
      ])[1];

    it('numbers the steps in the order the approvers were listed', async () => {
      const deps = makeDeps();

      await makeService(deps).configure(entityType, {
        enabled: true,
        mode: 'SEQUENTIAL',
        approverIds: [String(c), String(a), String(b)],
      }, actor);

      // Not sorted, not de-ordered by a Set: C decides first because the
      // administrator put C first. Anything else silently reassigns who holds
      // the record up.
      expect(stepsSentTo(deps).map((step) => [step.sequenceOrder, String(step.assigneeIds[0])])).toEqual([
        [1, String(c)],
        [2, String(a)],
        [3, String(b)],
      ]);
    });

    it('treats a reordering as a real change to who decides', async () => {
      const deps = makeDeps({ _id: definitionId, entityType, isActive: true });
      deps.stepsService.findByDefinition = jest.fn(async () => [
        { _id: new Types.ObjectId(), assigneeIds: [a], requiredApprovals: 1 },
        { _id: new Types.ObjectId(), assigneeIds: [b], requiredApprovals: 1 },
      ]) as never;

      await makeService(deps).configure(entityType, {
        enabled: true,
        mode: 'SEQUENTIAL',
        approverIds: [String(b), String(a)],
      }, actor);

      // A→B and B→A name the same two people and are not the same
      // arrangement: one of them decides first, and which one is the whole
      // point of the mode. Read as unchanged, a reorder would write nothing.
      expect(deps.stepsService.replaceForDefinition).toHaveBeenCalled();
    });

    it('refuses a reordering while reviews are running under it', async () => {
      const deps = makeDeps({ _id: definitionId, entityType, isActive: true }, 2);
      deps.stepsService.findByDefinition = jest.fn(async () => [
        { _id: new Types.ObjectId(), assigneeIds: [a], requiredApprovals: 1 },
        { _id: new Types.ObjectId(), assigneeIds: [b], requiredApprovals: 1 },
      ]) as never;

      // The guard built on 2026-09-21 covers this without a line added: a
      // reorder replaces the steps, and a replaced step is the one a running
      // review is waiting at. This test exists because "it also covers the
      // order" was an assumption until it was asserted.
      await expect(
        makeService(deps).configure(entityType, {
          enabled: true,
          mode: 'SEQUENTIAL',
          approverIds: [String(b), String(a)],
        }, actor),
      ).rejects.toMatchObject({ response: { code: 'reviewsInFlight' } });
      expect(deps.stepsService.replaceForDefinition).not.toHaveBeenCalled();
    });

    it('reads the arrangement back in the order it was stored', async () => {
      const deps = makeDeps({ _id: definitionId, entityType, isActive: true });
      // As `findByDefinition` returns them: sorted by `sequenceOrder`.
      deps.stepsService.findByDefinition = jest.fn(async () => [
        { _id: new Types.ObjectId(), assigneeIds: [c], requiredApprovals: 1 },
        { _id: new Types.ObjectId(), assigneeIds: [a], requiredApprovals: 1 },
        { _id: new Types.ObjectId(), assigneeIds: [b], requiredApprovals: 1 },
      ]) as never;

      const described = await makeService(deps).configure(entityType, {
        enabled: true,
        mode: 'SEQUENTIAL',
        approverIds: [String(c), String(a), String(b)],
      }, actor);

      // The screen draws "1 → 2 → 3" from this list, so an unordered read
      // would show an order nobody chose over an engine that uses another.
      expect(described.approverIds).toEqual([String(c), String(a), String(b)]);
      expect(described.mode).toBe('SEQUENTIAL');
    });
  });

  it('refuses a threshold no set of approvers could ever meet', async () => {
    const deps = makeDeps();

    await expect(
      makeService(deps).configure(entityType, { enabled: true, mode: 'THRESHOLD', approverIds: ids, threshold: 5 }, actor),
    ).rejects.toThrow(ConflictException);
    expect(deps.stepsService.replaceForDefinition).not.toHaveBeenCalled();
  });

  it('turns approvals off without discarding who the approvers were', async () => {
    const deps = makeDeps({ _id: definitionId, entityType, isActive: true });

    await makeService(deps).configure(entityType, { enabled: false }, actor);

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

    await makeService(deps).configure(entityType, { enabled: false }, actor);

    expect(deps.definitionsService.create).not.toHaveBeenCalled();
    expect(deps.policiesService.upsert).toHaveBeenCalledWith(
      entityType,
      'Edit',
      expect.objectContaining({ workflowRequired: false, workflowDefinitionId: null }),
    );
  });
});

