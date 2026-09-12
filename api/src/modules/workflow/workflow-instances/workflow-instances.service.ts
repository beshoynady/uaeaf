import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { WorkflowInstancesRepository } from './workflow-instances.repository.js';
import type { WorkflowInstanceDocument } from './schemas/workflow-instance.schema.js';
import { WorkflowStepsService } from '../workflow-steps/workflow-steps.service.js';
import type { WorkflowStepDocument } from '../workflow-steps/schemas/workflow-step.schema.js';
import { WorkflowActionHistoryService } from '../workflow-action-history/workflow-action-history.service.js';
import { PublicationsService } from '../publications/publications.service.js';
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
function isPublicationEligible(entityType: WorkflowEntityType): entityType is PublicationEntityType {
  return (PUBLICATION_ENTITY_TYPES as readonly string[]).includes(entityType);
}

/** Whether `step` is one of the steps of the definition `instance` runs on. */
function isStepOf(step: WorkflowStepDocument, instance: WorkflowInstanceDocument): boolean {
  return step.workflowDefinitionId.equals(instance.workflowDefinitionId as Types.ObjectId);
}

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
 * `100:7512`) — the core of the Week 2 workflow engine. Owns: concurrency
 * control (§4), self-approval via `assigneeIds` (§9), Rejected-vs-Returned
 * semantics (§2), auto-publish on final-step approval (§5), and dual
 * `workflowActionHistory` + `auditLogs` logging on every action (§11).
 *
 * `previousValue`/`newValue` on the `auditLogs` `StatusChange` entries this
 * service writes describe the *workflow's own* conceptual state
 * (`workflowStatus`, and `publicationState` specifically on final
 * approval) rather than a real `{entity}.publicationState` field — no
 * target-entity Mongoose model (articles, committees, documents, ...)
 * exists in this codebase yet (Week 3/4 scope). See the Week 2 completion
 * report for this flagged scope boundary.
 */
@Injectable()
export class WorkflowInstancesService {
  constructor(
    private readonly repository: WorkflowInstancesRepository,
    private readonly stepsService: WorkflowStepsService,
    private readonly actionHistoryService: WorkflowActionHistoryService,
    private readonly publicationsService: PublicationsService,
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

    // Final step approved: the instance is Approved, and — per BE-PLAN-010
    // Week 2 §5 — this directly and automatically creates the
    // publications row. There is no separate "publish" step.
    //
    // `contactMessages` is the one List-A entity type structurally
    // excluded from `publications`/`revisions` (it has no
    // `publicationState` — "publishing" an inbound citizen message is
    // product-nonsensical, per the live board's own domain note). Its
    // workflow instances still resolve to `Approved`; they simply never
    // produce a `publications` row.
    const updated = await this.repository.updateById(id, { status: 'Approved', currentStepId: null });
    const entityType = instance.entityType;
    let published = false;
    if (isPublicationEligible(entityType)) {
      published = true;
      await this.publicationsService.publish({
        entityType,
        entityId: instance.entityId,
        revisionId: instance.revisionId as Types.ObjectId,
        workflowInstanceId: new Types.ObjectId(id),
        publishedBy: actorObjectId,
      });
    }
    await this.writeStatusChangeAudit({
      entityType,
      entityId: instance.entityId,
      actorId: actorObjectId,
      previousValue: { workflowStatus: 'InProgress', ...(published ? { publicationState: 'Draft' } : {}) },
      newValue: { workflowStatus: 'Approved', ...(published ? { publicationState: 'Live' } : {}) },
      reason: reason ?? (published ? 'Final step approved and published' : 'Final step approved'),
      context,
    });
    return updated;
  }

  /** Rejected keeps the same instance — it does not spawn a new one; the
   *  author may resubmit into it (BE-PLAN-010 Week 2 §2). */
  async reject(id: string, actorId: string, reason: string, context: RequestContext = {}): Promise<WorkflowInstanceDocument | null> {
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
    });

    const updated = await this.repository.updateById(id, { status: 'Rejected' });

    await this.writeStatusChangeAudit({
      entityType: instance.entityType,
      entityId: instance.entityId,
      actorId: actorObjectId,
      previousValue: { workflowStatus: 'InProgress' },
      newValue: { workflowStatus: 'Rejected' },
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
