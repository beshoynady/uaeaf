import { Module } from '@nestjs/common';
import { WorkflowPoliciesModule } from '../workflow-policies/workflow-policies.module.js';
import { WorkflowInstancesModule } from '../workflow-instances/workflow-instances.module.js';
import { WorkflowStepsModule } from '../workflow-steps/workflow-steps.module.js';
import { RevisionsModule } from '../revisions/revisions.module.js';
import { PublicationsModule } from '../publications/publications.module.js';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';
import { UsersModule } from '../../platform-administration/users/users.module.js';
import { PublishingService } from './publishing.service.js';
import { RevisionsController } from './revisions.controller.js';

/**
 * Mounts no publishing routes of its own, on purpose.
 *
 * Publishing is always an action on some entity — `POST
 * /president-message-page/:id/publish`, not `POST /publishing`. The
 * permission guard reads `<entityType>:Publish` off the route's decorator,
 * and a generic endpoint taking the entity type in its body would have no
 * decorator to read. Each entity module mounts its own routes and calls
 * this service.
 *
 * `RevisionsController` is the one controller here, and it is here for a
 * different reason: reading a version's history needs `revisions` and
 * `publications` together, and `PublicationsModule` already imports
 * `RevisionsModule`, so the revisions module cannot import it back. Its
 * generic `GET /revisions` read compensates for the missing per-type
 * decorator by checking `<entityType>:Read` inside the service.
 */
@Module({
  imports: [
    WorkflowPoliciesModule,
    WorkflowInstancesModule,
    WorkflowStepsModule,
    RevisionsModule,
    PublicationsModule,
    AuditLogsModule,
    // Version history names who saved each version.
    UsersModule,
  ],
  controllers: [RevisionsController],
  providers: [PublishingService],
  exports: [PublishingService],
})
export class PublishingModule {}
