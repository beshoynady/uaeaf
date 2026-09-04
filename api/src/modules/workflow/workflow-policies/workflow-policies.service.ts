import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { WorkflowPoliciesRepository } from './workflow-policies.repository.js';
import type { WorkflowPolicyDocument } from './schemas/workflow-policy.schema.js';
import { CreateWorkflowPolicyDto } from './dto/create-workflow-policy.dto.js';
import type { WorkflowEntityType } from '../../../common/constants/workflow-entity-types.js';
import type { WorkflowPolicyOperation } from './schemas/workflow-policy.schema.js';

/** Implements: workflowPolicies collection, Domain 7 (FigJam node
 *  `277:4402`). Selects, per (entityType, operation), whether approval is
 *  required at all and which `workflowDefinitionId` governs it — the
 *  mechanism a future entity module (Week 3/4) calls before creating a
 *  `workflowInstances` row for an Add/Edit/Delete/Unpublish/Archive. */
@Injectable()
export class WorkflowPoliciesService {
  constructor(private readonly repository: WorkflowPoliciesRepository) {}

  async create(dto: CreateWorkflowPolicyDto): Promise<WorkflowPolicyDocument> {
    return this.repository.create({
      entityType: dto.entityType,
      operation: dto.operation,
      workflowRequired: dto.workflowRequired,
      workflowDefinitionId: dto.workflowDefinitionId ? new Types.ObjectId(dto.workflowDefinitionId) : null,
      allowHardDelete: dto.allowHardDelete,
    });
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
}
