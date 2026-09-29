import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import type { Request } from 'express';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { SkipAuditLog } from '../../../common/decorators/skip-audit-log.decorator.js';
import { extractRequestContext } from '../../../common/utils/request-context.util.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { SeasonsService } from './seasons.service.js';
import { CreateSeasonDto } from './dto/create-season.dto.js';
import { UpdateSeasonDto } from './dto/update-season.dto.js';
import { PublishSeasonDto } from './dto/publish-season.dto.js';
import { PublishingService } from '../../workflow/publishing/publishing.service.js';

const ENTITY_TYPE = 'seasons' as const;

/** Implements: `seasons` collection, Domain 5 — Media Center. */
@ApiTags('seasons')
@Controller('seasons')
export class SeasonsController {
  constructor(
    private readonly service: SeasonsService,
    private readonly publishingService: PublishingService,
  ) {}

  @Post()
  @RequirePermission('seasons', 'Create')
  create(@Body() dto: CreateSeasonDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('seasons', 'Read')
  findAll() {
    return this.service.findAll();
  }

  /**
   * The public archive.
   *
   * Declared before `public/:slug` — Nest matches in declaration order, and a
   * literal segment placed after a parameter is swallowed by it. Every route
   * below follows the same rule for the same reason, matching
   * `albums.controller.ts`'s established route-ordering convention.
   */
  @Get('public')
  @Public()
  listPublic() {
    return this.service.listPublic();
  }

  /** The current season, or `null` — still 200 — when none is current or the
   *  current one is not yet visible to the public. */
  @Get('public/current')
  @Public()
  getPublicCurrent() {
    return this.service.getPublicCurrent();
  }

  /** The individual public season page: `/seasons/public/:slug`. Declared
   *  last of the `public/*` group so `current` is never read as a slug. */
  @Get('public/:slug')
  @Public()
  getPublicBySlug(@Param('slug') slug: string) {
    return this.service.getPublicBySlug(slug);
  }

  @Get(':id')
  @RequirePermission('seasons', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @RequirePermission('seasons', 'Update')
  update(@Param('id') id: string, @Body() dto: UpdateSeasonDto) {
    return this.service.update(id, dto);
  }

  /** Makes this the current season, clearing whoever held it before. Rides
   *  the same `Update` permission `PATCH /albums/:id/featured` uses for an
   *  analogous single-holder flag, rather than a dedicated action. */
  @Patch(':id/set-current')
  @RequirePermission('seasons', 'Update')
  setCurrent(@Param('id') id: string) {
    return this.service.setCurrent(id);
  }

  /** Opens a review, for the case `publish` refuses: a policy requires one.
   *  The workflow definition comes from the policy, never from the caller —
   *  `articles` mounts the same shared call the same way, and the readiness
   *  bar is the one a direct publish would meet, because an approval ends in
   *  a publish. Gated on `Update`: submitting is an author's act. */
  @Post(':id/submit')
  @SkipAuditLog()
  @RequirePermission('seasons', 'Update')
  submit(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.publishingService.submit({
      entityType: ENTITY_TYPE,
      entityId: new Types.ObjectId(id),
      actor: user,
      context: extractRequestContext(req),
    });
  }

  /** The only route that may move a season into `Published` — gated by a
   *  dedicated `Publish` permission, distinct from `Create`/`Update`, and
   *  routed through `PublishingService` so a season's approval policy (or
   *  the absence of one) is the one door into that state (ADR-0125). */
  @Patch(':id/publish')
  @SkipAuditLog()
  @RequirePermission('seasons', 'Publish')
  publish(
    @Param('id') id: string,
    @Body() dto: PublishSeasonDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.publishingService.publishDirect({
      entityType: ENTITY_TYPE,
      entityId: new Types.ObjectId(id),
      actor: user,
      expectedUpdatedAt: new Date(dto.expectedUpdatedAt),
      context: extractRequestContext(req),
    });
  }

  @Delete(':id')
  @RequirePermission('seasons', 'Archive')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }

  /** See ADR-0120: not `:id/restore`, which is the revision restore. */
  @Post(':id/unarchive')
  @RequirePermission('seasons', 'Restore')
  unarchive(@Param('id') id: string) {
    return this.service.unarchive(id);
  }
}
