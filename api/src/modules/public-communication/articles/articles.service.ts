import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import type { QueryFilter } from 'mongoose';
import { ArticlesRepository } from './articles.repository.js';
import type { ArticleDocument } from './schemas/article.schema.js';
import { CreateArticleDto } from './dto/create-article.dto.js';
import { UpdateArticleDto } from './dto/update-article.dto.js';
import { QueryArticlesDto } from './dto/query-articles.dto.js';
import { ArticlePublicDto, toPublicDto } from './dto/article-public-response.dto.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import { PublicationsService } from '../../workflow/publications/publications.service.js';
import { AuditLogsService } from '../../workflow/audit-logs/audit-logs.service.js';
import { toPageSeo } from '../../../common/dto/page-seo.dto.js';
import { isDuplicateKeyError } from '../../../common/utils/mongo-errors.util.js';
import type { ArticleCategory } from './schemas/article.schema.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import type { RequestContext } from '../../workflow/workflow-instances/workflow-instances.service.js';

/**
 * The two facts an article audit row records either side of a change.
 *
 * An index signature as well as the two names, because the audit trail takes a
 * loose `Record<string, unknown>`. Declaring the fields alone would make this
 * unassignable to it, and widening the call site to `as Record<…>` would drop
 * the very typing that keeps an article's text out of these rows.
 */
interface ArticleState extends Record<string, unknown> {
  publicationState: string;
  archived: boolean;
}

/** Everything a Mongo regular expression treats as syntax. */
const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g;

/** A literal search term, safe to hand to Mongo. Unescaped, a `.*` typed into
 *  a public search box is a collection scan any visitor can trigger at will. */
const literalPattern = (term: string): RegExp => new RegExp(term.replace(REGEX_SPECIALS, '\\$&'), 'i');

/**
 * How many labels one article may carry, and how long each may be.
 *
 * An unbounded list turns a single article into an index of its own and the
 * card that draws them into an unbounded row. Ten is what a card holds at
 * 390px without wrapping past two lines; forty characters is a label rather
 * than a sentence.
 */
export const ARTICLE_TAG_MAX = 10;
export const ARTICLE_TAG_LENGTH = 40;

/**
 * What the newsroom typed, made storable without being made unreadable.
 *
 * Kept as typed, because the badge a visitor reads is this text and
 * lower-casing would print "uae". Trimmed, emptied and de-duplicated, because
 * it is also a filter key: "  Athletics " and "Athletics" must not be two
 * badges leading to the same list. De-duplication is case-insensitive for the
 * same reason the filter is — the first spelling wins, so the newsroom's
 * order survives.
 *
 * @throws BadRequestException when the list or one of its labels is too long.
 */
export const normaliseTags = (tags: readonly string[]): string[] => {
  const seen = new Set<string>();
  const kept: string[] = [];

  for (const raw of tags) {
    const tag = raw.trim();
    if (tag === '') continue;

    if (tag.length > ARTICLE_TAG_LENGTH) {
      throw new BadRequestException({
        code: 'badRequest',
        message: `A tag may be at most ${ARTICLE_TAG_LENGTH} characters; "${tag}" is ${tag.length}.`,
      });
    }

    const key = tag.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(tag);
  }

  if (kept.length > ARTICLE_TAG_MAX) {
    throw new BadRequestException({
      code: 'badRequest',
      message: `An article may carry at most ${ARTICLE_TAG_MAX} tags; ${kept.length} were sent.`,
    });
  }

  return kept;
};

/** What a visitor may narrow the public feed by. */
export interface PublicFeedFilter {
  category?: ArticleCategory;
  /** Inclusive, an ISO date or date-time. */
  from?: string;
  /** Inclusive to the end of that day — see `endOfDay`. */
  to?: string;
  search?: string;
  /** One label, matched case-insensitively against the article's own. */
  tag?: string;
}

/**
 * A date the caller supplied, or null where they supplied nonsense.
 *
 * `new Date('not-a-date')` is an Invalid Date, and every comparison against one
 * is false — so passing it through would answer an empty feed with nothing to
 * explain it. Null instead, and the bound is simply not applied.
 */
const parsedDate = (value: string | undefined): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * The last instant of the day a reader named.
 *
 * "Up to 30 June" means the whole of the 30th. Taking the bare date would mean
 * midnight, which silently drops everything published that day — the kind of
 * off-by-one nobody reports, because the result still looks like a list.
 */
const endOfDay = (date: Date): Date => {
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return end;
};

/** Implements: articles collection, Domain 4 — News & Editorial.
 *
 *  Owns what belongs to a news item; the review and the publication belong to
 *  `PublishingService`, which this service deliberately does not call. The
 *  controller wires the two together so neither has to know the other's rules.
 */
@Injectable()
export class ArticlesService {
  constructor(
    private readonly repository: ArticlesRepository,
    private readonly mediaAssetsService: MediaAssetsService,
    private readonly publicationsService: PublicationsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /** @throws ConflictException when another live article holds the slug.
   *  @throws NotFoundException/ConflictException when `coverMediaId` is not an
   *    existing, non-archived image. */
  create = async (
    dto: CreateArticleDto,
    actor: AuthenticatedUser,
    context: RequestContext = {},
  ): Promise<ArticleDocument> => {
    await this.assertSlugFree(dto.slug, null);
    if (dto.coverMediaId) {
      await this.mediaAssetsService.assertUsableImage(dto.coverMediaId);
    }

    const actorId = new Types.ObjectId(actor.userId);
    const created = await this.createOrConflict({
      title: dto.title,
      // The schema defaults this too; stating it here means the created
      // document says which shelf it is on rather than relying on a default
      // two layers away.
      category: dto.category ?? 'General',
      tags: normaliseTags(dto.tags ?? []),
      slug: dto.slug,
      coverMediaId: dto.coverMediaId ? new Types.ObjectId(dto.coverMediaId) : null,
      body: dto.body,
      authorDisplayName: dto.authorDisplayName,
      seo: dto.seo ? toPageSeo(dto.seo) : null,
      publicationState: 'Draft',
      archived: false,
      publishDate: null,
      createdBy: actorId,
      updatedBy: actorId,
    });

    await this.writeArticleAudit({
      action: 'Create',
      entityId: created._id as Types.ObjectId,
      actorId,
      previous: null,
      next: { publicationState: 'Draft', archived: false },
      reason: 'Article created',
      context,
    });

    return created;
  };

  /**
   * Saves the draft. Never publishes, and never changes `publicationState` —
   * that is `PublishingService`'s, through the controller's own routes.
   *
   * @throws NotFoundException when the article does not exist or is deleted.
   * @throws ConflictException when another live article holds the new slug.
   */
  update = async (
    id: string,
    dto: UpdateArticleDto,
    actor: AuthenticatedUser,
    context: RequestContext = {},
  ): Promise<ArticleDocument> => {
    const existing = await this.load(id);

    if (dto.slug !== undefined) {
      await this.assertSlugFree(dto.slug, existing._id as Types.ObjectId);
    }
    if (dto.coverMediaId) {
      await this.mediaAssetsService.assertUsableImage(dto.coverMediaId);
    }

    const actorId = new Types.ObjectId(actor.userId);
    const $set: Record<string, unknown> = { updatedBy: actorId };

    // Only what the caller actually sent. Spreading the DTO would write
    // `undefined` over fields nobody touched, which Mongoose stores as a
    // clearing rather than ignoring.
    if (dto.title !== undefined) $set.title = dto.title;
    if (dto.category !== undefined) $set.category = dto.category;
    if (dto.tags !== undefined) $set.tags = normaliseTags(dto.tags);
    if (dto.slug !== undefined) $set.slug = dto.slug;
    if (dto.body !== undefined) $set.body = dto.body;
    if (dto.authorDisplayName !== undefined) $set.authorDisplayName = dto.authorDisplayName;
    if (dto.coverMediaId !== undefined) {
      $set.coverMediaId = dto.coverMediaId ? new Types.ObjectId(dto.coverMediaId) : null;
    }
    if (dto.seo !== undefined) $set.seo = dto.seo ? toPageSeo(dto.seo) : null;

    const updated = await this.updateOrConflict(id, { $set });

    const state = this.stateOf(existing);
    await this.writeArticleAudit({
      action: 'Update',
      entityId: existing._id as Types.ObjectId,
      actorId,
      previous: state,
      // Editing changes neither of the two facts the trail records. Both sides
      // are written anyway, so a reader of the trail sees the state the change
      // happened in rather than having to find the nearest row that says.
      next: state,
      reason: 'Article draft saved',
      context,
    });

    return updated;
  };

  /**
   * Hides a published article from the feed, or returns it.
   *
   * Not an unpublish: the article stays `Live`, keeps its publication row and
   * keeps answering on its own URL. A link already shared, printed or indexed
   * must not start answering 404 because an editor tidied the listing.
   */
  setArchived = async (
    id: string,
    archived: boolean,
    actor: AuthenticatedUser,
    context: RequestContext = {},
  ): Promise<ArticleDocument> => {
    const existing = await this.load(id);
    const actorId = new Types.ObjectId(actor.userId);

    const updated = await this.updateOrConflict(id, { $set: { archived, updatedBy: actorId } });

    await this.writeArticleAudit({
      action: 'Update',
      entityId: existing._id as Types.ObjectId,
      actorId,
      previous: this.stateOf(existing),
      next: { publicationState: existing.publicationState, archived },
      reason: archived ? 'Article hidden from the public feed' : 'Article returned to the public feed',
      context,
    });

    return updated;
  };

  /** Soft-deletes the article. Its slug becomes free again, because the unique
   *  index is partial on `archivedAt: null`. */
  remove = async (
    id: string,
    actor: AuthenticatedUser,
    context: RequestContext = {},
  ): Promise<ArticleDocument> => {
    const existing = await this.load(id);
    const actorId = new Types.ObjectId(actor.userId);

    const deleted = await this.repository.softDelete(id, actorId);
    if (!deleted) {
      throw new NotFoundException(`Article ${id} not found.`);
    }

    await this.writeArticleAudit({
      action: 'Delete',
      entityId: existing._id as Types.ObjectId,
      actorId,
      previous: this.stateOf(existing),
      next: this.stateOf(existing),
      reason: 'Article deleted',
      context,
    });

    return deleted;
  };

  /** The newsroom's own listing: every state, newest first. */
  findPage = async (query: QueryArticlesDto): Promise<{ items: ArticleDocument[]; total: number }> => {
    const filter: QueryFilter<ArticleDocument> = {};

    if (query.publicationState) {
      filter.publicationState = query.publicationState;
    }
    if (query.category) {
      filter.category = query.category;
    }
    if (!query.includeArchived) {
      filter.archived = false;
    }
    if (query.search) {
      // Escaped, because an unescaped `.*` typed into a search box is a
      // collection scan any caller can trigger at will.
      const pattern = new RegExp(query.search.replace(REGEX_SPECIALS, '\\$&'), 'i');
      filter.$or = [{ 'title.ar': pattern }, { 'title.en': pattern }];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    return this.repository.findPage(filter, (page - 1) * limit, limit);
  };

  findById = async (id: string): Promise<ArticleDocument | null> => this.repository.findById(id);

  /**
   * The public feed's filter: always live and unhidden, plus whatever the
   * reader narrowed it by.
   *
   * Only supplied fields become keys. Sending `{ category: undefined }` to
   * Mongoose matches documents that HAVE no category, which is the opposite of
   * "every category" — the same trap `AuditLogsService.buildFilter` documents.
   */
  private publicFilter = (narrow: PublicFeedFilter): QueryFilter<ArticleDocument> => {
    const filter: Record<string, unknown> = { publicationState: 'Live', archived: false };

    if (narrow.category) {
      filter.category = narrow.category;
    }

    const from = parsedDate(narrow.from);
    const to = parsedDate(narrow.to);
    if (from || to) {
      filter.publishDate = {
        ...(from ? { $gte: from } : {}),
        ...(to ? { $lte: endOfDay(to) } : {}),
      };
    }

    if (narrow.tag) {
      // Anchored, so "relay" does not also answer "relay-final", and escaped
      // for the same reason the search term is: a tag arrives from the query
      // string and is as much a visitor's text as the search box.
      filter.tags = new RegExp(`^${narrow.tag.replace(REGEX_SPECIALS, '\\$&')}$`, 'i');
    }

    if (narrow.search) {
      filter.$or = [{ 'title.ar': literalPattern(narrow.search) }, { 'title.en': literalPattern(narrow.search) }];
    }

    return filter as QueryFilter<ArticleDocument>;
  };

  /**
   * The public feed: live, not hidden, newest first.
   *
   * Each row's content comes from its Live publication's revision, never from
   * the article row — the "Approved ≠ Published" rule. The row is read only to
   * learn which articles are live and in what order.
   */
  findPublicPage = async (
    page: number,
    limit: number,
    narrow: PublicFeedFilter = {},
  ): Promise<{ items: ArticlePublicDto[]; total: number }> => {
    const { items, total } = await this.repository.findPage(
      this.publicFilter(narrow),
      (page - 1) * limit,
      limit,
    );

    const snapshots = await Promise.all(
      items.map((article) => this.publicationsService.getPublicSnapshot('articles', article._id as Types.ObjectId)),
    );

    return {
      items: items.flatMap((article, index) => {
        const snapshot = snapshots[index];
        // A live row whose publication cannot be read is a broken pair, not a
        // half-article to render: it is dropped rather than shown with holes.
        return snapshot ? [toPublicDto(article, snapshot)] : [];
      }),
      total,
    };
  };

  /**
   * One article by its public URL segment, or null.
   *
   * Archived articles still answer here. Hiding one removes it from the feed;
   * it does not withdraw the address it was published at.
   */
  findPublicBySlug = async (slug: string): Promise<ArticlePublicDto | null> => {
    const article = await this.repository.findBySlug(slug);

    // A draft carries a slug from the moment it is written, so "the slug
    // exists" is not "the article is public".
    if (!article || article.publicationState !== 'Live') {
      return null;
    }

    const snapshot = await this.publicationsService.getPublicSnapshot('articles', article._id as Types.ObjectId);
    return snapshot ? toPublicDto(article, snapshot) : null;
  };

  /** Every live, visible article, for the news sitemap. Identity and dates
   *  only — the sitemap describes addresses, not content, so no publication
   *  is read. */
  findLiveForSitemap = async (): Promise<{ slug: string; publishDate: Date | null; updatedAt: Date | null }[]> => {
    const { items } = await this.repository.findPage(
      { publicationState: 'Live', archived: false } as QueryFilter<ArticleDocument>,
      0,
      // A sitemap file holds 50,000 URLs; a federation's newsroom will not
      // reach that, and a cap is still better than an unbounded read.
      5_000,
    );

    return items.map((article) => ({
      slug: article.slug,
      publishDate: article.publishDate,
      updatedAt: (article as ArticleDocument & { updatedAt?: Date }).updatedAt ?? null,
    }));
  };

  /**
   * One audit row per article change, carrying the decision and nothing else.
   *
   * `AuditLogInterceptor` is global and writes the pre-image and the whole
   * response body for every mutating request. For an article that means the
   * complete TipTap tree, in both languages, on every save — into the one
   * collection that is readable over HTTP. So every write route on this
   * controller carries `@SkipAuditLog()` and lands here instead (owner
   * decision 2026-09-20).
   *
   * What is recorded is who, when, which article, and the state either side.
   * What is not recorded is a single word of the article.
   */
  private writeArticleAudit = async (input: {
    action: 'Create' | 'Update' | 'Delete';
    entityId: Types.ObjectId;
    actorId: Types.ObjectId;
    previous: ArticleState | null;
    next: ArticleState;
    reason: string;
    context: RequestContext;
  }): Promise<void> => {
    await this.auditLogsService.write({
      actorId: input.actorId,
      action: input.action,
      entityType: 'articles',
      entityId: input.entityId,
      previousValue: input.previous,
      newValue: input.next,
      reason: input.reason,
      ipAddress: input.context.ipAddress ?? '',
      userAgent: input.context.userAgent ?? '',
    });
  };

  private stateOf = (article: ArticleDocument): ArticleState => ({
    publicationState: article.publicationState,
    archived: article.archived,
  });

  private load = async (id: string): Promise<ArticleDocument> => {
    const article = await this.repository.findById(id);
    if (!article) {
      throw new NotFoundException(`Article ${id} not found.`);
    }
    return article;
  };

  /**
   * Refuses a slug another live article holds.
   *
   * The partial-unique index is what actually enforces this; the check is here
   * so the editor is told at the field they just typed rather than by a raw
   * driver error. `self` is the article being edited, which must be allowed to
   * keep the slug it already has — otherwise a headline could not be corrected
   * without also renaming its URL.
   */
  private assertSlugFree = async (slug: string, self: Types.ObjectId | null): Promise<void> => {
    const holder = await this.repository.findBySlug(slug);
    if (!holder || (self && (holder._id as Types.ObjectId).equals(self))) {
      return;
    }
    throw new ConflictException({
      code: 'slugTaken',
      message: `Another article already uses the address "${slug}".`,
    });
  };

  /** The index is the real guard; these turn its raw duplicate-key error into
   *  something the person who caused it can read. Two writers can pass
   *  `assertSlugFree` at the same moment and only one of them can win. */
  private createOrConflict = async (data: Partial<ArticleDocument>): Promise<ArticleDocument> => {
    try {
      return await this.repository.create(data);
    } catch (error) {
      throw this.asSlugConflict(error, String(data.slug));
    }
  };

  private updateOrConflict = async (id: string, update: Record<string, unknown>): Promise<ArticleDocument> => {
    let updated: ArticleDocument | null;
    try {
      updated = await this.repository.updateById(id, update);
    } catch (error) {
      const slug = (update.$set as Record<string, unknown> | undefined)?.slug;
      throw this.asSlugConflict(error, String(slug ?? ''));
    }
    if (!updated) {
      throw new NotFoundException(`Article ${id} not found.`);
    }
    return updated;
  };

  private asSlugConflict = (error: unknown, slug: string): unknown => {
    if (!isDuplicateKeyError(error)) {
      return error;
    }
    return new ConflictException({
      code: 'slugTaken',
      message: `Another article already uses the address "${slug}".`,
    });
  };
}
