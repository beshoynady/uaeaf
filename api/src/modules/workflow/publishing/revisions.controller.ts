import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { RevisionsService } from '../revisions/revisions.service.js';
import { CreateRevisionDto } from '../revisions/dto/create-revision.dto.js';
import { PublishingService } from './publishing.service.js';
import { ListRevisionsQueryDto, RevisionHistoryPageDto } from './revision-history.dto.js';

/**
 * Implements: revisions collection, Domain 7. No DELETE route exists on this
 * controller, deliberately — see RevisionsService.
 *
 * It lives in the publishing module rather than the revisions module because
 * a version's history is only half in `revisions`: what became of a version
 * is in `publications`. `PublicationsModule` already imports
 * `RevisionsModule` for the public read path, so the revisions module cannot
 * import it back. The module that can see both is this one.
 *
 * `revisions:Read` gates the routes, but it is not the whole check: it says
 * the caller may read history, not whose. `PublishingService` also requires
 * the entity type's own Read permission, inside the service so that a future
 * route cannot mount these reads without it.
 */
@ApiTags('revisions')
@Controller('revisions')
export class RevisionsController {
  constructor(
    private readonly service: RevisionsService,
    private readonly publishingService: PublishingService,
  ) {}

  @Post()
  @RequirePermission('revisions', 'Create')
  create(@Body() dto: CreateRevisionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create({
      entityType: dto.entityType,
      entityId: new Types.ObjectId(dto.entityId),
      createdBy: new Types.ObjectId(user.userId),
    });
  }

  /** One page of a record's version history, newest first, with what became
   *  of each. Declared before `GET :id` so an entity-type query is never
   *  read as a revision id.
   *
   *  The DTO supplies both defaults, so a caller that asks for no page still
   *  gets a bounded one — this route is generic, and some entity types carry
   *  hundreds of versions. */
  @Get()
  @RequirePermission('revisions', 'Read')
  // Declared because the shape is an envelope rather than the list a
  // reader would assume from the route name.
  @ApiOkResponse({ type: RevisionHistoryPageDto })
  list(@Query() query: ListRevisionsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.publishingService.revisionHistory(
      query.entityType,
      new Types.ObjectId(query.entityId),
      user,
      query.page ?? 1,
      query.limit ?? 20,
    );
  }

  /** One version's content, reduced to the fields its entity type allows a
   *  reader to see — never the stored snapshot as it stands. */
  @Get(':id')
  @RequirePermission('revisions', 'Read')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.publishingService.readRevision(id, user);
  }
}
