import { ApiProperty } from '@nestjs/swagger';
import { AlbumPublicResponseDto, RelatedAlbumSummaryDto } from './album-public-response.dto.js';
import { MediaAssetPublicResponseDto } from '../../media-assets/dto/media-asset-public-response.dto.js';

/** Response shape for `GET /albums/public/:slug` — the individual public
 *  album page (2026-09-04 follow-on to ADR-0054). A dedicated wrapper class
 *  (not just documenting `AlbumsService.getPublicBySlug()`'s inline return
 *  type) so Swagger actually registers `AlbumPublicResponseDto`,
 *  `MediaAssetPublicResponseDto`, and `RelatedAlbumSummaryDto` in
 *  `components.schemas` and generated API clients get real types for the
 *  response, not just the request body (documentation gap closed
 *  2026-09-07 — see `docs/audits/project-status-and-frontend-kickoff-2026-09-07.md`
 *  Part 8.3). */
export class AlbumDetailPageResponseDto {
  @ApiProperty({ type: AlbumPublicResponseDto })
  album: AlbumPublicResponseDto;

  @ApiProperty({
    type: [MediaAssetPublicResponseDto],
    description: 'One page of visible photos, in display order. At most 40.',
  })
  mediaAssets: MediaAssetPublicResponseDto[];

  @ApiProperty({ description: 'Visible photos in this album, across every page.' })
  photoTotal: number;

  @ApiProperty({ description: 'How many photos were skipped to produce this page.' })
  photoSkip: number;

  @ApiProperty({
    type: [RelatedAlbumSummaryDto],
    description: 'Other Published albums related to this one, closest relationship first.',
  })
  relatedAlbums: RelatedAlbumSummaryDto[];
}
