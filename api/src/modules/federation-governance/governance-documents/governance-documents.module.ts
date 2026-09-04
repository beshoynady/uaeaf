import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GovernanceDocument, GovernanceDocumentSchema } from './schemas/governance-documents.schema.js';
import { GovernanceDocumentsRepository } from './governance-documents.repository.js';
import { GovernanceDocumentsService } from './governance-documents.service.js';
import { GovernanceDocumentsController } from './governance-documents.controller.js';
import { PublicationsModule } from '../../workflow/publications/publications.module.js';
import { RevisionsModule } from '../../workflow/revisions/revisions.module.js';
import { DocumentsModule } from '../../documents/documents/documents.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: GovernanceDocument.name, schema: GovernanceDocumentSchema }]),
    PublicationsModule,
    RevisionsModule,
    DocumentsModule,
  ],
  controllers: [GovernanceDocumentsController],
  providers: [GovernanceDocumentsRepository, GovernanceDocumentsService],
  exports: [GovernanceDocumentsService],
})
export class GovernanceDocumentsModule {}
