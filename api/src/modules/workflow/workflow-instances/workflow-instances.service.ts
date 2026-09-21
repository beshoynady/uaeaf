import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { WorkflowInstancesRepository } from './workflow-instances.repository.js';
import type { WorkflowInstanceDocument } from './schemas/workflow-instance.schema.js';
import { WorkflowStepsService } from '../workflow-steps/workflow-steps.service.js';
import type { WorkflowStepDocument } from '../workflow-steps/schemas/workflow-step.schema.js';
import { WorkflowActionHistoryService } from '../workflow-action-history/workflow-action-history.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { RevisionsService } from '../revisions/revisions.service.js';
import { WorkflowDefinitionsService } from '../workflow-definitions/workflow-definitions.service.js';
import { PUBLICATION_ENTITY_TYPES } from '../../../common/constants/workflow-entity-types.js';
import type { WorkflowEntityType, PublicationEntityType } from '../../../common/constants/workflow-entity-types.js';

/**
 * Delegation is switched off. It adds the delegate to the step's
 * `assigneeIds`, and a step belongs to the definition rather than to one
 * instance, so a single delegation would let the delegate approve every
 * instance of that definition, now and later (OUT-02 and fix F7 in
 * docs/engineering/reviews/workflow-integrity-review.md).
 */
const DELEGATION_ENABLED = false;

/** `contactMessages` is the one workflow-participation (List A) entity
 *  type excluded from the revision/publication list (List B) — see
 *  `common/constants/workflow-entity-types.ts`. */
const isPublicationEligible = (entityType: WorkflowEntityType): entityType is PublicationEntityType => {
  return (PUBLICATION_ENTITY_TYPES as readonly string[]).includes(entityType);
};

/** Whether `step` is one of the steps of the definition `instance` runs on. */
const isStepOf = (step: WorkflowStepDocument, instance: WorkflowInstanceDocument): boolean => {
  return step.workflowDefinitionId.equals(instance.workflowDefinitionId as Types.ObjectId);
};

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateWorkflowInstanceInput {
  workflowDefinitionId: Types.ObjectId;
  entityType: WorkflowEntityType;
  entityId: Types.ObjectId;
  revisionId: Types.ObjectId;
  actorId: string;
}

/**
 * Implements: workflowInstances collection, Domain 7 (FigJam node
 * `100:7512`) — the core of the workflow engine. Owns: concurrency control
 * (§4), self-approval via `assigneeIds` (§9), Rejected-vs-Returned semantics
 * (§2), and dual `workflowActionHistory` + `auditLogs` logging on every
 * action (§11).
 *
 * It does NOT publish. A review that ends in approval leaves the instance at
 * `Approved` and stops; putting that revision on the site is a separate act,
 * held behind a separate permission, in `PublishingService.publishApproved`
 * (owner decision 2026-09-20). This class therefore has no dependency on
 * `PublicationsService` at all — the absence is the guarantee.
 *
 * `previousValue`/`newValue` on the `auditLogs` `StatusChange` entries this
 * service writes describe the *workflow's own* conceptual state
 * (`workflowStatus`) rather than any entity's `publicationState`, which
 * nothing here changes.
 */
@Injectable()
export class WorkflowInstancesService {
  constructor(
    private readonly repository: WorkflowInstancesRepository,
    private readonly stepsService: WorkflowStepsService,
    private readonly actionHistoryService: WorkflowActionHistoryService,
    private readonly auditLogsService: AuditLogsService,
    private readonly revisionsService: RevisionsService,
    private readonly definitionsService: WorkflowDefinitionsService,
  ) {}

  /** @throws ConflictException when an active instance already exists for
   *  (entityType, entityId) — at most one active instance per entity
   *  (BE-PLAN-010 Week 2 §4).
   *  @throws from `assertCanSubmitThrough` and `assertRevisionOf`. */
  async create(input: CreateWorkflowInstanceInput, context: RequestContext = {}): Promise<WorkflowInstanceDocument> {
    await this.assertCanSubmitThrough(input.workflowDefinitionId, input.entityType);
    await this.assertRevisionOf(input.revisionId, input.entityType, input.entityId);
    const [active, firstStep] = await Promise.all([
      this.repository.findActive(input.entityType, input.entityId),
      this.stepsService.findFirst(input.workflowDefinitionId),
    ]);
    if (active) {
      throw new ConflictException(
        `An active workflow instance already exists for ${input.entityType} ${input.entityId.toString()}.`,
      );
    }
    if (!firstStep) {
      throw new ConflictException('This workflow definition has no steps.');
    }

    const created = await this.repository.create({
      workflowDefinitionId: input.workflowDefinitionId,
      entityType: input.entityType,
      entityId: input.entityId,
      revisionId: input.revisionId,
      currentStepId: firstStep._id as Types.ObjectId,
      status: 'InProgress',
      startedAt: new Date(),
    });

    const actorObjectId = new Types.ObjectId(input.actorId);
    await this.actionHistoryService.record({
      workflowInstanceId: created._id as Types.ObjectId,
      workflowStepId: firstStep._id as Types.ObjectId,
      actorId: actorObjectId,
      action: 'Submitted',
      revisionId: input.revisionId,
    });

    await this.writeStatusChangeAudit({
      entityType: input.entityType,
      entityId: input.entityId,
      actorId: actorObjectId,
      previousValue: null,
      newValue: { workflowStatus: 'InProgress' },
      reason: 'Workflow submitted',
      context,
    });

    return created;
  }

  /** @throws ConflictException when the instance is not InProgress.
   *  @throws ForbiddenException when the actor is not among the current
   *  step's `assigneeIds` — the only self-approval gate (BE-PLAN-010 Week
   *  2 §9); no author-field comparison exists or is performed. */
  async approve(id: string, actorId: string, reason?: string, context: RequestContext = {}): Promise<WorkflowInstanceDocument | null> {
    const instance = await this.loadInProgress(id);
    await this.assertStillGoverned(instance);
    const currentStep = await this.loadAssignedStep(instance, actorId);
    const actorObjectId = new Types.ObjectId(actorId);

    await this.actionHistoryService.record({
      workflowInstanceId: new Types.ObjectId(id),
      workflowStepId: currentStep._id as Types.ObjectId,
      actorId: actorObjectId,
      action: 'Approved',
      revisionId: instance.revisionId as Types.ObjectId,
      reason,
    });

    const approvals = await this.actionHistoryService.countDistinctApprovers(
      new Types.ObjectId(id),
      currentStep._id as Types.ObjectId,
    );

    if (approvals < currentStep.requiredApprovals) {
      // Threshold not yet met (a Parallel step awaiting more approvers) —
      // instance stays InProgress at the same step.
      const updated = await this.repository.updateById(id, {
        currentStepId: currentStep._id,
        status: 'InProgress',
      });
      await this.writeStatusChangeAudit({
        entityType: instance.entityType,
        entityId: instance.entityId,
        actorId: actorObjectId,
        previousValue: { workflowStatus: 'InProgress' },
        newValue: { workflowStatus: 'InProgress', approvalsSoFar: approvals },
        reason: reason ?? 'Step approval recorded',
        context,
      });
      return updated;
    }

    const nextStep = await this.stepsService.findNext(instance.workflowDefinitionId as Types.ObjectId, currentStep.sequenceOrder);

    if (nextStep) {
      const updated = await this.repository.updateById(id, {
        currentStepId: nextStep._id,
        status: 'InProgress',
      });
      await this.writeStatusChangeAudit({
        entityType: instance.entityType,
        entityId: instance.entityId,
        actorId: actorObjectId,
        previousValue: { workflowStatus: 'InProgress' },
        newValue: { workflowStatus: 'InProgress' },
        reason: reason ?? 'Step approved, advanced to next step',
        context,
      });
      return updated;
    }

    // Final step approved. The instance reaches `Approved` and stops there.
    //
    // Until the owner's 2026-09-20 decision this call published, which made
    // approving and publishing one event: nobody could approve a text and then
    // choose the hour it went live, and a policy could not require approval
    // without also handing the publish decision to whoever happened to approve
    // last. Publishing now reads this Approved instance back —
    // `PublishingService.publishApproved` — so the two are separately
    // permissioned, separately audited, and separately refusable.
    const updated = await this.repository.updateById(id, { status: 'Approved', currentStepId: null });

    await this.writeStatusChangeAudit({
      entityType: instance.entityType,
      entityId: instance.entityId,
      actorId: actorObjectId,
      previousValue: { workflowStatus: 'InProgress' },
      newValue: { workflowStatus: 'Approved' },
      reason: reason ?? 'Final step approved',
      context,
    });
    return updated;
  }

  /** Rejected keeps the same instance — it does not spawn a new one; the
   *  author may resubmit into it (BE-PLAN-010 Week 2 §2). */
  async reject(
    id: string,
    actorId: string,
    reason: string,
    context: RequestContext = {},
    /** The reviewer is asking for changes, not refusing the item. Recorded,
     *  not acted on: the engine's behaviour is identical either way. */
    revisionRequested = false,
  ): Promise<WorkflowInstanceDocument | null> {
    const instance = await this.loadInProgress(id);
    await this.assertStillGoverned(instance);
    const currentStep = await this.loadAssignedStep(instance, actorId);
    const actorObjectId = new Types.ObjectId(actorId);

    await this.actionHistoryService.record({
      workflowInstanceId: new Types.ObjectId(id),
      workflowStepId: currentStep._id as Types.ObjectId,
      actorId: actorObjectId,
      action: 'Rejected',
      revisionId: instance.revisionId as Types.ObjectId,
      reason,
      revisionRequested,
    });

    const updated = await this.repository.updateById(id, { status: 'Rejected' });

    await this.writeStatusChangeAudit({
      entityType: instance.entityType,
      entityId: instance.entityId,
      actorId: actorObjectId,
      previousValue: { workflowStatus: 'InProgress' },
      newValue: { workflowStatus: 'Rejected', revisionRequested },
      reason,
      context,
    });

    return updated;
  }

  /** Returned sends the instance back to a specific *earlier* step of its own
   *  definition for revision — same instance continues (BE-PLAN-010 Week 2
   *  §2).
   *  @throws BadRequestException when `returnedToStepId` belongs to another
   *  definition: that step's assignees would decide content their workflow
   *  never named them for.
   *  @throws ConflictException when `returnedToStepId` is not earlier
   *  (lower `sequenceOrder`) than the current step. */
  async return(
    id: string,
    actorId: string,
    returnedToStepId: string,
    reason: string,
    context: RequestContext = {},
  ): Promise<WorkflowInstanceDocument | null> {
    const instance = await this.loadInProgress(id);
    await this.assertStillGoverned(instance);
    const [currentStep, targetStep] = await Promise.all([
      this.loadAssignedStep(instance, actorId),
      this.stepsService.findById(returnedToStepId),
    ]);
    if (!targetStep) {
      throw new NotFoundException(`Step ${returnedToStepId} not found.`);
    }
    if (!isStepOf(targetStep, instance)) {
      throw new BadRequestException('returnedToStepId must be a step of this instance\'s workflow definition.');
    }
    if (targetStep.sequenceOrder >= currentStep.sequenceOrder) {
      throw new ConflictException('returnedToStepId must be an earlier step than the current one.');
    }

    const actorObjectId = new Types.ObjectId(actorId);
    await this.actionHistoryService.record({
      workflowInstanceId: new Types.ObjectId(id),
      workflowStepId: currentStep._id as Types.ObjectId,
      actorId: actorObjectId,
      action: 'Returned',
      revisionId: instance.revisionId as Types.ObjectId,
      returnedToStepId: targetStep._id as Types.ObjectId,
      reason,
    });

    const updated = await this.repository.updateById(id, {
      status: 'Returned',
      currentStepId: targetStep._id,
    });

    await this.writeStatusChangeAudit({
      entityType: instance.entityType,
      entityId: instance.entityId,
      actorId: actorObjectId,
      previousValue: { workflowStatus: 'InProgress' },
      newValue: { workflowStatus: 'Returned' },
      reason,
      context,
    });

    return updated;
  }

  /** Resubmission after Rejected restarts at the first step (a full
   *  re-review); after Returned it resumes at the step it was returned to
   *  (already `currentStepId`) — BE-PLAN-010 Week 2 §2.
   *  @throws ConflictException unless the instance is Rejected or
   *  Returned.
   *  @throws NotFoundException / BadRequestException from `assertRevisionOf`. */
  async resubmit(
    id: string,
    actorId: string,
    newRevisionId: string,
    context: RequestContext = {},
  ): Promise<WorkflowInstanceDocument | null> {
    const instance = await this.repository.findById(id);
    if (!instance) {
      throw new NotFoundException(`Workflow instance ${id} not found.`);
    }
    if (instance.status !== 'Rejected' && instance.status !== 'Returned') {
      throw new ConflictException('Only a Rejected or Returned instance can be resubmitted.');
    }
    await this.assertStillGoverned(instance);
    const revisionObjectId = new Types.ObjectId(newRevisionId);
    await this.assertRevisionOf(revisionObjectId, instance.entityType, instance.entityId);

    const targetStep =
      instance.status === 'Rejected'
        ? await this.stepsService.findFirst(instance.workflowDefinitionId as Types.ObjectId)
        : await this.stepsService.findById((instance.currentStepId as Types.ObjectId).toString());
    if (!targetStep) {
      throw new ConflictException('This workflow definition has no steps.');
    }
    if (!isStepOf(targetStep, instance)) {
      throw new ConflictException('The step this instance resumes at belongs to another workflow definition.');
    }

    const actorObjectId = new Types.ObjectId(actorId);
    const previousStatus = instance.status;

    await this.actionHistoryService.record({
      workflowInstanceId: new Types.ObjectId(id),
      workflowStepId: targetStep._id as Types.ObjectId,
      actorId: actorObjectId,
      action: 'Resubmitted',
      revisionId: revisionObjectId,
    });

    const updated = await this.repository.updateById(id, {
      status: 'InProgress',
      currentStepId: targetStep._id,
      revisionId: revisionObjectId,
    });

    await this.writeStatusChangeAudit({
      entityType: instance.entityType,
      entityId: instance.entityId,
      actorId: actorObjectId,
      previousValue: { workflowStatus: previousStatus },
      newValue: { workflowStatus: 'InProgress' },
      reason: 'Resubmitted',
      context,
    });

    return updated;
  }

  /** Delegation adds the delegate to the current step's `assigneeIds` so
   *  they may also act on it — a reasonable, minimal reading of
   *  `action='Delegated'`; not itself detailed by any of the Week 2
   *  confirmed design decisions (§1-§12).
   *  @throws ForbiddenException while `DELEGATION_ENABLED` is false. */
  async delegate(
    id: string,
    actorId: string,
    delegatedToUserId: string,
    reason?: string,
    context: RequestContext = {},
  ): Promise<WorkflowInstanceDocument> {
    if (!DELEGATION_ENABLED) {
      throw new ForbiddenException(
        'Delegation is temporarily disabled: it would let the delegate approve every instance of this workflow definition, not only this one.',
      );
    }
    const instance = await this.loadInProgress(id);
    await this.assertStillGoverned(instance);
    const currentStep = await this.loadAssignedStep(instance, actorId);
    const delegateObjectId = new Types.ObjectId(delegatedToUserId);
    const actorObjectId = new Types.ObjectId(actorId);

    await this.actionHistoryService.record({
      workflowInstanceId: new Types.ObjectId(id),
      workflowStepId: currentStep._id as Types.ObjectId,
      actorId: actorObjectId,
      action: 'Delegated',
      revisionId: instance.revisionId as Types.ObjectId,
      delegatedToUserId: delegateObjectId,
      reason,
    });

    const updatedStep = await this.stepsService.addAssignee(currentStep._id as Types.ObjectId, delegateObjectId);

    await this.writeStatusChangeAudit({
      entityType: instance.entityType,
      entityId: instance.entityId,
      actorId: actorObjectId,
      previousValue: { assigneeIds: currentStep.assigneeIds },
      newValue: { assigneeIds: updatedStep?.assigneeIds },
      reason: reason ?? 'Step delegated',
      context,
    });

    return instance;
  }

  /**
   * Cancels an active (non-terminal) instance. The live board's
   * `workflowInstances.status` enum has no `Cancelled` value — this method
   * represents cancellation via the same universal `archivedAt` soft-delete
   * field every collection already carries (BaseRepository.softDelete),
   * rather than a status value that does not exist on the schema. See the
   * Week 2 completion report for this flagged mapping.
   *
   * @throws ConflictException when the instance is already terminal
   * (`status='Approved'`).
   *
   * Unlike every other action it does not re-read the definition: cancelling
   * is the way out of an instance whose definition was retired, and such an
   * instance would otherwise block every new submission of its record.
   */
  async cancel(id: string, actorId: string, context: RequestContext = {}): Promise<WorkflowInstanceDocument | null> {
    const instance = await this.repository.findById(id);
    if (!instance) {
      throw new NotFoundException(`Workflow instance ${id} not found.`);
    }
    if (instance.status === 'Approved') {
      throw new ConflictException('An Approved workflow instance cannot be cancelled.');
    }

    const actorObjectId = new Types.ObjectId(actorId);
    const updated = await this.repository.softDelete(id, actorObjectId);

    await this.writeStatusChangeAudit({
      entityType: instance.entityType,
      entityId: instance.entityId,
      actorId: actorObjectId,
      previousValue: { workflowStatus: instance.status },
      newValue: { workflowStatus: 'Cancelled' },
      reason: 'Workflow instance cancelled',
      context,
    });

    return updated;
  }

  async findById(id: string): Promise<WorkflowInstanceDocument | null> {
    return this.repository.findById(id);
  }

  /** The review currently open on a record, if any — "active" meaning not
   *  archived and not yet Approved (Rejected/Returned are not terminal).
   *  Exposed for `PublishingService`, which must refuse a direct publish
   *  while one is running. */
  async findActive(
    entityType: WorkflowEntityType,
    entityId: Types.ObjectId,
  ): Promise<WorkflowInstanceDocument | null> {
    return this.repository.findActive(entityType, entityId);
  }

  /** Every review this record has been through, finished ones included.
   *  Exposed for `PublishingService`, whose status panel shows what has
   *  happened rather than only what may happen next. */
  async findByEntity(
    entityType: WorkflowEntityType,
    entityId: Types.ObjectId,
  ): Promise<WorkflowInstanceDocument[]> {
    return this.repository.findByEntity(entityType, entityId);
  }

  /**
   * The reviews waiting on THIS person, and nothing else.
   *
   * Two rules make the list theirs. The first is obvious: the current step has
   * to name them. The second is the one that is easy to miss — an approval
   * already given does not remove a parallel step that still needs others, so
   * without it the reviewer is invited back to press a button that does
   * nothing and changes nothing.
   *
   * Sequential rather than parallel over the instances: a federation has a
   * handful of reviews open at a time, and a burst of concurrent step reads
   * against a single-node database buys nothing worth the contention.
   */
  async findPendingFor(actorId: string): Promise<WorkflowInstanceDocument[]> {
    const running = await this.repository.findInProgress();
    const actorObjectId = new Types.ObjectId(actorId);
    const pending: WorkflowInstanceDocument[] = [];

    for (const instance of running) {
      const currentStepId = instance.currentStepId as Types.ObjectId | null;
      // No current step means no decision can land anywhere.
      if (!currentStepId) {
        continue;
      }

      const step = await this.stepsService.findById(currentStepId.toString());
      if (!step?.assigneeIds.some((assignee) => assignee.equals(actorObjectId))) {
        continue;
      }

      const decided = await this.actionHistoryService.hasApprovedInCurrentCycle(
        instance._id as Types.ObjectId,
        currentStepId,
        actorObjectId,
      );
      if (!decided) {
        pending.push(instance);
      }
    }

    return pending;
  }

  /**
   * How many reviews are running under a definition, for the one caller that
   * must not change its steps while any are.
   *
   * Exposed on the service rather than read from the repository directly so
   * that the rule about *which* statuses are stranded by a step change lives
   * in one place, beside the `resubmit` logic that determines it.
   */
  async countOpenForDefinition(definitionId: Types.ObjectId): Promise<number> {
    return this.repository.countOpenForDefinition(definitionId);
  }

  /**
   * How many records of a type sit at each review status.
   *
   * For the newsroom's own card row. Exposed here rather than read from the
   * repository by a screen's loader, so "one review per record however many
   * times it was resubmitted" is defined in one place.
   */
  async countRecordsByStatus(entityType: WorkflowEntityType): Promise<Record<string, number>> {
    return this.repository.countRecordsByStatus(entityType);
  }

  /** The approval standing on a record and waiting to be published, if there
   *  is one. Exposed for `PublishingService`, which is the only thing allowed
   *  to act on it — this class approves and stops. */
  async findLatestApproved(
    entityType: WorkflowEntityType,
    entityId: Types.ObjectId,
  ): Promise<WorkflowInstanceDocument | null> {
    return this.repository.findLatestApproved(entityType, entityId);
  }

  /**
   * Approval publishes the instance's revision as the record's public
   * content, so the revision must be one taken of this record: a revision of
   * any other record would put that record's text on this one's page.
   *
   * A contact message is never published and no revision can be taken of
   * one, so for it there is nothing to match.
   *
   * @throws NotFoundException when the revision does not exist.
   * @throws BadRequestException when it is a revision of another record.
   */
  private async assertRevisionOf(
    revisionId: Types.ObjectId,
    entityType: WorkflowEntityType,
    entityId: Types.ObjectId,
  ): Promise<void> {
    if (!isPublicationEligible(entityType)) {
      return;
    }
    const revision = await this.revisionsService.findById(revisionId.toString());
    if (!revision) {
      throw new NotFoundException(`Revision ${revisionId.toString()} not found.`);
    }
    if (revision.entityType !== entityType || !revision.entityId.equals(entityId)) {
      throw new BadRequestException(
        `Revision ${revisionId.toString()} is not a revision of ${entityType} ${entityId.toString()}.`,
      );
    }
  }

  private async loadInProgress(id: string): Promise<WorkflowInstanceDocument> {
    const instance = await this.repository.findById(id);
    if (!instance) {
      throw new NotFoundException(`Workflow instance ${id} not found.`);
    }
    if (instance.status !== 'InProgress') {
      throw new ConflictException(`Workflow instance ${id} is ${instance.status}, not InProgress.`);
    }
    return instance;
  }

  /**
   * The definition names who approves. A record submitted through one the
   * federation retired, or one written for another entity type, would be
   * approved by people its own workflow does not name.
   *
   * @throws NotFoundException when the definition does not exist or is archived.
   * @throws ConflictException when it is inactive.
   * @throws BadRequestException when it governs another entity type.
   */
  private async assertCanSubmitThrough(definitionId: Types.ObjectId, entityType: WorkflowEntityType): Promise<void> {
    const definition = await this.definitionsService.findById(definitionId.toString());
    if (!definition) {
      throw new NotFoundException(`Workflow definition ${definitionId.toString()} not found.`);
    }
    if (!definition.isActive) {
      throw new ConflictException(`Workflow definition ${definitionId.toString()} is inactive.`);
    }
    if (definition.entityType !== entityType) {
      throw new BadRequestException(
        `Workflow definition ${definitionId.toString()} governs ${definition.entityType}, not ${entityType}.`,
      );
    }
  }

  /**
   * Every action after submission reads the definition again, so an instance
   * whose definition was retired or deactivated stops instead of finishing
   * under rules that no longer apply. The entity type is compared again for
   * instances submitted before submission checked it.
   *
   * @throws ConflictException when the definition is archived, inactive, or
   * governs another entity type.
   */
  private async assertStillGoverned(instance: WorkflowInstanceDocument): Promise<void> {
    const definitionId = (instance.workflowDefinitionId as Types.ObjectId).toString();
    const definition = await this.definitionsService.findById(definitionId);
    if (!definition || !definition.isActive || definition.entityType !== instance.entityType) {
      throw new ConflictException(
        `Workflow instance ${instance._id.toString()} cannot proceed: its workflow definition is archived, inactive, or governs another entity type. Cancel it and submit again.`,
      );
    }
  }

  private async loadAssignedStep(instance: WorkflowInstanceDocument, actorId: string): Promise<WorkflowStepDocument> {
    const currentStep = await this.stepsService.findById((instance.currentStepId as Types.ObjectId).toString());
    if (!currentStep) {
      throw new NotFoundException('The current step no longer exists.');
    }
    if (!isStepOf(currentStep, instance)) {
      throw new ConflictException('The current step belongs to another workflow definition.');
    }
    const isAssigned = currentStep.assigneeIds.some((assigneeId) => assigneeId.toString() === actorId);
    if (!isAssigned) {
      throw new ForbiddenException('You are not assigned to the current step of this workflow instance.');
    }
    return currentStep;
  }

  private async writeStatusChangeAudit(input: {
    entityType: WorkflowEntityType;
    entityId: Types.ObjectId;
    actorId: Types.ObjectId;
    previousValue: Record<string, unknown> | null;
    newValue: Record<string, unknown>;
    reason: string;
    context: RequestContext;
  }): Promise<void> {
    await this.auditLogsService.write({
      actorId: input.actorId,
      action: 'StatusChange',
      entityType: input.entityType,
      entityId: input.entityId,
      previousValue: input.previousValue,
      newValue: input.newValue,
      reason: input.reason,
      ipAddress: input.context.ipAddress ?? '',
      userAgent: input.context.userAgent ?? '',
    });
  }
}
