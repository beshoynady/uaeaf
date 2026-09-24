import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import type { LiveStreamDocument } from '../schemas/live-stream.schema.js';

/**
 * The broadcast as the public site receives it.
 *
 * `expectedEndAt` is included so the page can stop showing the live state
 * without waiting for a revalidation — the server already hides an expired
 * stream, and this lets the client agree with it in the seconds between.
 *
 * `endedAt`, `isActive`, `createdBy` and the associations are not: a reader
 * only ever receives a stream that is live now, so they would be constants or
 * editorial facts.
 */
export class LiveStreamPublicResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: LocalizedTextDto }) title: LocalizedTextDto;
  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true }) venue: LocalizedTextDto | null;
  @ApiProperty({ description: 'The YouTube id the embed is built from.' }) videoId: string;
  @ApiProperty({ description: 'The canonical link, for "open on YouTube".' }) url: string;
  @ApiProperty() startedAt: Date;
  @ApiProperty() expectedEndAt: Date;

  @ApiProperty({ nullable: true, description: 'The stored still, or null when the platform named none.' })
  thumbnailId: string | null;
}

export const toPublicLiveStream = (stream: LiveStreamDocument): LiveStreamPublicResponseDto => ({
  id: String(stream._id),
  title: stream.title as LocalizedTextDto,
  venue: (stream.venue as LocalizedTextDto | null) ?? null,
  videoId: stream.videoId,
  url: stream.url,
  startedAt: stream.startedAt,
  expectedEndAt: stream.expectedEndAt,
  thumbnailId: stream.thumbnailId ? String(stream.thumbnailId) : null,
});
