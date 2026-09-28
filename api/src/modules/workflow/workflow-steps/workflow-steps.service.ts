import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { WorkflowStepsRepository } from './workflow-steps.repository.js';
import type { WorkflowStepDocument } from './schemas/workflow-step.schema.js';
import { CreateWorkflowStepDto } from './dto/create-workflow-step.dto.js';
import { UpdateWorkflowStepDto } from './dto/update-workflow-step.dto.js';
import { isDuplicateKeyError } from '../../../common/utils/mongo-errors.util.js';
import { partialUpdate, setObjectIdField, setObjectIdArrayField } from '../../../common/utils/partial-update.util.js';

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

  /**
   * `create()`'s `unsatisfiableStep` check (required approvals vs. distinct
   * assignees) IS re-run here (Fix round 1, CLAUDE.md §31 — the check reads
   * merged state, at the moment of the write, never a value captured
   * earlier). `requiredApprovals` and `assigneeIds` are each ordinary edits
   * on their own; a patch touching only one of them still has to be checked
   * against the OTHER's current stored value, or a step that raises its
   * threshold without adding approvers becomes permanently unsatisfiable
   * with nothing to explain why the workflow stalled.
   *
   * Neither field can arrive as `null`: `UpdateWorkflowStepDto` is built with
   * `PartialType(…, { skipNullProperties: false })`, which refuses a cleared
   * required field before the controller runs, so the `??` merge below sees
   * only `undefined`.
   *
   * @throws NotFoundException when no such step exists.
   * @throws BadRequestException when the merged result (patch fields applied
   *   on top of whatever is not sent) needs more approvals than it names
   *   distinct assignees.
   * @throws ConflictException when the patch's `sequenceOrder` collides with
   *   another step of the same definition.
   */
  async update(id: string, dto: UpdateWorkflowStepDto): Promise<WorkflowStepDocument> {
    const current = await this.repository.findById(id);
    if (!current) {
      throw new NotFoundException(`Workflow step ${id} not found.`);
    }

    // Merged, not "only when both are sent": a patch that raises
    // `requiredApprovals` alone has to be checked against the assignees
    // already on the step, or it slips through unsatisfiable.
    const requiredApprovals = dto.requiredApprovals ?? current.requiredApprovals;
    const assigneeIds = dto.assigneeIds ?? current.assigneeIds.map((assigneeId) => assigneeId.toString());
    const distinctAssignees = new Set(assigneeIds).size;
    if (requiredApprovals > distinctAssignees) {
      throw new BadRequestException({
        code: 'unsatisfiableStep',
        message: `This step needs ${requiredApprovals} approvals but names only ${distinctAssignees} distinct ${
          distinctAssignees === 1 ? 'approver' : 'approvers'
        }.`,
      });
    }

    const update = partialUpdate(dto);
    setObjectIdField(update, dto, 'workflowDefinitionId', { nullable: false });
    setObjectIdArrayField(update, dto, 'assigneeIds');

    let updated: WorkflowStepDocument | null;
    try {
      updated = await this.repository.updateById(id, update);
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
      throw new ConflictException({
        code: 'duplicateStepOrder',
        message: `Another step of this workflow already holds this position.`,
      });
    }
    if (!updated) {
      throw new NotFoundException(`Workflow step ${id} not found.`);
    }
    return updated;
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

  async unarchive(id: string): Promise<WorkflowStepDocument | null> {
    return this.repository.restore(id);
  }
}
