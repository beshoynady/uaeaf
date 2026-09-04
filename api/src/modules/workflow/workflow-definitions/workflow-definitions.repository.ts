import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { WorkflowDefinition } from './schemas/workflow-definition.schema.js';
import type { WorkflowDefinitionDocument } from './schemas/workflow-definition.schema.js';

/** Implements: workflowDefinitions collection, Domain 7. */
@Injectable()
export class WorkflowDefinitionsRepository extends BaseRepository<WorkflowDefinitionDocument> {
  constructor(@InjectModel(WorkflowDefinition.name) model: Model<WorkflowDefinitionDocument>) {
    super(model);
  }
}
