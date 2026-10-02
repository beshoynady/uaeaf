import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Committee, CommitteeSchema } from './schemas/committees.schema.js';
import { CommitteesRepository } from './committees.repository.js';
import { CommitteesService } from './committees.service.js';
import { CommitteeHierarchyService } from './committee-hierarchy.service.js';
import { CommitteesController } from './committees.controller.js';
import { PublicationsModule } from '../../workflow/publications/publications.module.js';
import { RevisionsModule } from '../../workflow/revisions/revisions.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Committee.name, schema: CommitteeSchema }]),
    PublicationsModule,
    RevisionsModule,
  ],
  controllers: [CommitteesController],
  providers: [CommitteesRepository, CommitteesService, CommitteeHierarchyService],
  exports: [CommitteesService],
})
export class CommitteesModule {}
