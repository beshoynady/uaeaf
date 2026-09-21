import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { SkipAuditLog } from '../../../common/decorators/skip-audit-log.decorator.js';
import { extractRequestContext } from '../../../common/utils/request-context.util.js';
import { PublicFeedQueryDto } from './dto/public-feed-query.dto.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { ArticlesService } from './articles.service.js';
import { CreateArticleDto } from './dto/create-article.dto.js';
import { UpdateArticleDto } from './dto/update-article.dto.js';
import { QueryArticlesDto } from './dto/query-articles.dto.js';
import { PublishArticleDto, SetArchivedDto } from './dto/article-actions.dto.js';
import { ArticlePublicDto } from './dto/article-public-response.dto.js';
import { PublishingService } from '../../workflow/publishing/publishing.service.js';
import { EditorialStateDto } from '../../workflow/publishing/editorial-state.dto.js';

const ENTITY_TYPE = 'articles' as const;

/**
 * Implements: articles collection, Domain 4 — News & Editorial.
 *
 * Every write route carries `@SkipAuditLog()`. `AuditLogInterceptor` is global
 * and records the pre-image and the whole response body for each mutating
 * request; for an article that is the complete TipTap tree, in both languages,
 * on every save, written into the one collection that is readable over HTTP.
 * `ArticlesService` writes a short row naming the decision instead (owner
 * decision 2026-09-20).
 */
@ApiTags('articles')
@Controller('articles')
export class ArticlesController {
  constructor(
    private readonly service: ArticlesService,
    private readonly publishingService: PublishingService,
  ) {}

  /** The public feed. Declared ahead of `GET :id` so `public` is never read as
   *  an id — the route-ordering convention `pages.controller.ts` set. */
  @Get('public')
  @Public()
  findPublic(@Query() query: PublicFeedQueryDto) {
    return this.service.findPublicPage(query.page ?? 1, query.limit ?? 12, {
      category: query.category,
      tag: query.tag,
      from: query.from,
      to: query.to,
      search: query.search,
    });
  }

  /** One article by its URL segment — what `/news/<slug>` renders. */
  @Get('public/:slug')
  @Public()
  @ApiOkResponse({ type: ArticlePublicDto })
  findPublicBySlug(@Param('slug') slug: string) {
    return this.service.findPublicBySlug(slug);
  }

  /** Every live address, for the news sitemap (Chapter 14 §13). */
  @Get('public-sitemap')
  @Public()
  sitemap() {
    return this.service.findLiveForSitemap();
  }

  @Post()
  @SkipAuditLog()
  @RequirePermission('articles', 'Create')
  create(@Body() dto: CreateArticleDto, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.service.create(dto, user, extractRequestContext(req));
  }

  /** The newsroom's listing: every state, filterable and searchable. */
  @Get()
  @RequirePermission('articles', 'Read')
  findAll(@Query() query: QueryArticlesDto) {
    return this.service.findPage(query);
  }

  /**
   * The newsroom's own numbers, for the cards above its list.
   *
   * Declared ahead of `GET :id` so `summary` is never read as an id — the
   * route-ordering convention `public` already follows here.
   *
   * Two reads joined, because two collections hold the answer: the articles
   * collection knows how many are drafts, live, hidden and on which shelf, and
   * the workflow engine knows how many are under review or carrying a standing
   * approval. Computing either from the other would be a second opinion about
   * a fact it does not hold.
   */
  @Get('summary')
  @RequirePermission('articles', 'Read')
  async summary() {
    const [articles, reviews] = await Promise.all([
      this.service.summarise(),
      this.publishingService.countRecordsByStatus(ENTITY_TYPE),
    ]);

    return {
      ...articles,
      // Named for what a reader of the card row is asking, not for the engine's
      // enum: "waiting on a reviewer" and "approved, waiting for a publisher"
      // are the two questions a newsroom has about its own queue.
      inReview: reviews.InProgress ?? 0,
      awaitingPublication: reviews.Approved ?? 0,
      changesRequested: (reviews.Returned ?? 0) + (reviews.Rejected ?? 0),
    };
  }

  @Get(':id')
  @RequirePermission('articles', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  /** Everything the dashboard's status panel draws, including which actions
   *  THIS caller may take — computed on the server so the dashboard never
   *  re-derives the rules and disagrees. */
  @Get(':id/editorial-state')
  @RequirePermission('articles', 'Read')
  @ApiOkResponse({ type: EditorialStateDto })
  editorialState(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.publishingService.editorialState(ENTITY_TYPE, new Types.ObjectId(id), user);
  }

  /** Saves the draft. Editing is not publishing: this route never changes
   *  `publicationState` and never moves content to the public site. */
  @Patch(':id')
  @SkipAuditLog()
  @RequirePermission('articles', 'Update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    // While a review is running the draft belongs to it — only an assignee of
    // the current step may change it. Otherwise the approval would attach to
    // content the approver never saw.
    await this.publishingService.assertCanEdit(ENTITY_TYPE, new Types.ObjectId(id), user);
    return this.service.update(id, dto, user, extractRequestContext(req));
  }

  /** Opens a review. The workflow definition comes from the policy, never
   *  from the caller. */
  @Post(':id/submit')
  @SkipAuditLog()
  @RequirePermission('articles', 'Update')
  submit(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.publishingService.submit({
      entityType: ENTITY_TYPE,
      entityId: new Types.ObjectId(id),
      actor: user,
      context: extractRequestContext(req),
    });
  }

  /** Publishes immediately, with no review. Allowed only while the policy
   *  says approvals are not required AND the caller holds Publish. */
  @Post(':id/publish')
  @SkipAuditLog()
  @RequirePermission('articles', 'Publish')
  publish(
    @Param('id') id: string,
    @Body() dto: PublishArticleDto,
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

  /** Publishes what a completed review approved — a separate act from
   *  approving it, and a separate grant from editing it. */
  @Post(':id/publish-approved')
  @SkipAuditLog()
  @RequirePermission('articles', 'Publish')
  publishApproved(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.publishingService.publishApproved({
      entityType: ENTITY_TYPE,
      entityId: new Types.ObjectId(id),
      actor: user,
      context: extractRequestContext(req),
    });
  }

  /** Copies a past revision back over the draft. Publishes nothing — the
   *  restored draft re-enters the ordinary submit or publish path. */
  @Post(':id/restore')
  @SkipAuditLog()
  @RequirePermission('articles', 'Update')
  restore(
    @Param('id') id: string,
    @Body() dto: { revisionId: string },
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

  /** Hides a published article from the feed, or returns it. Never deletes,
   *  and never withdraws the address the article was published at. */
  @Patch(':id/archived')
  @SkipAuditLog()
  @RequirePermission('articles', 'Update')
  setArchived(
    @Param('id') id: string,
    @Body() dto: SetArchivedDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.service.setArchived(id, dto.archived, user, extractRequestContext(req));
  }

  @Delete(':id')
  @SkipAuditLog()
  @RequirePermission('articles', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.service.remove(id, user, extractRequestContext(req));
  }
}
