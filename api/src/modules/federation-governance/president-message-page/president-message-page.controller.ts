import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { extractRequestContext } from '../../../common/utils/request-context.util.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { PresidentMessagePagesService } from './president-message-page.service.js';
import { CreatePresidentMessagePageDto } from './dto/create-president-message-page.dto.js';
import { UpdatePresidentMessagePageDto } from './dto/update-president-message-page.dto.js';
import {
  PublishPresidentMessagePageDto,
  RestorePresidentMessagePageDto,
} from './dto/publish-president-message-page.dto.js';
import { PublishingService } from '../../workflow/publishing/publishing.service.js';

const ENTITY_TYPE = 'presidentMessagePage' as const;

/** Implements: presidentMessagePage collection, Domain 1 — Federation & Governance. */
@ApiTags('president-message-page')
@Controller('president-message-page')
export class PresidentMessagePagesController {
  constructor(
    private readonly service: PresidentMessagePagesService,
    private readonly publishingService: PublishingService,
  ) {}

  @Post()
  @RequirePermission('presidentMessagePage', 'Create')
  create(@Body() dto: CreatePresidentMessagePageDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('presidentMessagePage', 'Read')
  findAll() {
    return this.service.findAll();
  }

  /** The message shown at `/about/president`: the Live publication of the
   *  sitting president's term (ADR-0069 D3). Declared ahead of `GET :id` so
   *  `current` is never swallowed as an `:id` value. */
  @Get('current/public')
  @Public()
  getCurrentPublic() {
    return this.service.getCurrentPublic();
  }

  @Get(':id')
  @RequirePermission('presidentMessagePage', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  /** Everything the dashboard's status panel draws, in one read — including
   *  which actions THIS caller may take, computed on the server so the
   *  dashboard never has to re-derive the rules and disagree. */
  @Get(':id/editorial-state')
  @RequirePermission('presidentMessagePage', 'Read')
  editorialState(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.publishingService.editorialState(ENTITY_TYPE, new Types.ObjectId(id), user);
  }

  /** Saves the draft. Editing is not publishing (ADR-0069 D5): this route
   *  never changes `publicationState` and never moves content to the public
   *  site — that is `POST :id/publish` or the approval workflow. */
  @Patch(':id')
  @RequirePermission('presidentMessagePage', 'Update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePresidentMessagePageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // While a review is running the draft belongs to that review — only an
    // assignee of the current step may change it (Mechanism 2). Otherwise
    // the approval would attach to content the approver never saw.
    await this.publishingService.assertCanEdit(ENTITY_TYPE, new Types.ObjectId(id), user);
    return this.service.update(id, dto, new Types.ObjectId(user.userId));
  }

  /** Publishes immediately, with no review. Allowed only when the policy
   *  says approvals are not required AND the caller holds Publish — a
   *  permission distinct from Update, so editing never implies publishing. */
  @Post(':id/publish')
  @RequirePermission('presidentMessagePage', 'Publish')
  publish(
    @Param('id') id: string,
    @Body() dto: PublishPresidentMessagePageDto,
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

  /** Opens a review. The workflow definition comes from the policy, never
   *  from the caller — closing audit finding OUT-04 for this entity type. */
  @Post(':id/submit')
  @RequirePermission('presidentMessagePage', 'Update')
  submit(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.publishingService.submit({
      entityType: ENTITY_TYPE,
      entityId: new Types.ObjectId(id),
      actor: user,
      context: extractRequestContext(req),
    });
  }

  /** Copies a past revision back over the draft. Publishes nothing — the
   *  restored draft re-enters the ordinary submit/publish path. */
  @Post(':id/restore')
  @RequirePermission('presidentMessagePage', 'Update')
  restore(
    @Param('id') id: string,
    @Body() dto: RestorePresidentMessagePageDto,
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

  /** The sole public read path for a workflow-governed entity: reads
   *  through `publications → revisions.snapshotData`, never this
   *  collection's own row (Week 2 "Approved ≠ Published" rule). Returns
   *  `null` when there is no current Live publication. */
  @Get(':id/public')
  @Public()
  getPublicSnapshot(@Param('id') id: string) {
    return this.service.getPublicSnapshot(id);
  }

  @Delete(':id')
  @RequirePermission('presidentMessagePage', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
