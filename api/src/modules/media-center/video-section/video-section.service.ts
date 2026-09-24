import { Injectable } from '@nestjs/common';
import { PageSectionsRepository } from '../../cms-page-composition/page-sections/page-sections.repository.js';
import { LiveStreamsService } from '../live-streams/live-streams.service.js';
import { VideosService } from '../videos/videos.service.js';
import { readVideoSectionSettings } from './video-settings.js';
import { toPublicLiveStream } from '../live-streams/dto/live-stream-public-response.dto.js';
import type { VideoPublicResponseDto } from '../videos/dto/video-public-response.dto.js';
import type { LiveStreamPublicResponseDto } from '../live-streams/dto/live-stream-public-response.dto.js';
import type { LocalizedText } from '../../../common/schemas/localized-text.schema.js';
import type { VideoSectionSettings } from './video-settings.js';

/**
 * Everything the homepage's video section needs, in one request.
 *
 * One payload rather than three, because the section's two halves have to
 * agree: which video is featured depends on whether a broadcast is live, and
 * three separate fetches could each answer from a different moment — showing a
 * broadcast that has just ended, or a featured video that has just been
 * replaced by one.
 *
 * ── The swap, and why nothing schedules it ────────────────────────────────
 *
 * While a broadcast is live it replaces the featured video, and the featured
 * video returns when the broadcast ends. Nothing runs to make that happen:
 * `LiveStreamsService.findActive()` compares the clock, so the moment a
 * stream's end time passes it stops being found and the next read has no live
 * stream in it. The featured video is sent alongside the broadcast for the
 * same reason — the client then has what it needs the instant the broadcast
 * ends, without a second round trip.
 */
export interface VideoSectionPayload {
  enabled: boolean;
  title: LocalizedText | null;
  subtitle: LocalizedText | null;
  live: LiveStreamPublicResponseDto | null;
  featured: VideoPublicResponseDto | null;
  carousel: { items: VideoPublicResponseDto[] };
}

const OFF: VideoSectionPayload = {
  enabled: false,
  title: null,
  subtitle: null,
  live: null,
  featured: null,
  carousel: { items: [] },
};

@Injectable()
export class VideoSectionService {
  constructor(
    private readonly sections: PageSectionsRepository,
    private readonly liveStreams: LiveStreamsService,
    private readonly videos: VideosService,
  ) {}

  async findPublic(): Promise<VideoSectionPayload> {
    const section = await this.sections.findOne({ sectionType: 'VIDEO_LIBRARY', archivedAt: null });
    // No row, or switched off: no section at all. A heading over nothing is
    // worse than an absent section.
    if (!section || section.enabled !== true) return OFF;

    const settings = readVideoSectionSettings(section.configuration);
    const [live, featured, carousel] = await Promise.all([
      this.liveStreams.findActive(),
      this.featuredOf(settings),
      this.carouselOf(settings),
    ]);

    return {
      enabled: true,
      title: section.sectionTitle ?? null,
      subtitle: section.sectionSubtitle ?? null,
      live: live ? toPublicLiveStream(live) : null,
      featured,
      // The featured video is never also a card in its own carousel; a reader
      // would see the same story twice in one section.
      carousel: { items: carousel.filter((item) => item.id !== featured?.id) },
    };
  }

  private async featuredOf(settings: VideoSectionSettings): Promise<VideoPublicResponseDto | null> {
    if (settings.featured.mode === 'specific' && settings.featured.videoId) {
      const [chosen] = await this.videos.findPublicByIds([settings.featured.videoId]);
      // A chosen video that has since been unpublished or archived falls back
      // to the newest, so the section is never headed by a hole.
      if (chosen) return chosen;
    }

    const { items } = await this.videos.findPublicPage(1, 1, {});
    return items[0] ?? null;
  }

  private async carouselOf(settings: VideoSectionSettings): Promise<VideoPublicResponseDto[]> {
    const { source, count, includeReels } = settings.carousel;

    if (source === 'manual') {
      // Order preserved — this is the one place in the system where an editor
      // arranges videos by hand, and re-sorting here would silently disagree
      // with what the dashboard shows them.
      return this.videos.findPublicByIds(settings.carousel.manualIds);
    }

    const narrow =
      source === 'filtered'
        ? {
            category: settings.carousel.category ?? undefined,
            season: settings.carousel.season ?? undefined,
            association: settings.carousel.association ?? undefined,
          }
        : {};

    // One extra, so dropping the featured video still leaves a full row.
    const { items } = await this.videos.findPublicPage(1, count + 1, {
      ...narrow,
      ...(includeReels ? {} : { kind: 'video' }),
    });

    return items.slice(0, count + 1);
  }
}
