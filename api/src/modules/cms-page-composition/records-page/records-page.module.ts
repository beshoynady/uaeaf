import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecordsPage, RecordsPageSchema } from './schemas/records-page.schema.js';
import { RecordsPageRepository } from './records-page.repository.js';
import { RecordsPageService } from './records-page.service.js';
import { RecordsPageController } from './records-page.controller.js';
import { MediaAssetsModule } from '../../media-center/media-assets/media-assets.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: RecordsPage.name, schema: RecordsPageSchema }]),
    MediaAssetsModule,
  ],
  controllers: [RecordsPageController],
  providers: [RecordsPageRepository, RecordsPageService],
  exports: [RecordsPageService],
})
export class RecordsPageModule {}
