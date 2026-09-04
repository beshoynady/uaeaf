import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkflowInstance, WorkflowInstanceSchema } from './schemas/workflow-instance.schema.js';
import { WorkflowInstancesRepository } from './workflow-instances.repository.js';
import { WorkflowInstancesService } from './workflow-instances.service.js';
import { WorkflowInstancesController } from './workflow-instances.controller.js';
import { WorkflowStepsModule } from '../workflow-steps/workflow-steps.module.js';
import { WorkflowActionHistoryModule } from '../workflow-action-history/workflow-action-history.module.js';
import { PublicationsModule } from '../publications/publications.module.js';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: WorkflowInstance.name, schema: WorkflowInstanceSchema }]),
    WorkflowStepsModule,
    WorkflowActionHistoryModule,
    PublicationsModule,
    AuditLogsModule,
  ],
  controllers: [WorkflowInstancesController],
  providers: [WorkflowInstancesRepository, WorkflowInstancesService],
  exports: [WorkflowInstancesService],
})
export class WorkflowInstancesModule {}
