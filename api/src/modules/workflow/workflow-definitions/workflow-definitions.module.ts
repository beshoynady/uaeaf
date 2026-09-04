import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkflowDefinition, WorkflowDefinitionSchema } from './schemas/workflow-definition.schema.js';
import { WorkflowDefinitionsRepository } from './workflow-definitions.repository.js';
import { WorkflowDefinitionsService } from './workflow-definitions.service.js';
import { WorkflowDefinitionsController } from './workflow-definitions.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: WorkflowDefinition.name, schema: WorkflowDefinitionSchema }]),
  ],
  controllers: [WorkflowDefinitionsController],
  providers: [WorkflowDefinitionsRepository, WorkflowDefinitionsService],
  exports: [WorkflowDefinitionsService],
})
export class WorkflowDefinitionsModule {}
