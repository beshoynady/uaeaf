import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkflowPolicy, WorkflowPolicySchema } from './schemas/workflow-policy.schema.js';
import { WorkflowPoliciesRepository } from './workflow-policies.repository.js';
import { WorkflowPoliciesService } from './workflow-policies.service.js';
import { WorkflowPoliciesController } from './workflow-policies.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: WorkflowPolicy.name, schema: WorkflowPolicySchema }])],
  controllers: [WorkflowPoliciesController],
  providers: [WorkflowPoliciesRepository, WorkflowPoliciesService],
  exports: [WorkflowPoliciesService],
})
export class WorkflowPoliciesModule {}
