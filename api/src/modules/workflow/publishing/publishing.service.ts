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
import { WorkflowDefinitionsService } from '../workflow-definitions/workflow-definitions.service.js';
import { WorkflowActionHistoryService } from '../workflow-action-history/workflow-action-history.service.js';
import { RevisionsService } from '../revisions/revisions.service.js';
import { PublicationsService } from '../publications/publications.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { UsersService } from '../../platform-administration/users/users.service.js';
import { describePublishBlockers, findPublishBlockers } from './publish-blockers.js';
import { EDITORIAL_ACTIONS } from './editorial-state.dto.js';
import { projectRevisionContent } from '../../../common/constants/entity-content.js';
import type {
  EditorialAction,
  EditorialHistoryEntryDto,
  EditorialStateDto,
  WorkflowSummaryDto,
} from './editorial-state.dto.js';
import type {
  RevisionActorDto,
  RevisionDetailDto,
  RevisionHistoryPageDto,
  RevisionSummaryDto,
} from './revision-history.dto.js';
import type { WorkflowActionHistoryDocument } from '../workflow-action-history/schemas/workflow-action-history.schema.js';
import type { WorkflowInstanceDocument } from '../workflow-instances/schemas/workflow-instance.schema.js';
import type { PublishingMode } from '../workflow-policies/workflow-policies.service.js';
import type { RevisionListRow } from '../revisions/revisions.repository.js';
import type { RequestContext } from '../workflow-instances/workflow-instances.service.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import type { LocalizedText } from '../../../common/schemas/localized-text.schema.js';
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
    // The status panel names the review and lists what has been decided.
    private readonly definitionsService: WorkflowDefinitionsService,
    private readonly actionHistoryService: WorkflowActionHistoryService,
    private readonly revisionsService: RevisionsService,
    private readonly publicationsService: PublicationsService,
    private readonly auditLogsService: AuditLogsService,
    // History says who saved each version. Only the name is taken — see
    // `UsersService.findNamesByIds` for why it is not `findByIds`.
    private readonly usersService: UsersService,
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
   *   is already running, the record moved, or the draft is not ready —
   *   copy still marked as awaiting the client, or a field this type may
   *   not be published without still empty.
   */
  async publishDirect(input: {
    entityType: PublicationEntityType;
    entityId: Types.ObjectId;
    actor: AuthenticatedUser;
    expectedUpdatedAt: Date;
    context?: RequestContext;
  }): Promise<{ revisionId: string; publicationId: string; publishedAt: string }> {
    const { entityType, entityId, actor, expectedUpdatedAt } = input;

    this.assertPermission(actor, entityType, 'Publish');

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

    const blockers = findPublishBlockers(entityType, record);
    if (blockers.length > 0) {
      throw new ConflictException(describePublishBlockers(blockers));
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
    // Held to the same readiness bar as a direct publish: a review that ends
    // in approval publishes, so content that may not be published may not be
    // sent for approval either.
    const blockers = findPublishBlockers(entityType, record);
    if (blockers.length > 0) {
      throw new ConflictException(describePublishBlockers(blockers));
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

  /**
   * A record's version history, newest first, with what became of each.
   *
   * Generic by entity type, like everything else here: the dashboard's
   * history panel takes an `entityType` and an `entityId` and works for any
   * of the twelve, so the eleven pages after this one need no second
   * implementation.
   *
   * @throws ForbiddenException without `<entityType>:Read`.
   */
  async revisionHistory(
    entityType: PublicationEntityType,
    entityId: Types.ObjectId,
    actor: AuthenticatedUser,
    page: number,
    limit: number,
  ): Promise<RevisionHistoryPageDto> {
    this.assertMayReadHistory(actor, entityType);

    const { items: rows, total } = await this.revisionsService.findForEntity(
      entityType,
      entityId,
      (page - 1) * limit,
      limit,
    );

    // Both joins are scoped to the page rather than the record: annotating
    // twenty rows must not cost what reading the whole history cost.
    const [publications, names] = await Promise.all([
      this.publicationsService.findByRevisionIds(rows.map((row) => row._id)),
      this.usersService.findNamesByIds(rows.map((row) => String(row.createdBy))),
    ]);
    const byRevision = new Map(publications.map((publication) => [publication.revisionId.toString(), publication]));

    return {
      items: rows.map((row) => this.toSummary(row, byRevision.get(row._id.toString()) ?? null, names)),
      total,
      page,
      limit,
    };
  }

  /**
   * One version's content, reduced to the fields its type allows a reader to
   * see.
   *
   * The stored snapshot is never returned as it stands. Snapshots are
   * immutable, so a row frozen before a field was retired still carries that
   * field — filtering only on the way in leaves every row already in the
   * database unfiltered (owner decision 2026-09-12).
   *
   * @throws ForbiddenException without `<entityType>:Read` for the type the
   *   revision belongs to — `revisions:Read` alone would grant the history
   *   of every entity type at once.
   * @throws NotFoundException when no revision has that id.
   */
  async readRevision(revisionId: string, actor: AuthenticatedUser): Promise<RevisionDetailDto> {
    const revision = await this.revisionsService.findById(revisionId);
    if (!revision) {
      throw new NotFoundException('That revision does not exist.');
    }

    this.assertMayReadHistory(actor, revision.entityType);

    const frozenId = revision._id as Types.ObjectId;
    const [publication, names] = await Promise.all([
      this.publicationsService.findByRevisionId(frozenId),
      this.usersService.findNamesByIds([String(revision.createdBy)]),
    ]);

    // `timestamps` adds `createdAt` at runtime and the class does not declare
    // it, so the document's type has to be widened once here.
    const { createdAt } = revision as typeof revision & { createdAt: Date };

    return {
      ...this.toSummary(
        { _id: frozenId, versionNumber: revision.versionNumber, createdAt, createdBy: revision.createdBy },
        publication,
        names,
      ),
      entityType: revision.entityType,
      entityId: revision.entityId.toString(),
      content: projectRevisionContent(revision.entityType, revision.snapshotData),
    };
  }

  /**
   * `revisions:Read` says the caller may read history at all; it does not say
   * whose. Holding it alone would open every entity type's past text to
   * anyone who may read any of it — so the type's own Read permission is
   * checked too, and it is checked here rather than in the controller so no
   * future route can mount this without it.
   */
  private assertMayReadHistory(actor: AuthenticatedUser, entityType: PublicationEntityType): void {
    this.assertPermission(actor, entityType, 'Read');
  }

  /** @throws ForbiddenException when the caller lacks the pair. One place,
   *  because the refusal's shape is what the dashboard branches on. */
  private assertPermission(actor: AuthenticatedUser, entityType: PublicationEntityType, action: string): void {
    if (this.hasPermission(actor, entityType, action)) {
      return;
    }
    throw new ForbiddenException({
      code: 'forbidden',
      message: `Missing permission: ${action} on ${entityType}.`,
    });
  }

  private toSummary(
    row: Pick<RevisionListRow, '_id' | 'versionNumber' | 'createdAt' | 'createdBy'>,
    publication: { status: string; publishedAt: Date } | null,
    names: ReadonlyMap<string, LocalizedText>,
  ): RevisionSummaryDto {
    const createdBy = String(row.createdBy);
    const name = names.get(createdBy);

    return {
      id: row._id.toString(),
      versionNumber: row.versionNumber,
      createdAt: row.createdAt.toISOString(),
      createdBy: { id: createdBy, name: name ? { en: name.en, ar: name.ar } : null },
      state: (publication?.status ?? 'Draft') as RevisionSummaryDto['state'],
      publishedAt: publication ? publication.publishedAt.toISOString() : null,
    };
  }

  /** Everything the dashboard's status panel needs, in one read. */
  async editorialState(
    entityType: PublicationEntityType,
    entityId: Types.ObjectId,
    actor: AuthenticatedUser,
  ): Promise<EditorialStateDto> {
    // `findActive` and `findByEntity` answer different questions on the same
    // index: what may happen next, and what has already happened. A record
    // published through an approval has no active instance and still has a
    // history worth showing.
    const [record, resolved, active, live, instances] = await Promise.all([
      this.loadRecord(entityType, entityId),
      this.policiesService.resolve(entityType, 'Edit'),
      this.instancesService.findActive(entityType, entityId),
      this.publicationsService.findLive(entityType, entityId),
      this.instancesService.findByEntity(entityType, entityId),
    ]);

    const canEdit = await this.canEdit(entityType, entityId, actor);
    const publishBlockers = findPublishBlockers(entityType, record);
    const canPublish = this.hasPermission(actor, entityType, 'Publish');
    const canUpdate = this.hasPermission(actor, entityType, 'Update');
    const canApprove = this.hasPermission(actor, entityType, 'Approve');

    const permits = { canEdit, canUpdate, canPublish, canApprove };
    const actions = this.allowedActions(resolved.mode, active, permits, publishBlockers.length === 0);

    // What the same reader could do if the draft were ready, minus what they
    // can already do — so the dashboard can draw those disabled, described by
    // the readiness list, instead of silently omitting them.
    //
    // Computed by running the same rule with readiness satisfied rather than
    // by a second rule written alongside it: two rules that must agree are
    // two rules that will not.
    const ifReady = this.allowedActions(resolved.mode, active, permits, true);
    const blockedByReadiness = EDITORIAL_ACTIONS.filter(
      (action) => ifReady.has(action) && !actions.has(action),
    );

    const [steps, definition, history] = await Promise.all([
      active ? this.stepsService.findByDefinition(active.workflowDefinitionId.toString()) : [],
      active ? this.definitionsService.findById(active.workflowDefinitionId.toString()) : null,
      this.actionHistoryService.findByInstances(
        instances.map((instance) => instance._id as Types.ObjectId),
      ),
    ]);

    // Progress is per step and per cycle, so it is counted per step rather
    // than derived from the history above — which spans every cycle this
    // record has been through.
    const approvals = active
      ? await Promise.all(
          steps.map((step) =>
            this.actionHistoryService.countDistinctApprovers(
              active._id as Types.ObjectId,
              step._id as Types.ObjectId,
            ),
          ),
        )
      : [];

    // One lookup for every person the panel names: who published, who may
    // decide a step, who has already decided one.
    const names = await this.usersService.findNamesByIds([
      ...(live ? [String(live.publishedBy)] : []),
      ...steps.flatMap((step) => step.assigneeIds.map(String)),
      ...history.map((entry) => String(entry.actorId)),
    ]);

    const workflow: WorkflowSummaryDto | null = active
      ? {
          instanceId: (active._id as Types.ObjectId).toString(),
          definitionName: definition ? { en: definition.name.en, ar: definition.name.ar } : null,
          status: active.status,
          steps: steps.map((step, index) => ({
            id: (step._id as Types.ObjectId).toString(),
            sequenceOrder: step.sequenceOrder,
            stepType: step.stepType,
            requiredApprovals: step.requiredApprovals,
            approvals: approvals[index] ?? 0,
            assignees: step.assigneeIds.map((assignee) => this.actorRef(String(assignee), names)),
            isCurrent:
              active.currentStepId?.toString() === (step._id as Types.ObjectId).toString(),
          })),
        }
      : null;

    return {
      publicationState: String(record.publicationState ?? 'Draft'),
      mode: resolved.mode,
      blockedReason: resolved.reason,
      publishedAt: live?.publishedAt ? live.publishedAt.toISOString() : null,
      publishedBy: live ? this.actorRef(String(live.publishedBy), names) : null,
      workflowInstanceId: active ? (active._id as Types.ObjectId).toString() : null,
      workflowStatus: active?.status ?? null,
      currentStepId: active?.currentStepId ? active.currentStepId.toString() : null,
      canEdit,
      availableActions: EDITORIAL_ACTIONS.filter((action) => actions.has(action)),
      updatedAt: record.updatedAt instanceof Date ? record.updatedAt.toISOString() : null,
      publishBlockers,
      blockedByReadiness,
      workflow,
      history: history.map((entry) => this.toHistoryEntry(entry, names)),
    };
  }

  /**
   * What this reader may do, given the policy, the running review and their
   * permissions — with readiness as a parameter rather than a fact.
   *
   * `editorialState` calls it twice: once truthfully, and once as though the
   * draft were ready, to tell "not yet" apart from "not yours".
   */
  private allowedActions(
    mode: PublishingMode,
    active: WorkflowInstanceDocument | null,
    permits: { canEdit: boolean; canUpdate: boolean; canPublish: boolean; canApprove: boolean },
    publishable: boolean,
  ): Set<EditorialAction> {
    const actions = new Set<EditorialAction>();

    // Saving is never gated on readiness: being unable to publish is not
    // being unable to work.
    if (permits.canEdit && permits.canUpdate) {
      actions.add('save');
    }

    if (!publishable) {
      return actions;
    }

    if (!active) {
      if (mode === 'direct' && permits.canPublish) {
        actions.add('publish');
      }
      if (mode === 'workflow' && permits.canUpdate) {
        actions.add('submit');
      }
      return actions;
    }

    if (active.status === 'InProgress' && permits.canApprove) {
      actions.add('approve');
      actions.add('reject');
      actions.add('return');
    }
    if ((active.status === 'Rejected' || active.status === 'Returned') && permits.canUpdate) {
      actions.add('resubmit');
    }

    return actions;
  }

  /** A person as the dashboard shows them: a name, never the account. */
  private actorRef(id: string, names: Map<string, LocalizedText>): RevisionActorDto {
    const name = names.get(id);
    return { id, name: name ? { en: name.en, ar: name.ar } : null };
  }

  private toHistoryEntry(
    entry: WorkflowActionHistoryDocument,
    names: Map<string, LocalizedText>,
  ): EditorialHistoryEntryDto {
    return {
      id: (entry._id as Types.ObjectId).toString(),
      action: entry.action,
      actor: this.actorRef(String(entry.actorId), names),
      reason: entry.reason ?? null,
      actionDate: entry.actionDate.toISOString(),
      workflowStepId: entry.workflowStepId.toString(),
      returnedToStepId: entry.returnedToStepId ? entry.returnedToStepId.toString() : null,
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
