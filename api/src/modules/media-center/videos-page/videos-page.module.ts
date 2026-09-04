import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VideosPage, VideosPageSchema } from './schemas/videos-page.schema.js';
import { VideosPageRepository } from './videos-page.repository.js';
import { VideosPageService } from './videos-page.service.js';
import { VideosPageController } from './videos-page.controller.js';
import { MediaAssetsModule } from '../media-assets/media-assets.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: VideosPage.name, schema: VideosPageSchema }]),
    MediaAssetsModule,
  ],
  controllers: [VideosPageController],
  providers: [VideosPageRepository, VideosPageService],
  exports: [VideosPageService],
})
export class VideosPageModule {}
