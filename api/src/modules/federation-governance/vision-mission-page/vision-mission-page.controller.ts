import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { extractRequestContext } from '../../../common/utils/request-context.util.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { VisionMissionPagesService } from './vision-mission-page.service.js';
import { CreateVisionMissionPageDto } from './dto/create-vision-mission-page.dto.js';
import { UpdateVisionMissionPageDto } from './dto/update-vision-mission-page.dto.js';
import { VisionMissionPublicResponseDto } from './dto/vision-mission-public-response.dto.js';
import { PublishingService } from '../../workflow/publishing/publishing.service.js';
import { EditorialStateDto } from '../../workflow/publishing/editorial-state.dto.js';
import { PublishEditorialDto, RestoreEditorialDto } from '../../workflow/publishing/editorial-actions.dto.js';

const ENTITY_TYPE = 'visionMissionPage' as const;

/** Implements: visionMissionPage collection, Domain 1 — Federation & Governance.
 *  The editorial routes are the President's Message's, on this entity type
 *  (ADR-0070): saving is not publishing, and publishing is its own grant. */
@ApiTags('vision-mission-page')
@Controller('vision-mission-page')
export class VisionMissionPagesController {
  constructor(
    private readonly service: VisionMissionPagesService,
    private readonly publishingService: PublishingService,
  ) {}

  @Post()
  @RequirePermission('visionMissionPage', 'Create')
  create(@Body() dto: CreateVisionMissionPageDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('visionMissionPage', 'Read')
  findAll() {
    return this.service.findAll();
  }

  /** The page at `/about/governance/vision-mission`: the newest Live
   *  publication. Declared ahead of `GET :id` so `current` is never read as
   *  an id. */
  @Get('current/public')
  @Public()
  @ApiOkResponse({ type: VisionMissionPublicResponseDto })
  getCurrentPublic() {
    return this.service.getCurrentPublic();
  }

  @Get(':id')
  @RequirePermission('visionMissionPage', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  /** Everything the dashboard's status panel draws, including which actions
   *  this caller may take, computed on the server. */
  @Get(':id/editorial-state')
  @RequirePermission('visionMissionPage', 'Read')
  @ApiOkResponse({ type: EditorialStateDto })
  editorialState(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.publishingService.editorialState(ENTITY_TYPE, new Types.ObjectId(id), user);
  }

  /** Saves the draft. Never changes `publicationState` and never moves
   *  content to the public site. */
  @Patch(':id')
  @RequirePermission('visionMissionPage', 'Update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVisionMissionPageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // While a review is running the draft belongs to that review.
    await this.publishingService.assertCanEdit(ENTITY_TYPE, new Types.ObjectId(id), user);
    return this.service.update(id, dto, new Types.ObjectId(user.userId));
  }

  /** Publishes with no review, only where the policy requires none and the
   *  caller holds Publish. */
  @Post(':id/publish')
  @RequirePermission('visionMissionPage', 'Publish')
  publish(
    @Param('id') id: string,
    @Body() dto: PublishEditorialDto,
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

  /** Opens a review; the workflow definition comes from the policy. */
  @Post(':id/submit')
  @RequirePermission('visionMissionPage', 'Update')
  submit(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.publishingService.submit({
      entityType: ENTITY_TYPE,
      entityId: new Types.ObjectId(id),
      actor: user,
      context: extractRequestContext(req),
    });
  }

  /** Publishes what a completed review approved — a separate act from
   *  approving it, and a separate grant from editing it. Approval used to
   *  publish by itself; separating them lets the federation require a review
   *  without also surrendering the moment of publication (owner decision
   *  2026-09-20). */
  @Post(':id/publish-approved')
  @RequirePermission('visionMissionPage', 'Publish')
  publishApproved(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.publishingService.publishApproved({
      entityType: ENTITY_TYPE,
      entityId: new Types.ObjectId(id),
      actor: user,
      context: extractRequestContext(req),
    });
  }

  /** Copies a past revision back over the draft. Publishes nothing. */
  @Post(':id/restore')
  @RequirePermission('visionMissionPage', 'Update')
  restore(
    @Param('id') id: string,
    @Body() dto: RestoreEditorialDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.publishingService.restore({
      entityType: ENTITY_TYPE,
      entityId: new Types.ObjectId(id),
      revisionId: dto.revisionId,
      actor: user,
      context: extractRequestContext(req),
    });
  }

  /** Reads through `publications → revisions.snapshotData`, never this
   *  collection's own row. Returns `null` when nothing is Live. */
  @Get(':id/public')
  @Public()
  getPublicSnapshot(@Param('id') id: string) {
    return this.service.getPublicSnapshot(id);
  }

  @Delete(':id')
  @RequirePermission('visionMissionPage', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
