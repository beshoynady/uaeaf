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
}
