import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { Video } from './schemas/video.schema.js';
import type { VideoDocument } from './schemas/video.schema.js';
import type { QueryFilter } from 'mongoose';

/** Implements: videos collection, Domain 5 — Media Center. */
@Injectable()
export class VideosRepository extends BaseRepository<VideoDocument> {
  constructor(@InjectModel(Video.name) model: Model<VideoDocument>) {
    super(model);
  }

  /** The published videos among these ids, unordered. The caller restores
   *  the order it asked in — see `VideosService.findPublicByIds`. */
  async findPublicByIds(ids: readonly string[]): Promise<VideoDocument[]> {
    return this.model
      .find({ _id: { $in: ids }, status: 'published', archivedAt: null })
      .exec();
  }

  /**
   * One page of videos, newest first.
   *
   * `findPaginated` on the base repository does not sort, and an unsorted page
   * is not a page: Mongo's natural order can change between two requests, so a
   * reader paging forward would see the same video twice and miss another. The
   * order is `publishedAt` descending and nothing else — there is deliberately
   * no `order` field on a video (owner decision 2026-09-23), so the library
   * and the admin table cannot disagree about what "first" means.
   *
   * `_id` breaks the tie, because two videos published in the same second
   * would otherwise swap places between requests for the same reason.
   */
  async findPublicPage(
    filter: QueryFilter<VideoDocument>,
    skip: number,
    limit: number,
  ): Promise<{ items: VideoDocument[]; total: number }> {
    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ publishedAt: -1, _id: -1 }).skip(skip).limit(limit).exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, total };
  }
}
