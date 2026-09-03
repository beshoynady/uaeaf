import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { Video } from './schemas/video.schema.js';
import type { VideoDocument } from './schemas/video.schema.js';

/** Implements: videos collection, Domain 5 — Media Center. */
@Injectable()
export class VideosRepository extends BaseRepository<VideoDocument> {
  constructor(@InjectModel(Video.name) model: Model<VideoDocument>) {
    super(model);
  }
}
