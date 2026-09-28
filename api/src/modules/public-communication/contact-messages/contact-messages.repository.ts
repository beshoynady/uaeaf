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

  /** The one read that ignores the soft-delete scope, because a message is
   *  archived before it can be erased — `findById` filters `archivedAt: null`
   *  and would report every erasable message as missing. */
  async findIncludingArchived(id: string): Promise<ContactMessageDocument | null> {
    return this.model.findById(id).exec();
  }

  /** Irreversible removal of the row, behind the three conditions in
   *  `ContactMessagesService.permanentDelete`. Everything else on this platform
   *  soft-deletes; a citizen's own submission is within a PDPL erasure right,
   *  which an archive does not satisfy (ADR-0120 §D5). */
  async hardDelete(id: string): Promise<boolean> {
    const outcome = await this.model.deleteOne({ _id: id }).exec();
    return outcome.deletedCount === 1;
  }
}
