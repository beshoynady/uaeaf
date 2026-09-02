import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Revision, RevisionSchema } from './schemas/revision.schema.js';
import { RevisionsRepository } from './revisions.repository.js';
import { RevisionsService } from './revisions.service.js';
import { RevisionsController } from './revisions.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Revision.name, schema: RevisionSchema }])],
  controllers: [RevisionsController],
  providers: [RevisionsRepository, RevisionsService],
  exports: [RevisionsService],
})
export class RevisionsModule {}
