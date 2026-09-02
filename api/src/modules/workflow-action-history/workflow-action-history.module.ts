import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkflowActionHistory, WorkflowActionHistorySchema } from './schemas/workflow-action-history.schema.js';
import { WorkflowActionHistoryRepository } from './workflow-action-history.repository.js';
import { WorkflowActionHistoryService } from './workflow-action-history.service.js';
import { WorkflowActionHistoryController } from './workflow-action-history.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: WorkflowActionHistory.name, schema: WorkflowActionHistorySchema }]),
  ],
  controllers: [WorkflowActionHistoryController],
  providers: [WorkflowActionHistoryRepository, WorkflowActionHistoryService],
  exports: [WorkflowActionHistoryService],
})
export class WorkflowActionHistoryModule {}
