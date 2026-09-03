import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { ContactUsPage } from './schemas/contact-us-page.schema.js';
import type { ContactUsPageDocument } from './schemas/contact-us-page.schema.js';

/** Implements: contactUsPage collection, Domain 1 — Federation & Governance. */
@Injectable()
export class ContactUsPagesRepository extends BaseRepository<ContactUsPageDocument> {
  constructor(@InjectModel(ContactUsPage.name) model: Model<ContactUsPageDocument>) {
    super(model);
  }
}
