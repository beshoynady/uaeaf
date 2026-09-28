import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { WorkflowPoliciesService } from './workflow-policies.service.js';
import { WorkflowDefinitionsService } from '../workflow-definitions/workflow-definitions.service.js';
import { WorkflowStepsService } from '../workflow-steps/workflow-steps.service.js';
import { WorkflowInstancesService } from '../workflow-instances/workflow-instances.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import type { RequestContext } from '../workflow-instances/workflow-instances.service.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { arrangementShape, buildSteps } from '../../../bootstrap/seed-news-approval.js';
import type { ApprovalMode } from '../../../bootstrap/seed-news-approval.js';
import { PERMISSION_RESOURCES } from '../../../common/constants/permission-resources.js';
import { WORKFLOW_ENTITY_TYPES } from '../../../common/constants/workflow-entity-types.js';
import type { WorkflowEntityType } from '../../../common/constants/workflow-entity-types.js';

/** What an administrator chose on the policy screen. */
export interface ApprovalConfiguration {
  enabled: boolean;
  mode?: ApprovalMode;
  approverIds?: string[];
  threshold?: number;
}

/** One entity type's arrangement, as the policy screen draws it. */
export interface GovernableEntity {
  entityType: WorkflowEntityType;
  enabled: boolean;
  mode: ApprovalMode | null;
  approverIds: string[];
  threshold: number;
  /**
   * Reviews currently running under this type's definition.
   *
   * On the screen it is the reason the arrangement is locked, shown before the
   * administrator edits rather than after they save. Above zero, changing who
   * decides is refused — see `configure`.
   */
  inFlightReviews: number;
}

/**
 * Turning approvals on or off for any governed entity type, in one call.
 *
 * ── Why this exists ────────────────────────────────────────────────────────
 *
 * Configuring a review used to mean three calls in the right order — create a
 * definition, create its steps, point a policy at it — with no screen for any
 * of them. That is why eleven of the twelve governed types had no policy at
 * all, and why `PublishingService` failed closed on them with a message about
 * configuration nobody had a way to perform. One call, one screen, and adding
 * a thirteenth governed type needs no code here at all.
 *
 * ── Why the three pieces move together ─────────────────────────────────────
 *
 * Whether a review is required, who decides, and how their decisions combine
 * are one decision an administrator makes in one sitting. Applied separately,
 * a half-finished change leaves a policy demanding approval from a definition
 * with nobody on it — which stops every publication of that type, with nothing
 * on any screen to say why.
 *
 * `buildSteps` is reused from the newsroom seed rather than reimplemented: the
 * three modes are a translation from a choice into steps, and two translations
 * of one choice eventually disagree.
 */
@Injectable()
export class ApprovalConfigurationService {
  constructor(
    private readonly policiesService: WorkflowPoliciesService,
    private readonly definitionsService: WorkflowDefinitionsService,
    private readonly stepsService: WorkflowStepsService,
    private readonly instancesService: WorkflowInstancesService,
    // ADR-0107: this service writes its own audit row. The interceptor cannot —
    // `configure` returns no `_id` and the route's parameter is `entityType`, so
    // it had no way to name what changed and wrote nothing at all.
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /** The types an administrator may govern, with each one's current state. */
  async listGovernable(): Promise<GovernableEntity[]> {
    return Promise.all(WORKFLOW_ENTITY_TYPES.map((entityType) => this.describe(entityType)));
  }

  /**
   * Applies an administrator's choice for one entity type.
   *
   * @throws BadRequestException when the type is not one this platform guards,
   *   or is not one the workflow engine governs.
   * @throws ConflictException when the choice could never be satisfied — more
   *   approvals required than there are distinct approvers — or when reviews
   *   are running that changing the arrangement would strand.
   */
  async configure(
    entityType: string,
    choice: ApprovalConfiguration,
    actor: AuthenticatedUser,
    context: RequestContext = {},
  ): Promise<GovernableEntity> {
    const governed = this.assertGovernable(entityType);

    // Read before anything is written. This is the half the audit interceptor
    // cannot supply even after ADR-0112 removes its silent skip: its pre-read
    // needs a path `:id`, and this route's parameter is the entity type.
    const before = await this.describe(governed);

    if (!choice.enabled) {
      return this.disable(governed, actor, before, context);
    }

    const approverIds = (choice.approverIds ?? []).map((id) => new Types.ObjectId(id));
    // Built before anything is written, so a choice that could never be
    // satisfied changes nothing at all rather than leaving a definition
    // behind with no steps on it.
    const steps = this.stepsFor(choice.mode, approverIds, choice.threshold);

    const existing = await this.definitionsService.findByEntityType(governed);
    const definitionId =
      (existing?._id as Types.ObjectId | undefined) ??
      ((
        await this.definitionsService.create({
          name: this.nameFor(governed),
          entityType: governed,
          isActive: true,
        } as never)
      )._id as Types.ObjectId);

    if (existing && (await this.arrangementChanged(definitionId, steps))) {
      await this.assertNothingRunning(definitionId);
      await this.stepsService.replaceForDefinition(definitionId, steps);
    } else if (!existing) {
      await this.stepsService.replaceForDefinition(definitionId, steps);
    }

    await this.policiesService.upsert(governed, 'Edit', {
      workflowRequired: true,
      workflowDefinitionId: definitionId.toString(),
    });

    const after = await this.describe(governed);
    await this.recordChange(governed, actor, before, after, context);
    return after;
  }

  /**
   * One audit row per policy change, carrying both sides.
   *
   * Written here rather than left to the interceptor because this is the one
   * write where a generic mechanism has nothing to work with — and it is the
   * most governance-sensitive write on the platform. `StatusChange` rather than
   * `Update`: what changed is whether a whole content type requires review, not
   * a field on a record.
   *
   * Called only after the write has landed. A refused change altered nothing,
   * and a row for it would read as a change that happened.
   */
  private async recordChange(
    entityType: WorkflowEntityType,
    actor: AuthenticatedUser,
    before: GovernableEntity,
    after: GovernableEntity,
    context: RequestContext,
  ): Promise<void> {
    await this.auditLogsService.write({
      actorId: new Types.ObjectId(actor.userId),
      action: 'StatusChange',
      entityType: 'workflowPolicies',
      // The policy is identified by the entity type it governs, which is a
      // string, not an ObjectId — so the row carries it in the values instead
      // of pretending to an id it does not have.
      entityId: null,
      ipAddress: context.ipAddress ?? '',
      userAgent: context.userAgent ?? '',
      previousValue: this.arrangementFor(before),
      newValue: this.arrangementFor(after),
      reason: `Approval policy for ${entityType} changed`,
    });
  }

  /** The audited shape of an arrangement: what an administrator chose, without
   *  the in-flight count, which is a fact about the moment rather than a
   *  setting. */
  private arrangementFor(state: GovernableEntity): Record<string, unknown> {
    return {
      entityType: state.entityType,
      enabled: state.enabled,
      mode: state.mode,
      approverIds: state.approverIds,
      threshold: state.threshold,
    };
  }

  /**
   * Switches approvals off, keeping who the approvers were.
   *
   * The steps survive deliberately: an administrator turning approvals off for
   * a week and back on expects the same people, and rebuilding the list from
   * memory is how an approver quietly stops being one.
   */
  private async disable(
    entityType: WorkflowEntityType,
    actor: AuthenticatedUser,
    before: GovernableEntity,
    context: RequestContext,
  ): Promise<GovernableEntity> {
    // The definition and its steps are deliberately left alone: an administrator
    // turning approvals off for a week and back on expects the same approvers,
    // and rebuilding that list from memory is how somebody quietly stops being
    // one. Nothing here needs to read it.
    //
    // ADR-0107. `WorkflowPoliciesService.upsert` enforces this too — it has to,
    // because it is the writer every route shares. This early check exists for
    // the refusal's shape rather than for the rule: it names the pending records
    // so the administrator can chase or wait, which is the only decision they
    // are making, and it refuses before `upsert` is called at all.
    //
    // Same predicate as the writer's, deliberately. A narrower one here would
    // let this pass and `upsert` refuse, which reads to the administrator as the
    // screen disagreeing with itself.
    await this.assertNothingStranded(entityType);

    await this.policiesService.upsert(entityType, 'Edit', {
      workflowRequired: false,
      // A policy that requires no review names no definition. Leaving a stale
      // id on it would make `resolve()` read a definition it must not act on.
      workflowDefinitionId: null,
    });

    const after = await this.describe(entityType);
    await this.recordChange(entityType, actor, before, after, context);
    return after;
  }

  /**
   * Whether these steps would actually change who decides, and how.
   *
   * Replacing unconditionally looked idempotent and was not: it archived the
   * step every running review points at and made a new one, so `findById` —
   * which is soft-delete aware — stopped finding it. Comparing by
   * `arrangementShape` rather than by id means re-saving an unchanged policy
   * writes nothing, and so needs no permission to write nothing.
   */
  private async arrangementChanged(
    definitionId: Types.ObjectId,
    steps: readonly { assigneeIds: readonly Types.ObjectId[]; requiredApprovals: number }[],
  ): Promise<boolean> {
    const current = await this.stepsService.findByDefinition(definitionId.toString());
    return arrangementShape(current) !== arrangementShape(steps);
  }

  /**
   * Refuses the change outright while reviews are running under it.
   *
   * Not a migration, deliberately (owner decision 2026-09-21). Re-pointing a
   * running review at a step chosen by different people would mean an article
   * approved by approvers nobody in that review ever consented to, and a
   * sequential review half-decided under one arrangement and half under
   * another. There is no reading of a half-migrated approval that is safe to
   * publish from, so the arrangement waits for the reviews instead.
   *
   * The count travels in the payload: the screen states it, and a refusal that
   * says only "there are reviews" leaves the administrator no way to judge
   * whether to wait ten minutes or chase somebody.
   *
   * @throws ConflictException when any review is running.
   */
  /**
   * Refuses to turn approvals off while anything of this type is unapproved,
   * naming what is in the way.
   *
   * Distinct from `assertNothingRunning`, and the two predicates differ on
   * purpose. That one guards an ARRANGEMENT change and matches
   * `['InProgress','Returned']`, because replacing the steps does not strand a
   * `Rejected` review — `resubmit` restarts it from the first step. This one
   * guards turning approvals OFF, where the query that blocks the publish is
   * `findActive` (`status !== 'Approved'`), so a `Rejected` review IS stranded:
   * `publishDirect` refuses because a review is open on the record, and
   * `publishApproved` refuses because the type no longer requires one.
   *
   * @throws ConflictException carrying the count and the pending records.
   */
  private async assertNothingStranded(entityType: WorkflowEntityType): Promise<void> {
    const inFlightReviews = await this.instancesService.countUnapprovedForEntityType(entityType);
    if (inFlightReviews === 0) return;

    const open = await this.instancesService.findUnapprovedForEntityType(entityType);
    throw new ConflictException({
      code: 'reviewsInFlight',
      inFlightReviews,
      pending: open.map((instance) => ({
        entityId: (instance.entityId as Types.ObjectId).toString(),
        currentStepId: instance.currentStepId ? (instance.currentStepId as Types.ObjectId).toString() : null,
        status: instance.status,
      })),
      message:
        `${inFlightReviews} review(s) of ${entityType} have not been approved. ` +
        'Turning approvals off would leave each of them unpublishable both ways. ' +
        'Finish or cancel them first.',
    });
  }

  private async assertNothingRunning(definitionId: Types.ObjectId): Promise<void> {
    const inFlightReviews = await this.instancesService.countOpenForDefinition(definitionId);
    if (inFlightReviews === 0) return;

    // The rows behind the number. A refusal that says only "there are three
    // reviews" leaves the administrator no way to judge whether to wait ten
    // minutes or chase somebody, which is the only decision they are making
    // here (ADR-0107 D1).
    const open = await this.instancesService.findOpenForDefinition(definitionId);
    const pending = open.map((instance) => ({
      entityId: (instance.entityId as Types.ObjectId).toString(),
      currentStepId: instance.currentStepId ? (instance.currentStepId as Types.ObjectId).toString() : null,
    }));

    throw new ConflictException({
      code: 'reviewsInFlight',
      inFlightReviews,
      pending,
      message:
        `${inFlightReviews} review(s) are running under this arrangement. ` +
        'Changing it would leave each of them pointing at a step that no longer exists, ' +
        'so they could never be decided. Finish or cancel them first.',
    });
  }

  /** @throws ConflictException when the arrangement is unsatisfiable. */
  private stepsFor(mode: ApprovalMode | undefined, approverIds: Types.ObjectId[], threshold?: number) {
    try {
      return buildSteps(mode ?? 'THRESHOLD', approverIds, threshold);
    } catch (error) {
      // `buildSteps` throws a plain Error because it also runs in a seed
      // script with no HTTP layer under it. At a request boundary that has to
      // become a refusal the dashboard can branch on.
      throw new ConflictException({
        code: 'unsatisfiableStep',
        message: error instanceof Error ? error.message : 'This approval arrangement cannot be satisfied.',
      });
    }
  }

  /**
   * @throws BadRequestException when the type is unknown or ungovernable.
   *
   * Two lists, because they answer different questions and a type has to pass
   * both: `PERMISSION_RESOURCES` is what this platform has permissions for at
   * all, and `WORKFLOW_ENTITY_TYPES` is what the engine can route. `users` is
   * in the first and not the second — reviewing an account before it takes
   * effect is not something this engine does.
   */
  private assertGovernable(entityType: string): WorkflowEntityType {
    if (!(PERMISSION_RESOURCES as readonly string[]).includes(entityType)) {
      throw new BadRequestException({
        code: 'badRequest',
        message: `"${entityType}" is not a resource this platform guards, so a policy for it would gate nothing.`,
      });
    }
    if (!(WORKFLOW_ENTITY_TYPES as readonly string[]).includes(entityType)) {
      throw new BadRequestException({
        code: 'badRequest',
        message: `"${entityType}" is not governed by the approval engine.`,
      });
    }
    return entityType as WorkflowEntityType;
  }

  /** The arrangement as it stands, read back from what is actually stored. */
  private async describe(entityType: WorkflowEntityType): Promise<GovernableEntity> {
    const [policy, definition] = await Promise.all([
      this.policiesService.findByEntityTypeAndOperation(entityType, 'Edit'),
      this.definitionsService.findByEntityType(entityType),
    ]);

    const steps = definition
      ? await this.stepsService.findByDefinition((definition._id as Types.ObjectId).toString())
      : [];

    return {
      entityType,
      enabled: policy?.workflowRequired === true,
      mode: this.modeOf(steps),
      approverIds: steps.flatMap((step) => step.assigneeIds.map(String)),
      threshold: steps[0]?.requiredApprovals ?? 1,
      // Read for every row of the screen, including the types with no policy:
      // a type whose definition exists but whose reviews are running is
      // exactly the row that must be drawn locked before it is touched.
      inFlightReviews: definition
        ? await this.instancesService.countOpenForDefinition(definition._id as Types.ObjectId)
        : 0,
    };
  }

  /**
   * Which mode these steps express.
   *
   * Read back from the steps rather than stored beside them: the steps are the
   * truth the engine acts on, and a stored label could drift from them without
   * anything failing until an approval did not arrive.
   */
  private modeOf(steps: readonly { requiredApprovals: number; assigneeIds: unknown[] }[]): ApprovalMode | null {
    if (steps.length === 0) return null;
    if (steps.length > 1) return 'SEQUENTIAL';

    const [only] = steps;
    return only.requiredApprovals === only.assigneeIds.length ? 'ALL' : 'THRESHOLD';
  }

  /** A readable name for a definition this screen created. */
  private nameFor(entityType: WorkflowEntityType): { ar: string; en: string } {
    return { ar: `اعتماد ${entityType}`, en: `${entityType} approval` };
  }
}
