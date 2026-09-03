import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ResultsRankingsPage, ResultsRankingsPageSchema } from './schemas/results-rankings-page.schema.js';
import { ResultsRankingsPageRepository } from './results-rankings-page.repository.js';
import { ResultsRankingsPageService } from './results-rankings-page.service.js';
import { ResultsRankingsPageController } from './results-rankings-page.controller.js';
import { MediaAssetsModule } from '../media-assets/media-assets.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ResultsRankingsPage.name, schema: ResultsRankingsPageSchema }]),
    MediaAssetsModule,
  ],
  controllers: [ResultsRankingsPageController],
  providers: [ResultsRankingsPageRepository, ResultsRankingsPageService],
  exports: [ResultsRankingsPageService],
})
export class ResultsRankingsPageModule {}
