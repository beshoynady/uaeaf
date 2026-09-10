import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { MediaAsset } from './schemas/media-asset.schema.js';
import type { MediaAssetDocument } from './schemas/media-asset.schema.js';

/** Implements: mediaAssets collection, Domain 5 — Media Center. */
@Injectable()
export class MediaAssetsRepository extends BaseRepository<MediaAssetDocument> {
  constructor(@InjectModel(MediaAsset.name) model: Model<MediaAssetDocument>) {
    super(model);
  }

  /** The individual public album page's photo grid: only assets Media
   *  Center staff has left visible, in the CMS-controlled display order
   *  (2026-09-04 follow-on to ADR-0054). Backed by the
   *  `{albumId, isVisible, displayOrder}` index added in the hardening
   *  pass. */
  async findVisibleByAlbum(albumId: Types.ObjectId): Promise<MediaAssetDocument[]> {
    return this.model
      .find({ albumId, isVisible: true, archivedAt: null })
      .sort({ displayOrder: 1 })
      .exec();
  }

  /** Resolves a set of asset ids for an anonymous caller. Same visibility
   *  contract as `findVisibleByAlbum` — hidden and archived assets are
   *  invisible to the public site exactly as they are to a public album
   *  page — but keyed by id, because a page references its hero and section
   *  images individually rather than through an album. */
  /** The one read that ignores the soft-delete scope, because purging acts
   *  on an archived asset by definition — `BaseRepository.findById` filters
   *  `archivedAt: null` and would report every purgeable asset as missing. */
  async findIncludingArchived(id: string): Promise<MediaAssetDocument | null> {
    return this.model.findById(id).exec();
  }

  /** Irreversible removal of the row, used only after the stored object has
   *  actually been destroyed. Everything else on this platform soft-deletes;
   *  this exists because an archived record whose file is gone is not an
   *  archive, it is a broken reference. */
  async hardDelete(id: string): Promise<boolean> {
    const outcome = await this.model.deleteOne({ _id: id }).exec();
    return outcome.deletedCount === 1;
  }

  async findVisibleByIds(ids: Types.ObjectId[]): Promise<MediaAssetDocument[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.model.find({ _id: { $in: ids }, isVisible: true, archivedAt: null }).exec();
  }
}
