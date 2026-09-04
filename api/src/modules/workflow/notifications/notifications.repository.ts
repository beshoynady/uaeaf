import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { Notification } from './schemas/notification.schema.js';
import type { NotificationDocument } from './schemas/notification.schema.js';

/** Implements: notifications collection, Domain 7. */
@Injectable()
export class NotificationsRepository extends BaseRepository<NotificationDocument> {
  constructor(@InjectModel(Notification.name) model: Model<NotificationDocument>) {
    super(model);
  }

  async findByRecipient(recipientId: Types.ObjectId): Promise<NotificationDocument[]> {
    return this.model.find({ recipientId, archivedAt: null }).sort({ timestamp: -1 }).exec();
  }

  /** Scoped to `recipientId` so one user can never mark another user's
   *  notification as read — matches on `_id` AND `recipientId` in a
   *  single query rather than checking ownership after a separate fetch,
   *  and returns `null` (not a thrown error) when they don't match, so
   *  the caller can't distinguish "not yours" from "doesn't exist". */
  async markReadForRecipient(id: string, recipientId: Types.ObjectId): Promise<NotificationDocument | null> {
    return this.model
      .findOneAndUpdate({ _id: id, recipientId, archivedAt: null }, { readState: true }, { returnDocument: 'after' })
      .exec();
  }
}
