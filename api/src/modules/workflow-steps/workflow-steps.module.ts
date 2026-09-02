import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkflowStep, WorkflowStepSchema } from './schemas/workflow-step.schema.js';
import { WorkflowStepsRepository } from './workflow-steps.repository.js';
import { WorkflowStepsService } from './workflow-steps.service.js';
import { WorkflowStepsController } from './workflow-steps.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: WorkflowStep.name, schema: WorkflowStepSchema }])],
  controllers: [WorkflowStepsController],
  providers: [WorkflowStepsRepository, WorkflowStepsService],
  exports: [WorkflowStepsService],
})
export class WorkflowStepsModule {}
