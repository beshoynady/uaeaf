import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { extractRequestContext } from '../../../common/utils/request-context.util.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { PLAN_LIST_KEYS, StrategicPlansPagesService } from './strategic-plans-page.service.js';
import type { PlanListKey } from './strategic-plans-page.service.js';
import { CreateStrategicPlansPageDto } from './dto/create-strategic-plans-page.dto.js';
import { UpdateStrategicPlansPageDto } from './dto/update-strategic-plans-page.dto.js';
import { ReorderPlanListDto } from './dto/reorder-plan-list.dto.js';
import { StrategicPlanPublicResponseDto } from './dto/strategic-plan-public-response.dto.js';
import { PublishingService } from '../../workflow/publishing/publishing.service.js';
import { EditorialStateDto } from '../../workflow/publishing/editorial-state.dto.js';
import { PublishEditorialDto, RestoreEditorialDto } from '../../workflow/publishing/editorial-actions.dto.js';

const ENTITY_TYPE = 'strategicPlansPage' as const;

const isPlanListKey = (value: string): value is PlanListKey => (PLAN_LIST_KEYS as readonly string[]).includes(value);

/** Implements: strategicPlansPage collection, Domain 1 — Federation & Governance.
 *  The editorial routes are the Vision & Mission page's, on this entity
 *  type: saving is not publishing, and publishing is its own grant. */
@ApiTags('strategic-plans-page')
@Controller('strategic-plans-page')
export class StrategicPlansPagesController {
  constructor(
    private readonly service: StrategicPlansPagesService,
    private readonly publishingService: PublishingService,
  ) {}

  @Post()
  @RequirePermission('strategicPlansPage', 'Create')
  create(@Body() dto: CreateStrategicPlansPageDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('strategicPlansPage', 'Read')
  findAll() {
    return this.service.findAll();
  }

  /** The page at `/about/governance/strategic-plan`: the newest Live
   *  publication. Declared ahead of `GET :id` so `current` is never read as
   *  an id. */
  @Get('current/public')
  @Public()
  @ApiOkResponse({ type: StrategicPlanPublicResponseDto })
  getCurrentPublic() {
    return this.service.getCurrentPublic();
  }

  @Get(':id')
  @RequirePermission('strategicPlansPage', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  /** Everything the dashboard's status panel draws, including which actions
   *  this caller may take, computed on the server. */
  @Get(':id/editorial-state')
  @RequirePermission('strategicPlansPage', 'Read')
  @ApiOkResponse({ type: EditorialStateDto })
  editorialState(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.publishingService.editorialState(ENTITY_TYPE, new Types.ObjectId(id), user);
  }

  /** Saves the draft. Never changes `publicationState` and never moves
   *  content to the public site. */
  @Patch(':id')
  @RequirePermission('strategicPlansPage', 'Update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStrategicPlansPageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // While a review is running the draft belongs to that review.
    await this.publishingService.assertCanEdit(ENTITY_TYPE, new Types.ObjectId(id), user);
    return this.service.update(id, dto, new Types.ObjectId(user.userId));
  }

  /** Reorders one of the five lists by its item ids. A draft edit like
   *  `PATCH :id`, under the same review lock. */
  @Patch(':id/lists/:list/order')
  @RequirePermission('strategicPlansPage', 'Update')
  @ApiParam({ name: 'list', enum: PLAN_LIST_KEYS })
  async reorderList(
    @Param('id') id: string,
    @Param('list') list: string,
    @Body() dto: ReorderPlanListDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!isPlanListKey(list)) {
      throw new BadRequestException({
        code: 'unknownList',
        message: `"${list}" is not a list of the strategic plan page.`,
        lists: PLAN_LIST_KEYS,
      });
    }
    await this.publishingService.assertCanEdit(ENTITY_TYPE, new Types.ObjectId(id), user);
    return this.service.reorderList(id, list, dto.ids, new Types.ObjectId(user.userId));
  }

  /** Publishes with no review, only where the policy requires none and the
   *  caller holds Publish. */
  @Post(':id/publish')
  @RequirePermission('strategicPlansPage', 'Publish')
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
  @RequirePermission('strategicPlansPage', 'Update')
  submit(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.publishingService.submit({
      entityType: ENTITY_TYPE,
      entityId: new Types.ObjectId(id),
      actor: user,
      context: extractRequestContext(req),
    });
  }

  /** Copies a past revision back over the draft. Publishes nothing. */
  @Post(':id/restore')
  @RequirePermission('strategicPlansPage', 'Update')
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
   *  collection's own row, and answers with the same public projection as
   *  `current/public`. Returns `null` when nothing is Live. */
  @Get(':id/public')
  @Public()
  @ApiOkResponse({ type: StrategicPlanPublicResponseDto })
  getPublicSnapshot(@Param('id') id: string) {
    return this.service.getPublicSnapshot(id);
  }

  @Delete(':id')
  @RequirePermission('strategicPlansPage', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
