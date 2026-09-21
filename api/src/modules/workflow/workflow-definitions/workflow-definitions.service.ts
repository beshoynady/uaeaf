import { Injectable } from '@nestjs/common';
import { WorkflowDefinitionsRepository } from './workflow-definitions.repository.js';
import type { WorkflowDefinitionDocument } from './schemas/workflow-definition.schema.js';
import { CreateWorkflowDefinitionDto } from './dto/create-workflow-definition.dto.js';
import type { Types } from 'mongoose';

/** Implements: workflowDefinitions collection, Domain 7 (FigJam node
 *  `100:7436`). Plain CRUD — selection of which definition governs a given
 *  entity+operation happens in WorkflowPoliciesService, not here. */
@Injectable()
export class WorkflowDefinitionsService {
  constructor(private readonly repository: WorkflowDefinitionsRepository) {}

  async create(dto: CreateWorkflowDefinitionDto): Promise<WorkflowDefinitionDocument> {
    return this.repository.create({
      name: dto.name,
      entityType: dto.entityType,
      isActive: dto.isActive ?? true,
    });
  }

  /**
   * The live definition governing an entity type, if it has one.
   *
   * The live board allows several definitions per type and selects between
   * them through `workflowPolicies.workflowDefinitionId`. The policy screen
   * does not expose that choice — one arrangement per type is what an
   * administrator is configuring — so this answers the one that is active,
   * and the configuration service reuses it rather than adding a second.
   */
  async findByEntityType(entityType: string): Promise<WorkflowDefinitionDocument | null> {
    return this.repository.findOne({ entityType, isActive: true } as never);
  }

  async findAll(): Promise<WorkflowDefinitionDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<WorkflowDefinitionDocument | null> {
    return this.repository.findById(id);
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<WorkflowDefinitionDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
