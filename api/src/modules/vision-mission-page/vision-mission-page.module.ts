import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VisionMissionPage, VisionMissionPageSchema } from './schemas/vision-mission-page.schema.js';
import { VisionMissionPagesRepository } from './vision-mission-page.repository.js';
import { VisionMissionPagesService } from './vision-mission-page.service.js';
import { VisionMissionPagesController } from './vision-mission-page.controller.js';
import { PublicationsModule } from '../publications/publications.module.js';
import { RevisionsModule } from '../revisions/revisions.module.js';
import { MediaAssetsModule } from '../media-assets/media-assets.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: VisionMissionPage.name, schema: VisionMissionPageSchema }]),
    PublicationsModule,
    RevisionsModule,
    MediaAssetsModule,
  ],
  controllers: [VisionMissionPagesController],
  providers: [VisionMissionPagesRepository, VisionMissionPagesService],
  exports: [VisionMissionPagesService],
})
export class VisionMissionPagesModule {}
