import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { WorkflowPolicy } from './schemas/workflow-policy.schema.js';
import type { WorkflowPolicyDocument } from './schemas/workflow-policy.schema.js';
import type { WorkflowEntityType } from '../../common/constants/workflow-entity-types.js';
import type { WorkflowPolicyOperation } from './schemas/workflow-policy.schema.js';

/** Implements: workflowPolicies collection, Domain 7. */
@Injectable()
export class WorkflowPoliciesRepository extends BaseRepository<WorkflowPolicyDocument> {
  constructor(@InjectModel(WorkflowPolicy.name) model: Model<WorkflowPolicyDocument>) {
    super(model);
  }

  async findByEntityTypeAndOperation(
    entityType: WorkflowEntityType,
    operation: WorkflowPolicyOperation,
  ): Promise<WorkflowPolicyDocument | null> {
    return this.findOne({ entityType, operation });
  }
}
