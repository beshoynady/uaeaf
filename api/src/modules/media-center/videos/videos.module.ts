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
  exports: [VideosService],
})
export class VideosModule {}
