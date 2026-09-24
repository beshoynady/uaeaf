import { Module } from '@nestjs/common';
import { PageSectionsModule } from '../../cms-page-composition/page-sections/page-sections.module.js';
import { LiveStreamsModule } from '../live-streams/live-streams.module.js';
import { VideosModule } from '../videos/videos.module.js';
import { VideoSectionController } from './video-section.controller.js';
import { VideoSectionService } from './video-section.service.js';

/** Reads three things that already exist and composes them; owns no
 *  collection of its own. */
@Module({
  imports: [PageSectionsModule, LiveStreamsModule, VideosModule],
  controllers: [VideoSectionController],
  providers: [VideoSectionService],
})
export class VideoSectionModule {}
