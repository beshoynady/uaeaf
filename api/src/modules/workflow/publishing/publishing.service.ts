import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Connection } from 'mongoose';
import { WorkflowPoliciesService } from '../workflow-policies/workflow-policies.service.js';
import { WorkflowInstancesService } from '../workflow-instances/workflow-instances.service.js';
import { WorkflowStepsService } from '../workflow-steps/workflow-steps.service.js';
import { RevisionsService } from '../revisions/revisions.service.js';
import { PublicationsService } from '../publications/publications.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { findPendingContent } from './pending-content.js';
import { EDITORIAL_ACTIONS } from './editorial-state.dto.js';
import type { EditorialAction, EditorialStateDto } from './editorial-state.dto.js';
import type { RequestContext } from '../workflow-instances/workflow-instances.service.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import type { PublicationEntityType } from '../../../common/constants/workflow-entity-types.js';

/**
 * The one place that decides how content reaches the public site
 * (ADR-0069 D4/D5).
 *
 * Before this, `workflowPolicies` was read by nothing (audit finding
 * OUT-07) and the client chose its own `workflowDefinitionId` when opening
 * a review (OUT-04). Both are decided here now, from the policy, on the
 * server.
 *
 * It is deliberately entity-agnostic: it takes an `entityType` rather than
 * belonging to one module, because the same four questions — is a review
 * required, may this person publish, is one already running, has the record
 * moved — have the same answers for every workflow-governed entity.
 */
@Injectable()
export class PublishingService {
  constructor(
    private readonly policiesService: WorkflowPoliciesService,
    private readonly instancesService: WorkflowInstancesService,
    private readonly stepsService: WorkflowStepsService,
    private readonly revisionsService: RevisionsService,
    private readonly publicationsService: PublicationsService,
    private readonly auditLogsService: AuditLogsService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /**
   * Publishes the current draft immediately, with no review.
   *
   * Every refusal below prevents the task, so each carries its own error
   * code: the dashboard shows them as a persistent alert, and "nobody has
   * configured this yet" and "someone edited this while you were reading
   * it" need different words for different people (ADR-0016).
   *
   * @throws ForbiddenException without `<entityType>:Publish`.
   * @throws ConflictException when the policy requires approvals, a review
   *   is already running, the record moved, or content is still pending.
   */
  async publishDirect(input: {
    entityType: PublicationEntityType;
    entityId: Types.ObjectId;
    actor: AuthenticatedUser;
    expectedUpdatedAt: Date;
    context?: RequestContext;
  }): Promise<{ revisionId: string; publicationId: string; publishedAt: string }> {
    const { entityType, entityId, actor, expectedUpdatedAt } = input;

    if (!this.hasPermission(actor, entityType, 'Publish')) {
      throw new ForbiddenException({
        code: 'forbidden',
        message: `Missing permission: Publish on ${entityType}.`,
      });
    }

    const resolved = await this.policiesService.resolve(entityType, 'Edit');

    if (resolved.mode === 'workflow') {
      throw new ConflictException({
        code: 'workflowRequired',
        message: `${entityType} must go through an approval workflow. Submit it for review instead of publishing it.`,
      });
    }

    if (resolved.mode === 'blocked') {
      throw new ConflictException({
        code: 'publishingPolicyMissing',
        message: this.blockedMessage(entityType, resolved.reason),
      });
    }

    const active = await this.instancesService.findActive(entityType, entityId);
    if (active) {
      throw new ConflictException({
        code: 'activeWorkflowExists',
        message: 'A review of this record is already in progress. Finish or cancel it before publishing directly.',
      });
    }

    const record = await this.loadRecord(entityType, entityId);

    // Read before the revision is frozen: publishing a record someone else
    // edited after this editor last read it publishes an edit nobody chose
    // to publish.
    const actualUpdatedAt = record.updatedAt instanceof Date ? record.updatedAt : null;
    if (!actualUpdatedAt || actualUpdatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      throw new ConflictException({
        code: 'staleRecord',
        message: 'This record changed after it was opened. Reload it, read the change, then publish.',
      });
    }

    const pending = findPendingContent(record);
    if (pending.length > 0) {
      throw new ConflictException({
        code: 'pendingContent',
        message: `Content is still marked as awaiting the client: ${pending.join(', ')}.`,
      });
    }

    const actorId = new Types.ObjectId(actor.userId);

    // The snapshot is built by the server from the stored record — the
    // caller never supplies content, so what is published is what was read.
    const revision = await this.revisionsService.create({ entityType, entityId, createdBy: actorId });

    const publication = await this.publicationsService.publish({
      entityType,
      entityId,
      revisionId: revision._id as Types.ObjectId,
      // No instance: this publication was authorised by a permission, not
      // by an approval. Leaving the link null is what records that.
      workflowInstanceId: null,
      publishedBy: actorId,
    });

    await this.auditLogsService.write({
      actorId,
      action: 'StatusChange',
      entityType,
      entityId,
      previousValue: { publicationState: record.publicationState ?? null },
      newValue: { publicationState: 'Live', revisionId: revision._id?.toString() },
      reason: 'Published directly under a policy that does not require approvals',
      ipAddress: input.context?.ipAddress ?? '',
      userAgent: input.context?.userAgent ?? '',
    });

    return {
      revisionId: (revision._id as Types.ObjectId).toString(),
      publicationId: (publication._id as Types.ObjectId).toString(),
      publishedAt: publication.publishedAt.toISOString(),
    };
  }

  /**
   * Opens a review on the current draft.
   *
   * The definition comes from the policy, never from the caller — which is
   * what closes audit finding OUT-04 for this entity type. A client that
   * could name its own definition could name the one-step definition
   * instead of the three-step one.
   */
  async submit(input: {
    entityType: PublicationEntityType;
    entityId: Types.ObjectId;
    actor: AuthenticatedUser;
    context?: RequestContext;
  }): Promise<{ workflowInstanceId: string; revisionId: string }> {
    const { entityType, entityId, actor } = input;
    const resolved = await this.policiesService.resolve(entityType, 'Edit');

    if (resolved.mode === 'blocked') {
      throw new ConflictException({
        code: 'publishingPolicyMissing',
        message: this.blockedMessage(entityType, resolved.reason),
      });
    }

    if (resolved.mode === 'direct') {
      throw new ConflictException({
        code: 'conflict',
        message: `${entityType} does not require approvals. Publish it directly instead of submitting it.`,
      });
    }

    const active = await this.instancesService.findActive(entityType, entityId);
    if (active) {
      throw new ConflictException({
        code: 'activeWorkflowExists',
        message: 'A review of this record is already in progress.',
      });
    }

    const record = await this.loadRecord(entityType, entityId);
    const pending = findPendingContent(record);
    if (pending.length > 0) {
      throw new ConflictException({
        code: 'pendingContent',
        message: `Content is still marked as awaiting the client: ${pending.join(', ')}.`,
      });
    }

    const actorId = new Types.ObjectId(actor.userId);
    const revision = await this.revisionsService.create({ entityType, entityId, createdBy: actorId });

    const instance = await this.instancesService.create(
      {
        workflowDefinitionId: resolved.workflowDefinitionId as Types.ObjectId,
        entityType,
        entityId,
        revisionId: revision._id as Types.ObjectId,
        actorId: actor.userId,
      },
      input.context ?? {},
    );

    return {
      workflowInstanceId: (instance._id as Types.ObjectId).toString(),
      revisionId: (revision._id as Types.ObjectId).toString(),
    };
  }

  /**
   * Whether this caller may edit the draft right now — Mechanism 2 of the
   * approved permissions design.
   *
   * While a review is in progress the draft belongs to that review: only an
   * assignee of the current step may change it. Otherwise an author could
   * edit the text out from under the person reading it, and the approval
   * would attach to content nobody approved.
   */
  async canEdit(
    entityType: PublicationEntityType,
    entityId: Types.ObjectId,
    actor: AuthenticatedUser,
  ): Promise<boolean> {
    const active = await this.instancesService.findActive(entityType, entityId);

    if (!active || active.status !== 'InProgress' || !active.currentStepId) {
      return true;
    }

    const step = await this.stepsService.findById(active.currentStepId.toString());
    if (!step) {
      return true;
    }

    return step.assigneeIds.some((assignee) => assignee.toString() === actor.userId);
  }

  /** @throws ForbiddenException when `canEdit` is false. */
  async assertCanEdit(
    entityType: PublicationEntityType,
    entityId: Types.ObjectId,
    actor: AuthenticatedUser,
  ): Promise<void> {
    if (await this.canEdit(entityType, entityId, actor)) {
      return;
    }
    throw new ForbiddenException({
      code: 'underReview',
      message: 'This record is under review. Only the reviewer handling the current step can change it now.',
    });
  }

  /**
   * Copies a past revision's snapshot back over the draft.
   *
   * It publishes nothing. A restored version re-enters the ordinary path —
   * submit or publish — so a restore can never put content on the site
   * without passing whatever gate the policy names.
   */
  async restore(input: {
    entityType: PublicationEntityType;
    entityId: Types.ObjectId;
    revisionId: string;
    actor: AuthenticatedUser;
    context?: RequestContext;
  }): Promise<{ restoredFromVersion: number }> {
    const { entityType, entityId, actor } = input;
    await this.assertCanEdit(entityType, entityId, actor);

    const revision = await this.revisionsService.findById(input.revisionId);
    if (!revision || revision.entityType !== entityType || !revision.entityId.equals(entityId)) {
      throw new NotFoundException('That revision does not belong to this record.');
    }

    const model = this.modelFor(entityType);
    const actorId = new Types.ObjectId(actor.userId);

    // `_id` and the audit trail are not content and must not be restored —
    // writing the snapshot's `_id` back would be a no-op at best and a
    // mismatch at worst.
    const { _id, createdAt, updatedAt, ...content } = revision.snapshotData as Record<string, unknown>;
    void _id;
    void createdAt;
    void updatedAt;

    await model
      .updateOne({ _id: entityId, archivedAt: null }, { $set: { ...content, updatedBy: actorId } })
      .exec();

    await this.auditLogsService.write({
      actorId,
      action: 'StatusChange',
      entityType,
      entityId,
      previousValue: null,
      newValue: { restoredFromVersion: revision.versionNumber },
      reason: `Draft restored from version ${revision.versionNumber}`,
      ipAddress: input.context?.ipAddress ?? '',
      userAgent: input.context?.userAgent ?? '',
    });

    return { restoredFromVersion: revision.versionNumber };
  }

  /** Everything the dashboard's status panel needs, in one read. */
  async editorialState(
    entityType: PublicationEntityType,
    entityId: Types.ObjectId,
    actor: AuthenticatedUser,
  ): Promise<EditorialStateDto> {
    const [record, resolved, active, live] = await Promise.all([
      this.loadRecord(entityType, entityId),
      this.policiesService.resolve(entityType, 'Edit'),
      this.instancesService.findActive(entityType, entityId),
      this.publicationsService.findLive(entityType, entityId),
    ]);

    const canEdit = await this.canEdit(entityType, entityId, actor);
    const pendingContent = findPendingContent(record);
    const canPublish = this.hasPermission(actor, entityType, 'Publish');
    const canUpdate = this.hasPermission(actor, entityType, 'Update');
    const canApprove = this.hasPermission(actor, entityType, 'Approve');

    const actions = new Set<EditorialAction>();
    if (canEdit && canUpdate) {
      actions.add('save');
    }

    const publishable = pendingContent.length === 0;

    if (!active && publishable) {
      if (resolved.mode === 'direct' && canPublish) {
        actions.add('publish');
      }
      if (resolved.mode === 'workflow' && canUpdate) {
        actions.add('submit');
      }
    }

    if (active && publishable) {
      if (active.status === 'InProgress' && canApprove) {
        actions.add('approve');
        actions.add('reject');
        actions.add('return');
      }
      if ((active.status === 'Rejected' || active.status === 'Returned') && canUpdate) {
        actions.add('resubmit');
      }
    }

    return {
      publicationState: String(record.publicationState ?? 'Draft'),
      mode: resolved.mode,
      blockedReason: resolved.reason,
      publishedAt: live?.publishedAt ? live.publishedAt.toISOString() : null,
      workflowInstanceId: active ? (active._id as Types.ObjectId).toString() : null,
      workflowStatus: active?.status ?? null,
      currentStepId: active?.currentStepId ? active.currentStepId.toString() : null,
      canEdit,
      availableActions: EDITORIAL_ACTIONS.filter((action) => actions.has(action)),
      updatedAt: record.updatedAt instanceof Date ? record.updatedAt.toISOString() : null,
      pendingContent,
    };
  }

  private hasPermission(
    actor: AuthenticatedUser,
    resourceType: string,
    action: string,
  ): boolean {
    return actor.permissions.some(
      (permission) => permission.resourceType === resourceType && permission.action === action,
    );
  }

  private blockedMessage(entityType: string, reason: string | null): string {
    switch (reason) {
      case 'noPolicy':
        return `No publishing policy is configured for ${entityType}. An administrator must set one before anything can be published.`;
      case 'definitionMissing':
        return `The ${entityType} policy requires approvals but names no usable workflow. An administrator must fix it.`;
      case 'definitionInactive':
        return `The workflow the ${entityType} policy names is inactive. An administrator must activate it or name another.`;
      case 'definitionForeignType':
        return `The workflow the ${entityType} policy names governs a different entity type. An administrator must fix it.`;
      default:
        return `Publishing ${entityType} is not configured.`;
    }
  }

  /** The model registered for the entity type's collection — each entity
   *  type is also its collection's name, so no second list is needed. */
  private modelFor(entityType: PublicationEntityType) {
    const model = Object.values(this.connection.models).find(
      (candidate) => candidate.collection.collectionName === entityType,
    );
    if (!model) {
      throw new BadRequestException(`${entityType} has no collection yet.`);
    }
    return model;
  }

  private async loadRecord(
    entityType: PublicationEntityType,
    entityId: Types.ObjectId,
  ): Promise<Record<string, unknown>> {
    const record = await this.modelFor(entityType)
      .findOne({ _id: entityId, archivedAt: null })
      .lean<Record<string, unknown>>()
      .exec();

    if (!record) {
      throw new NotFoundException(`${entityType} ${entityId.toString()} does not exist or is archived.`);
    }

    return record;
  }
}
