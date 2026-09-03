import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommitteesPage, CommitteesPageSchema } from './schemas/committees-page.schema.js';
import { CommitteesPagesRepository } from './committees-page.repository.js';
import { CommitteesPagesService } from './committees-page.service.js';
import { CommitteesPagesController } from './committees-page.controller.js';
import { MediaAssetsModule } from '../media-assets/media-assets.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CommitteesPage.name, schema: CommitteesPageSchema }]),
    MediaAssetsModule,
  ],
  controllers: [CommitteesPagesController],
  providers: [CommitteesPagesRepository, CommitteesPagesService],
  exports: [CommitteesPagesService],
})
export class CommitteesPagesModule {}
