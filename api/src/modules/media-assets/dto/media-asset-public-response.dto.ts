import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';

/** Public-safe `MediaFile` shape — deliberately excludes `originalName`,
 *  `storageKey`, and `checksum` (internal storage/infra details, not
 *  public-facing). */
export class MediaFilePublicResponseDto {
  @ApiProperty() url: string;
  @ApiProperty() mimeType: string;
  @ApiProperty() width: number;
  @ApiProperty() height: number;
  @ApiProperty() size: number;
}

/** Public-safe `MediaAsset` shape for embedding in a photo grid (e.g. an
 *  album's public detail page) — a distinct response class, never the raw
 *  document, matching this codebase's public-DTO convention
 *  (`AthletePublicResponseDto`, `AthleteProfilePublicResponseDto`, ...). */
export class MediaAssetPublicResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: MediaFilePublicResponseDto }) file: MediaFilePublicResponseDto;
  @ApiProperty({ type: LocalizedTextDto }) caption: LocalizedTextDto;
  @ApiProperty({ type: LocalizedTextDto }) altText: LocalizedTextDto;
  @ApiProperty() displayOrder: number;
  @ApiProperty() isFeatured: boolean;
}
