import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { WorkflowStepsRepository } from './workflow-steps.repository.js';
import type { WorkflowStepDocument } from './schemas/workflow-step.schema.js';
import { CreateWorkflowStepDto } from './dto/create-workflow-step.dto.js';
import { isDuplicateKeyError } from '../../../common/utils/mongo-errors.util.js';

/** Implements: workflowSteps collection, Domain 7 (FigJam node `100:7468`). */
@Injectable()
export class WorkflowStepsService {
  constructor(private readonly repository: WorkflowStepsRepository) {}

  /**
   * @throws BadRequestException when the step could never be satisfied
   *   (audit finding H6).
   * @throws ConflictException when the definition already has a step at this
   *   position (audit finding H5).
   */
  async create(dto: CreateWorkflowStepDto): Promise<WorkflowStepDocument> {
    // `countDistinctApprovers` counts distinct actors, so a threshold above
    // the number of distinct assignees can never be met: every instance that
    // reaches this step stops there permanently, and nothing in the product
    // says why. The same person listed twice is one approver, which is why
    // the count is of the set and not of the array.
    const distinctAssignees = new Set(dto.assigneeIds).size;
    if (dto.requiredApprovals > distinctAssignees) {
      throw new BadRequestException({
        code: 'unsatisfiableStep',
        message: `This step needs ${dto.requiredApprovals} approvals but names only ${distinctAssignees} distinct ${
          distinctAssignees === 1 ? 'approver' : 'approvers'
        }.`,
      });
    }

    try {
      return await this.repository.create({
        workflowDefinitionId: new Types.ObjectId(dto.workflowDefinitionId),
        sequenceOrder: dto.sequenceOrder,
        stepType: dto.stepType,
        assigneeType: 'User',
        assigneeIds: dto.assigneeIds.map((id) => new Types.ObjectId(id)),
        requiredApprovals: dto.requiredApprovals,
      });
    } catch (error) {
      // The partial-unique index is what actually prevents two steps at one
      // position; this turns its raw duplicate-key error into something the
      // administrator who caused it can read.
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
      throw new ConflictException({
        code: 'duplicateStepOrder',
        message: `This workflow already has a step at position ${dto.sequenceOrder}.`,
      });
    }
  }

  /**
   * Makes these the definition's steps, and only these.
   *
   * Replaced rather than merged: the steps ARE the administrator's choice, and
   * leaving an old one behind would keep an approver nobody chose able to hold
   * up every publication of that type.
   *
   * Archived rather than deleted, for two reasons: the partial-unique index on
   * (definition, order) is scoped to `archivedAt: null`, so archiving frees
   * the positions the replacements need; and a finished review's history
   * points at the step that decided it, which must not vanish underneath it.
   */
  async replaceForDefinition(
    workflowDefinitionId: Types.ObjectId,
    steps: readonly { sequenceOrder: number; stepType: string; assigneeIds: Types.ObjectId[]; requiredApprovals: number }[],
  ): Promise<void> {
    await this.repository.archiveForDefinition(workflowDefinitionId);

    for (const step of steps) {
      await this.repository.create({
        workflowDefinitionId,
        sequenceOrder: step.sequenceOrder,
        stepType: step.stepType,
        assigneeType: 'User',
        assigneeIds: step.assigneeIds,
        requiredApprovals: step.requiredApprovals,
      } as never);
    }
  }

  async findByDefinition(workflowDefinitionId: string): Promise<WorkflowStepDocument[]> {
    return this.repository.findByDefinition(new Types.ObjectId(workflowDefinitionId));
  }

  async findById(id: string): Promise<WorkflowStepDocument | null> {
    return this.repository.findById(id);
  }

  async findFirst(workflowDefinitionId: Types.ObjectId): Promise<WorkflowStepDocument | null> {
    return this.repository.findFirst(workflowDefinitionId);
  }

  async findNext(
    workflowDefinitionId: Types.ObjectId,
    afterSequenceOrder: number,
  ): Promise<WorkflowStepDocument | null> {
    return this.repository.findNext(workflowDefinitionId, afterSequenceOrder);
  }

  async addAssignee(stepId: Types.ObjectId, userId: Types.ObjectId): Promise<WorkflowStepDocument | null> {
    return this.repository.addAssignee(stepId, userId);
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<WorkflowStepDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
