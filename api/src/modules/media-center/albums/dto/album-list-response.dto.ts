import { ApiProperty } from '@nestjs/swagger';
import { AlbumPublicResponseDto } from './album-public-response.dto.js';
import { MediaAssetPublicResponseDto } from '../../media-assets/dto/media-asset-public-response.dto.js';

/** One card in the public gallery: the album, plus the photos its card draws.
 *  The photos are embedded rather than referenced because a card cannot be
 *  drawn without them, and resolving them separately would be one request per
 *  album on a page of twelve. */
export class AlbumListItemDto extends AlbumPublicResponseDto {
  @ApiProperty({
    type: [MediaAssetPublicResponseDto],
    description: 'At most three photos, the cover first. Empty for an album with no photos yet.',
  })
  previewPhotos: MediaAssetPublicResponseDto[];
}

export class AlbumListResponseDto {
  @ApiProperty({ type: [AlbumListItemDto] }) items: AlbumListItemDto[];
  @ApiProperty({ description: 'Albums matching the filter, across every page.' }) total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}

/** The three figures the gallery hero shows. */
export class AlbumStatsDto {
  @ApiProperty({ description: 'Published albums.' }) albums: number;
  @ApiProperty({ description: 'Visible photos across every published album.' }) photos: number;
  @ApiProperty({ description: 'Distinct championships and public events with a published album.' })
  occasions: number;
}

/** One option in a filter, with how many published albums carry it. Carries no
 *  name: four of the six collections these ids point at are not built, so
 *  there is nothing to resolve a name from here. */
export class AlbumFacetEntryDto {
  @ApiProperty() id: string;
  @ApiProperty() count: number;
}

export class AlbumFacetsDto {
  @ApiProperty({ type: [AlbumFacetEntryDto] }) seasons: AlbumFacetEntryDto[];
  @ApiProperty({ type: [AlbumFacetEntryDto] }) championships: AlbumFacetEntryDto[];
  @ApiProperty({ type: [AlbumFacetEntryDto] }) competitions: AlbumFacetEntryDto[];
  @ApiProperty({ type: [AlbumFacetEntryDto] }) publicEvents: AlbumFacetEntryDto[];
  @ApiProperty({ type: [AlbumFacetEntryDto] }) athletes: AlbumFacetEntryDto[];
  @ApiProperty({ type: [AlbumFacetEntryDto] }) clubs: AlbumFacetEntryDto[];
}
