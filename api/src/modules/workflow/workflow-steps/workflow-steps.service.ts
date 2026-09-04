import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { WorkflowStepsRepository } from './workflow-steps.repository.js';
import type { WorkflowStepDocument } from './schemas/workflow-step.schema.js';
import { CreateWorkflowStepDto } from './dto/create-workflow-step.dto.js';

/** Implements: workflowSteps collection, Domain 7 (FigJam node `100:7468`). */
@Injectable()
export class WorkflowStepsService {
  constructor(private readonly repository: WorkflowStepsRepository) {}

  async create(dto: CreateWorkflowStepDto): Promise<WorkflowStepDocument> {
    return this.repository.create({
      workflowDefinitionId: new Types.ObjectId(dto.workflowDefinitionId),
      sequenceOrder: dto.sequenceOrder,
      stepType: dto.stepType,
      assigneeType: 'User',
      assigneeIds: dto.assigneeIds.map((id) => new Types.ObjectId(id)),
      requiredApprovals: dto.requiredApprovals,
    });
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
