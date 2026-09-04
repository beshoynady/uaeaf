import { Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { PublicationsService } from './publications.service.js';
import type { PublicationEntityType } from '../../../common/constants/workflow-entity-types.js';

/**
 * Implements: publications collection, Domain 7. No POST route —
 * publications rows are only ever created internally by
 * WorkflowInstancesService (see PublicationsService).
 *
 * `getPublicSnapshot` is kept RBAC-gated in Week 2 (not `@Public()`): the
 * actual unauthenticated public-facing read surface belongs to the CMS /
 * Public Communication modules (Week 3/4), which will call
 * `PublicationsService.getPublicSnapshot` directly rather than this route.
 * This endpoint exists now so the mechanism is verifiable end-to-end this
 * week without depending on those not-yet-built modules.
 */
@ApiTags('publications')
@Controller('publications')
export class PublicationsController {
  constructor(private readonly service: PublicationsService) {}

  @Patch(':id/unpublish')
  @RequirePermission('publications', 'Publish')
  unpublish(@Param('id') id: string) {
    return this.service.unpublish(id);
  }

  @Patch(':id/archive')
  @RequirePermission('publications', 'Publish')
  archive(@Param('id') id: string) {
    return this.service.archive(id);
  }

  @Get(':entityType/:entityId/public')
  @RequirePermission('publications', 'Read')
  getPublicSnapshot(
    @Param('entityType') entityType: PublicationEntityType,
    @Param('entityId') entityId: string,
  ) {
    return this.service.getPublicSnapshot(entityType, new Types.ObjectId(entityId));
  }
}
