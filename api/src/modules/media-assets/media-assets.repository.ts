import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { MediaAsset } from './schemas/media-asset.schema.js';
import type { MediaAssetDocument } from './schemas/media-asset.schema.js';

/** Implements: mediaAssets collection, Domain 5 — Media Center. */
@Injectable()
export class MediaAssetsRepository extends BaseRepository<MediaAssetDocument> {
  constructor(@InjectModel(MediaAsset.name) model: Model<MediaAssetDocument>) {
    super(model);
  }
}
