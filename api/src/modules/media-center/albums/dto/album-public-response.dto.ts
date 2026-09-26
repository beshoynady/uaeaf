import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';

/** Public-safe `Album` shape for the individual album detail page —
 *  deliberately excludes `associations` (internal grouping metadata, not
 *  public-facing) and the audit-trail fields inherited from `BaseSchema`.
 *  `coverImageId` stays a plain id, matching this codebase's existing
 *  convention for image references on public DTOs (`heroImageId`,
 *  `photoId`, ...) — resolving it to a usable URL is a pre-existing,
 *  site-wide gap (there is no public `GET /media-assets/:id}` today),
 *  out of scope here. */
export class AlbumPublicResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: LocalizedTextDto }) title: LocalizedTextDto;
  @ApiProperty() slug: string;
  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true }) description: LocalizedTextDto | null;
  @ApiProperty({ required: false, nullable: true }) championshipId: string | null;
  @ApiProperty({ required: false, nullable: true }) competitionId: string | null;
  @ApiProperty({
    required: false,
    nullable: true,
    description: 'A conference, honouring or other institutional occasion.',
  })
  publicEventId: string | null;
  @ApiProperty({ type: [String], description: 'Athletes appearing in this album.' }) athleteIds: string[];
  @ApiProperty({ type: [String], description: 'Clubs appearing in this album.' }) clubIds: string[];
  @ApiProperty({
    required: false,
    nullable: true,
    description: 'When the occasion happened — not when it was published.',
  })
  eventDate: Date | null;
  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true }) location: LocalizedTextDto | null;
  @ApiProperty({ description: 'At most one published album carries this at a time.' }) isFeatured: boolean;
  @ApiProperty({
    type: LocalizedTextDto,
    required: false,
    nullable: true,
    description:
      'Denormalized championship/tournament name, captured at album-creation time — ' +
      'not a live join (the championships collection does not exist yet). ' +
      '[REVIEW WHEN THE CHAMPIONSHIPS MODULE IS BUILT].',
  })
  championshipName: LocalizedTextDto | null;
  @ApiProperty({ required: false, nullable: true }) coverImageId: string | null;
  @ApiProperty({ required: false, nullable: true }) publishedAt: Date | null;
  @ApiProperty({ type: [String] }) tags: string[];
  @ApiProperty({ description: 'Denormalized visible-photo count.' }) assetCount: number;
}

/** Lightweight "see also" summary for the related-albums strip — not a
 *  full `AlbumPublicResponseDto` (no `associations`/`mediaAssets` of its
 *  own), per the individual album page spec (2026-09-04 follow-on to
 *  ADR-0054). */
export class RelatedAlbumSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: LocalizedTextDto }) title: LocalizedTextDto;
  @ApiProperty() slug: string;
  @ApiProperty({ required: false, nullable: true }) coverImageId: string | null;
  @ApiProperty({ required: false, nullable: true }) publishedAt: Date | null;
}
