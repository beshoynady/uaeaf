import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { ContactMessage } from './schemas/contact-messages.schema.js';
import type { ContactMessageDocument, ContactMessageStatus } from './schemas/contact-messages.schema.js';

/** Implements: contactMessages collection, Domain 10 — Public Communication. */
@Injectable()
export class ContactMessagesRepository extends BaseRepository<ContactMessageDocument> {
  constructor(@InjectModel(ContactMessage.name) model: Model<ContactMessageDocument>) {
    super(model);
  }

  /** The inbox, newest first. */
  async findNewestFirst(): Promise<ContactMessageDocument[]> {
    return this.model.find({ archivedAt: null }).sort({ createdAt: -1 }).exec();
  }

  async countByStatus(status: ContactMessageStatus): Promise<number> {
    return this.model.countDocuments({ status, archivedAt: null }).exec();
  }
}
