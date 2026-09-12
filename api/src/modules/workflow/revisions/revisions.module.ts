import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Revision, RevisionSchema } from './schemas/revision.schema.js';
import { RevisionsRepository } from './revisions.repository.js';
import { RevisionsService } from './revisions.service.js';

/**
 * Data only — the HTTP routes for `/revisions` live in `PublishingModule`.
 *
 * Reading a version's history needs `publications` as well as `revisions`,
 * and `PublicationsModule` already imports this module for the public read
 * path, so this module cannot import it back. The controller therefore sits
 * in the one module that can see both (see `publishing/revisions.controller.ts`).
 */
@Module({
  imports: [MongooseModule.forFeature([{ name: Revision.name, schema: RevisionSchema }])],
  providers: [RevisionsRepository, RevisionsService],
  exports: [RevisionsService],
})
export class RevisionsModule {}
