import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Video, VideoSchema } from './schemas/video.schema.js';
import { VideosRepository } from './videos.repository.js';
import { VideosService } from './videos.service.js';
import { VideosController } from './videos.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Video.name, schema: VideoSchema }])],
  controllers: [VideosController],
  providers: [VideosRepository, VideosService],
  // `VideosRepository` is also exported: `SeasonsService`'s delete guard
  // counts videos by `publishedAt` range directly — a video has no
  // `seasonId` to join on, so it reads the repository, not a new service
  // method built only for this one check.
  exports: [VideosService, VideosRepository],
})
export class VideosModule {}
