import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { extractRequestContext } from '../../../common/utils/request-context.util.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { AboutFederationPagesService } from './about-federation-page.service.js';
import { UpdateAboutFederationPageDto } from './dto/update-about-federation-page.dto.js';
import { ToggleAboutActiveDto } from './dto/toggle-about-active.dto.js';
import { PublishingService } from '../../workflow/publishing/publishing.service.js';
import { EditorialStateDto } from '../../workflow/publishing/editorial-state.dto.js';
import { PublishEditorialDto, RestoreEditorialDto } from '../../workflow/publishing/editorial-actions.dto.js';

const ENTITY_TYPE = 'aboutFederationPage' as const;

/**
 * Implements: aboutFederationPage collection, Domain 1 — Federation &
 * Governance.
 *
 * The editorial routes are the Strategic Plan's, on this entity type: saving
 * is not publishing, and publishing is its own grant. `PATCH :id/active` is
 * the one route that is neither — see its own note.
 */
@ApiTags('about-federation-page')
@Controller('about-federation-page')
export class AboutFederationPagesController {
  constructor(
    private readonly service: AboutFederationPagesService,
    private readonly publishingService: PublishingService,
  ) {}

  @Get()
  @RequirePermission('aboutFederationPage', 'Read')
  findAll() {
    return this.service.findAll();
  }

  /** The page at `/about`: the newest Live publication, already filtered to
   *  what a visitor may see. Declared ahead of `GET :id` so `current` is never
   *  read as an id. */
  @Get('current/public')
  @Public()
  getCurrentPublic() {
    return this.service.getCurrentPublic();
  }

  /** The whole draft as the dashboard edits it, hidden items included, with
   *  the activation switch that ordinary reads leave out. */
  @Get(':id')
  @RequirePermission('aboutFederationPage', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findForEditing(id);
  }

  /** Everything the dashboard's status panel draws, including which actions
   *  this caller may take, computed on the server. */
  @Get(':id/editorial-state')
  @RequirePermission('aboutFederationPage', 'Read')
  @ApiOkResponse({ type: EditorialStateDto })
  editorialState(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.publishingService.editorialState(ENTITY_TYPE, new Types.ObjectId(id), user);
  }

  /** Saves the draft. Never changes `publicationState` and never moves
   *  content to the public site. */
  @Patch(':id')
  @RequirePermission('aboutFederationPage', 'Update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAboutFederationPageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // While a review is running the draft belongs to that review.
    await this.publishingService.assertCanEdit(ENTITY_TYPE, new Types.ObjectId(id), user);
    return this.service.update(id, dto, new Types.ObjectId(user.userId));
  }

  /**
   * Switches the finished page on or off for visitors, at once.
   *
   * Three things make this route unlike every other write here, each
   * deliberate:
   *
   * - It does not go through the review cycle. Taking a live page down is an
   *   operational act that cannot wait for an approval, and putting one up is
   *   a decision made after the words were already approved.
   * - It is gated on `Publish`, not `Update`. Deciding what the public sees is
   *   a publishing decision; an editor who may rewrite the page still may not
   *   decide the moment it appears.
   * - It is allowed while a review holds the draft. The switch governs the
   *   version already live; a review in progress concerns the next one, and
   *   blocking the switch on it would mean a page could not be taken down
   *   because someone happened to be editing it.
   *
   * The response carries the document, and so `_id`: the audit-log
   * interceptor records a write only when it can name the record, so a
   * response without one would leave this change untraceable.
   */
  @Patch(':id/active')
  @RequirePermission('aboutFederationPage', 'Publish')
  setActive(
    @Param('id') id: string,
    @Body() dto: ToggleAboutActiveDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.setActive(id, dto.isActive, new Types.ObjectId(user.userId));
  }

  /** Publishes with no review, only where the policy requires none and the
   *  caller holds Publish. */
  @Post(':id/publish')
  @RequirePermission('aboutFederationPage', 'Publish')
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
  @RequirePermission('aboutFederationPage', 'Update')
  submit(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.publishingService.submit({
      entityType: ENTITY_TYPE,
      entityId: new Types.ObjectId(id),
      actor: user,
      context: extractRequestContext(req),
    });
  }

  /** Publishes what a completed review approved — a separate act from
   *  approving it, and a separate grant from editing it. */
  @Post(':id/publish-approved')
  @RequirePermission('aboutFederationPage', 'Publish')
  publishApproved(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.publishingService.publishApproved({
      entityType: ENTITY_TYPE,
      entityId: new Types.ObjectId(id),
      actor: user,
      context: extractRequestContext(req),
    });
  }

  /** Copies a past revision back over the draft. Publishes nothing, and
   *  cannot change whether the page is live: `isActive` is never frozen into
   *  a revision (see the schema). */
  @Post(':id/restore')
  @RequirePermission('aboutFederationPage', 'Update')
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
   *  collection's own row. `null` when nothing is Live. */
  @Get(':id/public')
  @Public()
  getPublicSnapshot(@Param('id') id: string) {
    return this.service.getPublicSnapshot(id);
  }

  @Delete(':id')
  @RequirePermission('aboutFederationPage', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
