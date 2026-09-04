import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { Document } from './schemas/document.schema.js';
import type { DocumentDocument, DocumentOwnerType } from './schemas/document.schema.js';

/** Implements: documents collection, Domain 6. */
@Injectable()
export class DocumentsRepository extends BaseRepository<DocumentDocument> {
  constructor(@InjectModel(Document.name) model: Model<DocumentDocument>) {
    super(model);
  }

  /** Mode (b): every document generically attached to one owning entity. */
  async findByOwner(ownerType: DocumentOwnerType, ownerId: Types.ObjectId): Promise<DocumentDocument[]> {
    return this.find({ ownerType, ownerId });
  }
}
