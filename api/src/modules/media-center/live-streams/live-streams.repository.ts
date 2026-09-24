import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { LiveStream } from './schemas/live-stream.schema.js';
import type { LiveStreamDocument } from './schemas/live-stream.schema.js';

/** Implements: liveStreams collection, Domain 5 — Media Center. */
@Injectable()
export class LiveStreamsRepository extends BaseRepository<LiveStreamDocument> {
  constructor(@InjectModel(LiveStream.name) model: Model<LiveStreamDocument>) {
    super(model);
  }

  /** The one active row, if its window has not closed. Time is compared here
   *  rather than by a scheduled job — see the schema's note. */
  async findActive(now: Date): Promise<LiveStreamDocument | null> {
    return this.model.findOne({ isActive: true, expectedEndAt: { $gt: now }, archivedAt: null }).exec();
  }

  async countActive(): Promise<number> {
    return this.model.countDocuments({ isActive: true }).exec();
  }

  /** Close whatever is running. */
  async deactivateAll(endedAt: Date): Promise<void> {
    await this.model.updateMany({ isActive: true }, { isActive: false, endedAt }).exec();
  }
}
