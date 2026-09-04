import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlbumsPage, AlbumsPageSchema } from './schemas/albums-page.schema.js';
import { AlbumsPageRepository } from './albums-page.repository.js';
import { AlbumsPageService } from './albums-page.service.js';
import { AlbumsPageController } from './albums-page.controller.js';
import { MediaAssetsModule } from '../media-assets/media-assets.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AlbumsPage.name, schema: AlbumsPageSchema }]),
    MediaAssetsModule,
  ],
  controllers: [AlbumsPageController],
  providers: [AlbumsPageRepository, AlbumsPageService],
  exports: [AlbumsPageService],
})
export class AlbumsPageModule {}
