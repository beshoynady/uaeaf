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

  /** One page of an album's visible photos, plus how many there are.
   *
   *  The page and the count are two queries issued together, not one: they can
   *  in principle observe different moments, and a photo hidden between them
   *  would leave the caller one short of the total it was told. That window is
   *  microseconds wide against an album an editor edits by hand, and closing
   *  it would mean a transaction for a read — so the risk is accepted, and
   *  named here rather than hidden behind a claim of atomicity. */
  async findVisiblePageByAlbum(
    albumId: Types.ObjectId,
    skip: number,
    limit: number,
  ): Promise<{ items: MediaAssetDocument[]; total: number }> {
    const filter = { albumId, isVisible: true, archivedAt: null };
    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ displayOrder: 1 }).skip(skip).limit(limit).exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, total };
  }

  /** Writes `displayOrder` from each id's position, in one round trip.
   *  A loop of saves would leave the grid half-reordered on a failure
   *  partway, and the editor would be looking at an arrangement nobody
   *  chose. */
  async applyOrder(photoIds: readonly string[]): Promise<void> {
    if (photoIds.length === 0) {
      return;
    }
    await this.model.bulkWrite(
      photoIds.map((id, index) => ({
        updateOne: { filter: { _id: new Types.ObjectId(id) }, update: { $set: { displayOrder: index } } },
      })),
    );
  }

  async findVisibleByIds(ids: Types.ObjectId[]): Promise<MediaAssetDocument[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.model.find({ _id: { $in: ids }, isVisible: true, archivedAt: null }).exec();
  }
}
