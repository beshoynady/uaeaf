import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { seasonLabel } from '../season.js';
import { VIDEO_CATEGORIES, VIDEO_EXTERNAL_PLATFORMS, VIDEO_KINDS } from '../schemas/video.schema.js';
import type { VideoDocument } from '../schemas/video.schema.js';

/**
 * A video as the public site receives it.
 *
 * A distinct class, never the raw document, matching this codebase's
 * public-DTO convention. What it leaves out is the point: `status`,
 * `archivedAt`, `createdBy`/`updatedBy` and `isLive` are editorial and
 * infrastructural facts, and a row only reaches here once it is published, so
 * repeating `status: 'published'` on every item would be noise a client could
 * mistake for something it is allowed to vary.
 *
 * There is deliberately **no view count and no duration**: oEmbed returns
 * neither for these platforms, and a number the site cannot know is a number
 * it must not print.
 */
export class VideoPublicResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: LocalizedTextDto }) title: LocalizedTextDto;
  @ApiProperty({ enum: VIDEO_CATEGORIES }) category: string;
  @ApiProperty({ enum: VIDEO_KINDS }) kind: string;
  @ApiProperty({ enum: VIDEO_EXTERNAL_PLATFORMS }) platform: string;

  @ApiProperty({ description: 'The canonical link, for "open on <platform>".' })
  url: string;

  @ApiProperty({ description: "The video's id on its platform, which the embed URL is built from." })
  externalId: string;

  @ApiProperty({ required: false, nullable: true, description: 'A mediaAssets id; resolve it for the image.' })
  thumbnailId: string | null;

  @ApiProperty({ required: false, nullable: true }) publishedAt: Date | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Derived from publishedAt, never stored — e.g. "2025–2026".',
  })
  season: string | null;

  @ApiProperty({ type: [String] }) tags: string[];
}

/**
 * `platform` rather than `externalPlatform`, and `url` rather than
 * `externalUrl`: "external" describes where the row came from, which is an
 * authoring concern. To a reader every video is external, so the prefix says
 * nothing and only makes the client's field names longer.
 */
export const toPublicVideo = (video: VideoDocument): VideoPublicResponseDto => ({
  id: String(video._id),
  title: video.title as LocalizedTextDto,
  category: video.category,
  kind: video.kind,
  platform: video.externalPlatform,
  url: video.externalUrl,
  externalId: video.externalId,
  thumbnailId: video.thumbnailId ? String(video.thumbnailId) : null,
  publishedAt: video.publishedAt,
  // Computed here rather than stored, so it can never disagree with the date
  // beside it. Null only while unpublished, which the public list never is.
  season: video.publishedAt ? seasonLabel(video.publishedAt) : null,
  tags: video.tags ?? [],
});
