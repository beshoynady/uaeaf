import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Page, PageSchema } from './schemas/pages.schema.js';
import { PagesRepository } from './pages.repository.js';
import { PagesService } from './pages.service.js';
import { PagesController } from './pages.controller.js';
import { MediaAssetsModule } from '../media-center/media-assets/media-assets.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Page.name, schema: PageSchema }]),
    MediaAssetsModule,
  ],
  controllers: [PagesController],
  providers: [PagesRepository, PagesService],
  exports: [PagesService],
})
export class PagesModule {}
