import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { Album } from './schemas/album.schema.js';
import type { AlbumDocument } from './schemas/album.schema.js';
import type { ContentAssociation } from '../../common/schemas/content-association.schema.js';

/** Implements: albums collection, Domain 5 — Media Center. */
@Injectable()
export class AlbumsRepository extends BaseRepository<AlbumDocument> {
  constructor(@InjectModel(Album.name) model: Model<AlbumDocument>) {
    super(model);
  }

  /** The individual public album page's routing lookup: only a `Published`
   *  album resolves; a Draft/Archived album or unknown slug returns `null`
   *  so the caller 404s, mirroring `PagesService.findPublishedBySlug()`
   *  (2026-09-04 follow-on to ADR-0054). */
  async findPublishedBySlug(slug: string): Promise<AlbumDocument | null> {
    return this.findOne({ slug, publicationState: 'Published' });
  }

  /** Other published albums sharing at least one association target with
   *  `associations` — the "related albums" strip, per the design intent
   *  already recorded on the associations field itself: "...grouped for
   *  display by querying on shared association targets, not by
   *  parent-child nesting" (2026-09-04 follow-on to ADR-0054). Returns an
   *  empty array without querying when `associations` is empty, rather
   *  than building an `$or` from zero conditions. */
  async findRelated(
    associations: ContentAssociation[],
    excludeId: Types.ObjectId,
    limit: number,
  ): Promise<AlbumDocument[]> {
    if (associations.length === 0) {
      return [];
    }
    const or = associations.map((association) => ({
      associations: { $elemMatch: { ownerType: association.ownerType, ownerId: association.ownerId } },
    }));
    return this.model
      .find({ _id: { $ne: excludeId }, publicationState: 'Published', archivedAt: null, $or: or })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .exec();
  }
}
