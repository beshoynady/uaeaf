import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { WorkflowStep } from './schemas/workflow-step.schema.js';
import type { WorkflowStepDocument } from './schemas/workflow-step.schema.js';

/** Implements: workflowSteps collection, Domain 7. */
@Injectable()
export class WorkflowStepsRepository extends BaseRepository<WorkflowStepDocument> {
  constructor(@InjectModel(WorkflowStep.name) model: Model<WorkflowStepDocument>) {
    super(model);
  }

  async findByDefinition(workflowDefinitionId: Types.ObjectId): Promise<WorkflowStepDocument[]> {
    return this.model
      .find({ workflowDefinitionId, archivedAt: null })
      .sort({ sequenceOrder: 1 })
      .exec();
  }

  /** The step immediately after `sequenceOrder` within the same
   *  definition, or `null` if `sequenceOrder`'s step was the last one. */
  async findNext(
    workflowDefinitionId: Types.ObjectId,
    afterSequenceOrder: number,
  ): Promise<WorkflowStepDocument | null> {
    return this.model
      .findOne({
        workflowDefinitionId,
        sequenceOrder: { $gt: afterSequenceOrder },
        archivedAt: null,
      })
      .sort({ sequenceOrder: 1 })
      .exec();
  }

  async findFirst(workflowDefinitionId: Types.ObjectId): Promise<WorkflowStepDocument | null> {
    return this.model
      .findOne({ workflowDefinitionId, archivedAt: null })
      .sort({ sequenceOrder: 1 })
      .exec();
  }

  async addAssignee(stepId: Types.ObjectId, userId: Types.ObjectId): Promise<WorkflowStepDocument | null> {
    return this.model
      .findByIdAndUpdate(stepId, { $addToSet: { assigneeIds: userId } }, { returnDocument: 'after' })
      .exec();
  }
}
