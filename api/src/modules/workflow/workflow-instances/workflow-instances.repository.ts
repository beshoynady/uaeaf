import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { WorkflowInstance } from './schemas/workflow-instance.schema.js';
import type { WorkflowInstanceDocument } from './schemas/workflow-instance.schema.js';
import type { WorkflowEntityType } from '../../../common/constants/workflow-entity-types.js';

/** Implements: workflowInstances collection, Domain 7. */
@Injectable()
export class WorkflowInstancesRepository extends BaseRepository<WorkflowInstanceDocument> {
  constructor(@InjectModel(WorkflowInstance.name) model: Model<WorkflowInstanceDocument>) {
    super(model);
  }

  /** The "active" instance for an entity, per BE-PLAN-010 Week 2 §4:
   *  not archived, and `status !== 'Approved'` (Rejected/Returned are NOT
   *  terminal — the same instance can still be resubmitted into). */
  async findActive(
    entityType: WorkflowEntityType,
    entityId: Types.ObjectId,
  ): Promise<WorkflowInstanceDocument | null> {
    return this.findOne({ entityType, entityId, status: { $ne: 'Approved' } });
  }

  /**
   * Every review this record has been through, including the finished ones.
   *
   * `findActive` deliberately excludes `Approved`, which is right for
   * deciding what may happen next and wrong for showing what happened: a
   * record published through an approval would otherwise present an empty
   * history the moment it went live. Served by the `{entityType, entityId}`
   * index the schema already declares.
   */
  async findByEntity(
    entityType: WorkflowEntityType,
    entityId: Types.ObjectId,
  ): Promise<WorkflowInstanceDocument[]> {
    return this.find({ entityType, entityId });
  }

  /**
   * Every review currently running, across every record.
   *
   * The starting set for "what is waiting for me". Filtering `InProgress` in
   * memory instead would read every instance the federation has ever run to
   * answer a question about the open ones.
   */
  async findInProgress(): Promise<WorkflowInstanceDocument[]> {
    return this.find({ status: 'InProgress' });
  }

  /**
   * How many reviews would be stranded if this definition's steps changed.
   *
   * Replacing the steps archives the old ones, and `WorkflowStepsService.findById`
   * is soft-delete aware. Which statuses that strands is not uniform, so this
   * counts exactly the two it does:
   *
   * - `InProgress` resumes at its stored `currentStepId`, which would no longer
   *   be found — the review could never be decided again, and matches nobody's
   *   queue.
   * - `Returned` also resumes at its stored `currentStepId` (`resubmit`), so a
   *   record sent back for changes could never be sent in again.
   *
   * `Rejected` is deliberately absent: `resubmit` restarts a rejected review at
   * `findFirst` of the definition, which reads whatever the steps are then. It
   * survives the change, so counting it would block an administrator over a
   * record that is in no danger.
   */
  async countOpenForDefinition(definitionId: Types.ObjectId): Promise<number> {
    return this.model
      .countDocuments({
        workflowDefinitionId: definitionId,
        status: { $in: ['InProgress', 'Returned'] },
        archivedAt: null,
      })
      .exec();
  }

  /**
   * The most recent finished review of this record, if it ended in approval.
   *
   * `findActive` deliberately excludes `Approved`, so it cannot answer this —
   * and publishing needs exactly the instance `findActive` hides: the one
   * whose approvers are done and whose revision is waiting for somebody to
   * put it on the site.
   *
   * Newest first, because a record can be approved, edited, and approved
   * again: the standing approval is the last one, and publishing an earlier
   * one would put superseded text on the page.
   */
  async findLatestApproved(
    entityType: WorkflowEntityType,
    entityId: Types.ObjectId,
  ): Promise<WorkflowInstanceDocument | null> {
    return this.model
      .findOne({ entityType, entityId, status: 'Approved', archivedAt: null })
      .sort({ updatedAt: -1 })
      .exec();
  }
}
