import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkflowPolicy, WorkflowPolicySchema } from './schemas/workflow-policy.schema.js';
import { WorkflowPoliciesRepository } from './workflow-policies.repository.js';
import { WorkflowPoliciesService } from './workflow-policies.service.js';
import { WorkflowPoliciesController } from './workflow-policies.controller.js';
import { WorkflowDefinitionsModule } from '../workflow-definitions/workflow-definitions.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: WorkflowPolicy.name, schema: WorkflowPolicySchema }]),
    // `resolve()` must check that the definition a policy names is active and
    // governs the same entity type (ADR-0069 D4).
    WorkflowDefinitionsModule,
  ],
  controllers: [WorkflowPoliciesController],
  providers: [WorkflowPoliciesRepository, WorkflowPoliciesService],
  exports: [WorkflowPoliciesService],
})
export class WorkflowPoliciesModule {}
