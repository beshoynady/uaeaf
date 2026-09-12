import { ConflictException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { WorkflowPoliciesRepository } from './workflow-policies.repository.js';
import type { WorkflowPolicyDocument } from './schemas/workflow-policy.schema.js';
import { CreateWorkflowPolicyDto } from './dto/create-workflow-policy.dto.js';
import { WorkflowDefinitionsService } from '../workflow-definitions/workflow-definitions.service.js';
import { isDuplicateKeyError } from '../../../common/utils/mongo-errors.util.js';
import type { WorkflowEntityType } from '../../../common/constants/workflow-entity-types.js';
import type { WorkflowPolicyOperation } from './schemas/workflow-policy.schema.js';

/** How an operation on an entity type reaches the public site. */
export type PublishingMode = 'workflow' | 'direct' | 'blocked';

/** Why a policy resolved to `blocked`; `null` for the other two modes. */
export type PolicyBlockReason =
  | 'noPolicy'
  | 'definitionMissing'
  | 'definitionInactive'
  | 'definitionForeignType';

export interface ResolvedPolicy {
  mode: PublishingMode;
  policy: WorkflowPolicyDocument | null;
  workflowDefinitionId: Types.ObjectId | null;
  reason: PolicyBlockReason | null;
}

/** Implements: workflowPolicies collection, Domain 7 (FigJam node
 *  `277:4402`). Selects, per (entityType, operation), whether approval is
 *  required at all and which `workflowDefinitionId` governs it. */
@Injectable()
export class WorkflowPoliciesService {
  constructor(
    private readonly repository: WorkflowPoliciesRepository,
    private readonly definitionsService: WorkflowDefinitionsService,
  ) {}

  /**
   * The publishing path for one operation on one entity type (ADR-0069 D4).
   *
   * Until this existed the collection was read by nothing (audit finding
   * OUT-07) and each module published by whatever path it happened to
   * implement.
   *
   * **It fails closed.** No policy, a policy that demands approval without
   * naming a usable definition, a definition that is archived, inactive, or
   * written for another entity type — every one of those is `blocked`, never
   * `direct`. The alternative would mean that forgetting to configure a
   * workflow silently grants everyone the authority the workflow existed to
   * withhold.
   */
  async resolve(
    entityType: WorkflowEntityType,
    operation: WorkflowPolicyOperation,
  ): Promise<ResolvedPolicy> {
    const policy = await this.repository.findByEntityTypeAndOperation(entityType, operation);

    if (!policy) {
      return { mode: 'blocked', policy: null, workflowDefinitionId: null, reason: 'noPolicy' };
    }

    if (!policy.workflowRequired) {
      return { mode: 'direct', policy, workflowDefinitionId: null, reason: null };
    }

    const blocked = (reason: PolicyBlockReason): ResolvedPolicy => ({
      mode: 'blocked',
      policy,
      workflowDefinitionId: null,
      reason,
    });

    if (!policy.workflowDefinitionId) {
      return blocked('definitionMissing');
    }

    // `findById` is soft-delete aware, so an archived definition reads as
    // missing here — which is the right answer: it cannot govern anything.
    const definition = await this.definitionsService.findById(policy.workflowDefinitionId.toString());

    if (!definition) {
      return blocked('definitionMissing');
    }

    if (!definition.isActive) {
      return blocked('definitionInactive');
    }

    if (definition.entityType !== entityType) {
      return blocked('definitionForeignType');
    }

    return {
      mode: 'workflow',
      policy,
      workflowDefinitionId: policy.workflowDefinitionId,
      reason: null,
    };
  }

  /**
   * Refuses a policy that names a definition it cannot use (audit finding
   * H11/S8).
   *
   * `resolve()` already refuses to ACT on such a policy, but storing one
   * and discovering it at publish time tells the wrong person at the wrong
   * moment: the administrator who misconfigured it sees a success, and an
   * editor two weeks later sees the refusal. This says it at the keystroke
   * that caused it.
   *
   * @throws ConflictException when the definition is missing, inactive, or
   *   written for another entity type.
   */
  private async assertDefinitionUsable(
    entityType: WorkflowEntityType,
    workflowRequired: boolean,
    workflowDefinitionId: string | null,
  ): Promise<void> {
    if (!workflowRequired || !workflowDefinitionId) {
      return;
    }

    const definition = await this.definitionsService.findById(workflowDefinitionId);

    if (!definition) {
      throw new ConflictException({
        code: 'conflict',
        message: 'That workflow definition does not exist or is archived.',
      });
    }
    if (!definition.isActive) {
      throw new ConflictException({
        code: 'conflict',
        message: 'That workflow definition is inactive, so it cannot govern anything.',
      });
    }
    if (definition.entityType !== entityType) {
      throw new ConflictException({
        code: 'conflict',
        message: `That workflow definition governs ${definition.entityType}, not ${entityType}.`,
      });
    }
  }

  async create(dto: CreateWorkflowPolicyDto): Promise<WorkflowPolicyDocument> {
    await this.assertDefinitionUsable(
      dto.entityType,
      dto.workflowRequired,
      dto.workflowDefinitionId ?? null,
    );

    try {
      return await this.repository.create({
        entityType: dto.entityType,
        operation: dto.operation,
        workflowRequired: dto.workflowRequired,
        workflowDefinitionId: dto.workflowDefinitionId
          ? new Types.ObjectId(dto.workflowDefinitionId)
          : null,
        allowHardDelete: dto.allowHardDelete,
      });
    } catch (error) {
      throw this.asConflict(error, dto.entityType, dto.operation);
    }
  }

  /**
   * Sets the one policy for this (entityType, operation), creating it if it
   * is not there yet.
   *
   * An upsert rather than create-or-update because the pair is unique: the
   * caller is stating what the policy IS, and "there is already one" is not
   * a failure they can do anything with.
   */
  async upsert(
    entityType: WorkflowEntityType,
    operation: WorkflowPolicyOperation,
    input: {
      workflowRequired: boolean;
      workflowDefinitionId: string | null;
      allowHardDelete?: boolean;
    },
  ): Promise<WorkflowPolicyDocument> {
    await this.assertDefinitionUsable(
      entityType,
      input.workflowRequired,
      input.workflowDefinitionId ?? null,
    );

    const existing = await this.repository.findByEntityTypeAndOperation(entityType, operation);
    const workflowDefinitionId = input.workflowDefinitionId
      ? new Types.ObjectId(input.workflowDefinitionId)
      : null;

    if (!existing) {
      return this.create({
        entityType,
        operation,
        workflowRequired: input.workflowRequired,
        workflowDefinitionId: input.workflowDefinitionId ?? undefined,
        allowHardDelete: input.allowHardDelete ?? false,
      } as CreateWorkflowPolicyDto);
    }

    const updated = await this.repository.updateById(existing._id.toString(), {
      $set: {
        workflowRequired: input.workflowRequired,
        workflowDefinitionId,
        ...(input.allowHardDelete === undefined ? {} : { allowHardDelete: input.allowHardDelete }),
      },
    });

    // `existing` was just read, so a null here means it was archived between
    // the read and the write — rare, and correctly reported as a conflict
    // rather than silently recreated.
    if (!updated) {
      throw new ConflictException({
        code: 'conflict',
        message: `The ${entityType}/${operation} policy changed while it was being saved. Try again.`,
      });
    }

    return updated;
  }

  async findAll(): Promise<WorkflowPolicyDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<WorkflowPolicyDocument | null> {
    return this.repository.findById(id);
  }

  async findByEntityTypeAndOperation(
    entityType: WorkflowEntityType,
    operation: WorkflowPolicyOperation,
  ): Promise<WorkflowPolicyDocument | null> {
    return this.repository.findByEntityTypeAndOperation(entityType, operation);
  }

  /** The partial-unique index (ADR-0069 D4) is what actually prevents two
   *  contradictory active policies; this turns its raw duplicate-key error
   *  into something the caller can read. */
  private asConflict(error: unknown, entityType: string, operation: string): unknown {
    if (!isDuplicateKeyError(error)) {
      return error;
    }
    return new ConflictException({
      code: 'conflict',
      message: `A policy for ${entityType}/${operation} already exists. Update it instead of creating a second one.`,
    });
  }
}
