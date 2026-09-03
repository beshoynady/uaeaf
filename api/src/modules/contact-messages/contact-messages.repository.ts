import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { ContactMessage } from './schemas/contact-messages.schema.js';
import type { ContactMessageDocument } from './schemas/contact-messages.schema.js';

/** Implements: contactMessages collection, Domain 10 — Public Communication. */
@Injectable()
export class ContactMessagesRepository extends BaseRepository<ContactMessageDocument> {
  constructor(@InjectModel(ContactMessage.name) model: Model<ContactMessageDocument>) {
    super(model);
  }
}
