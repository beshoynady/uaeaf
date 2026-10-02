import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Video, VideoSchema } from './schemas/video.schema.js';
import { VideosRepository } from './videos.repository.js';
import { VideosService } from './videos.service.js';
import { Season, SeasonSchema } from '../seasons/schemas/season.schema.js';
import { SeasonRangeResolver } from '../seasons/season-range-resolver.js';
import { VideosController } from './videos.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Video.name, schema: VideoSchema },
      // Read by `SeasonRangeResolver` only: `SeasonsModule` imports this module
      // for its delete guard, so the model is registered here rather than
      // reached through it.
      { name: Season.name, schema: SeasonSchema },
    ]),
  ],
  controllers: [VideosController],
  providers: [VideosRepository, VideosService, SeasonRangeResolver],
  // `VideosRepository` is also exported: `SeasonsService`'s delete guard
  // counts videos by `publishedAt` range directly — a video has no
  // `seasonId` to join on, so it reads the repository, not a new service
  // method built only for this one check.
  exports: [VideosService, VideosRepository],
})
export class VideosModule {}
