import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DisciplinesPage, DisciplinesPageSchema } from './schemas/disciplines-page.schema.js';
import { DisciplinesPageRepository } from './disciplines-page.repository.js';
import { DisciplinesPageService } from './disciplines-page.service.js';
import { DisciplinesPageController } from './disciplines-page.controller.js';
import { MediaAssetsModule } from '../media-center/media-assets/media-assets.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DisciplinesPage.name, schema: DisciplinesPageSchema }]),
    MediaAssetsModule,
  ],
  controllers: [DisciplinesPageController],
  providers: [DisciplinesPageRepository, DisciplinesPageService],
  exports: [DisciplinesPageService],
})
export class DisciplinesPageModule {}
