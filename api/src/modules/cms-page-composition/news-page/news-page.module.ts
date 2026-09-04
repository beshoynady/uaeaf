import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NewsPage, NewsPageSchema } from './schemas/news-page.schema.js';
import { NewsPageRepository } from './news-page.repository.js';
import { NewsPageService } from './news-page.service.js';
import { NewsPageController } from './news-page.controller.js';
import { MediaAssetsModule } from '../../media-center/media-assets/media-assets.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: NewsPage.name, schema: NewsPageSchema }]),
    MediaAssetsModule,
  ],
  controllers: [NewsPageController],
  providers: [NewsPageRepository, NewsPageService],
  exports: [NewsPageService],
})
export class NewsPageModule {}
