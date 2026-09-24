import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LiveStream, LiveStreamSchema } from './schemas/live-stream.schema.js';
import { LiveStreamsController } from './live-streams.controller.js';
import { LiveStreamsService } from './live-streams.service.js';
import { LiveStreamsRepository } from './live-streams.repository.js';
import { MediaAssetsModule } from '../media-assets/media-assets.module.js';

@Module({
  // The media library, so a broadcast's still is copied into it at the
  // moment the broadcast starts — see `storeResolvedThumbnail`.
  imports: [MongooseModule.forFeature([{ name: LiveStream.name, schema: LiveStreamSchema }]), MediaAssetsModule],
  controllers: [LiveStreamsController],
  providers: [LiveStreamsService, LiveStreamsRepository],
  // The video section's payload reads the active broadcast to decide whether
  // it replaces the featured video.
  exports: [LiveStreamsService],
})
export class LiveStreamsModule {}
