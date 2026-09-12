import { Module } from '@nestjs/common';
import { WorkflowPoliciesModule } from '../workflow-policies/workflow-policies.module.js';
import { WorkflowInstancesModule } from '../workflow-instances/workflow-instances.module.js';
import { WorkflowStepsModule } from '../workflow-steps/workflow-steps.module.js';
import { RevisionsModule } from '../revisions/revisions.module.js';
import { PublicationsModule } from '../publications/publications.module.js';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';
import { PublishingService } from './publishing.service.js';

/**
 * Has no controller of its own on purpose.
 *
 * Publishing is always an action on some entity — `POST
 * /president-message-page/:id/publish`, not `POST /publishing`. The
 * permission guard reads `<entityType>:Publish` off the route's decorator,
 * and a generic endpoint taking the entity type in its body would have no
 * decorator to read. Each entity module mounts its own routes and calls
 * this service.
 */
@Module({
  imports: [
    WorkflowPoliciesModule,
    WorkflowInstancesModule,
    WorkflowStepsModule,
    RevisionsModule,
    PublicationsModule,
    AuditLogsModule,
  ],
  providers: [PublishingService],
  exports: [PublishingService],
})
export class PublishingModule {}
