import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoachesPage, CoachesPageSchema } from './schemas/coaches-page.schema.js';
import { CoachesPageRepository } from './coaches-page.repository.js';
import { CoachesPageService } from './coaches-page.service.js';
import { CoachesPageController } from './coaches-page.controller.js';
import { MediaAssetsModule } from '../media-assets/media-assets.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CoachesPage.name, schema: CoachesPageSchema }]),
    MediaAssetsModule,
  ],
  controllers: [CoachesPageController],
  providers: [CoachesPageRepository, CoachesPageService],
  exports: [CoachesPageService],
})
export class CoachesPageModule {}
