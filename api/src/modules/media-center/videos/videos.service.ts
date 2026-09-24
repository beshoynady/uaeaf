import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { VideosRepository } from './videos.repository.js';
import type { VideoDocument, VideoStatus } from './schemas/video.schema.js';
import { CreateVideoDto } from './dto/create-video.dto.js';
import { UpdateVideoDto } from './dto/update-video.dto.js';
import { buildPublicVideoFilter } from './videos.public-filter.js';
import { toPublicVideo } from './dto/video-public-response.dto.js';
import { resolveVideo } from './resolve/resolve.service.js';
import type { PublicVideoQuery } from './videos.public-filter.js';
import type { VideoPublicResponseDto } from './dto/video-public-response.dto.js';
import type { ResolveFallback, ResolvedVideo } from './resolve/resolve.service.js';

/** A page a caller may ask for, and the ceiling on one. `?limit=100000` is a
 *  request to read the collection into memory; the cap is what makes that
 *  request harmless rather than a matter of trust. */
const DEFAULT_PUBLIC_LIMIT = 12;
const MAX_PUBLIC_LIMIT = 48;
/** Implements: videos collection, Domain 5 — Media Center (FigJam node
 *  `92:7326`).
 *
 *  The one rule that lives here rather than in the schema is `publishedAt`,
 *  because it is about a *transition* and a schema default cannot express one:
 *  it is stamped when a draft first becomes published, preserved across later
 *  edits, and cleared when a video goes back to draft. The public library
 *  orders by it and the season filter is derived from it, so a row that is
 *  published without one would be unsortable and unfindable.
 *
 *  The legacy `isLive` invariant is still enforced at the schema layer
 *  (partial unique index + pre-save hook). Nothing writes it any more — live
 *  broadcasts are their own collection — and it is recorded as debt. */

@Injectable()
export class VideosService {
  constructor(private readonly repository: VideosRepository) {}

  async create(dto: CreateVideoDto): Promise<VideoDocument> {
    return this.repository.create({
      title: dto.title,
      category: dto.category,
      kind: dto.kind ?? 'video',
      externalPlatform: dto.externalPlatform,
      externalUrl: dto.externalUrl,
      externalId: dto.externalId,
      status: 'draft',
      publishedAt: null,
      thumbnailId: dto.thumbnailId ? new Types.ObjectId(dto.thumbnailId) : null,
      associations: (dto.associations ?? []).map((association) => ({
        ownerType: association.ownerType,
        ownerId: new Types.ObjectId(association.ownerId),
        role: association.role ?? 'Related',
        displayOrder: association.displayOrder ?? 0,
      })),
      tags: dto.tags ?? [],
    });
  }

  /**
   * Apply an editor's changes, deciding `publishedAt` from the transition
   * rather than from what was sent.
   *
   * An explicit `publishedAt` is honoured — that is how a back-dated import
   * keeps its real date — but the common path never carries one, so an editor
   * cannot accidentally reorder the library by typing in a field.
   */
  async update(id: string, patch: UpdateVideoDto): Promise<VideoDocument | null> {
    const current = await this.repository.findById(id);
    if (!current) return null;

    const changes: Record<string, unknown> = { ...patch };

    if (patch.thumbnailId !== undefined) {
      changes.thumbnailId = patch.thumbnailId ? new Types.ObjectId(patch.thumbnailId) : null;
    }

    const nextStatus = (patch.status ?? current.status) as VideoStatus;
    const wasPublished = current.status === 'published';

    if (patch.publishedAt === undefined) {
      if (nextStatus === 'published' && !wasPublished) changes.publishedAt = new Date();
      if (nextStatus === 'draft' && wasPublished) changes.publishedAt = null;
    }

    return this.repository.updateById(id, changes);
  }

  /**
   * The public library: published, unarchived, newest first.
   *
   * `limit` is clamped rather than trusted. It arrives in a query string, and
   * `?limit=100000` from anyone on the internet is a request to read the whole
   * collection into memory and serialise it.
   */
  async findPublicPage(
    page: number,
    limit: number,
    query: PublicVideoQuery = {},
  ): Promise<{ items: VideoPublicResponseDto[]; total: number; page: number; limit: number }> {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), MAX_PUBLIC_LIMIT) : DEFAULT_PUBLIC_LIMIT;

    const { items, total } = await this.repository.findPublicPage(
      buildPublicVideoFilter(query),
      (safePage - 1) * safeLimit,
      safeLimit,
    );

    return { items: items.map(toPublicVideo), total, page: safePage, limit: safeLimit };
  }

  /**
   * Several published videos by id, in the order the ids were given.
   *
   * The order is the caller’s, not the database’s: this serves the
   * carousel’s manual source, where an editor arranged the videos by hand and
   * Mongo’s own ordering would silently disagree with the dashboard.
   * Unpublished or archived ids simply do not come back.
   */
  async findPublicByIds(ids: readonly string[]): Promise<VideoPublicResponseDto[]> {
    const valid = ids.filter((id) => Types.ObjectId.isValid(id));
    if (valid.length === 0) return [];

    const found = await this.repository.findPublicByIds(valid);
    const byId = new Map(found.map((video) => [String(video._id), toPublicVideo(video)]));

    return valid.flatMap((id) => { const video = byId.get(id); return video ? [video] : []; });
  }
  /**
   * Read a pasted link. Admin-only: it makes an outbound request on caller
   * input, so it is never exposed publicly however harmless the allowlist
   * makes it look.
   */
  async resolve(url: string): Promise<ResolvedVideo | ResolveFallback | null> {
    return resolveVideo(url);
  }

  async findAll(): Promise<VideoDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<VideoDocument | null> {
    return this.repository.findById(id);
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<VideoDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
