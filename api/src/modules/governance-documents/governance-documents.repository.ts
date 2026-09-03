import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { GovernanceDocument } from './schemas/governance-documents.schema.js';
import type { GovernanceDocumentDocument } from './schemas/governance-documents.schema.js';

/** Implements: governanceDocuments collection, Domain 1 — Federation & Governance. */
@Injectable()
export class GovernanceDocumentsRepository extends BaseRepository<GovernanceDocumentDocument> {
  constructor(@InjectModel(GovernanceDocument.name) model: Model<GovernanceDocumentDocument>) {
    super(model);
  }
}
