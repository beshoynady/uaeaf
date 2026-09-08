import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

/** Request-body shape for `mediaAssets.file`. Deliberately excludes
 *  `checksum` — nothing in the upload path computes/verifies one yet
 *  (see `docs/audits/media-gallery-open-decisions.md`), so accepting a
 *  client-supplied value would imply a guarantee this platform doesn't
 *  make. It stays server-defaulted to `null` until that exists. */
export class MediaFileDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  url: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  mimeType: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  width: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  height: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  size: number;

  @ApiProperty({ description: 'Original upload filename.' })
  @IsString()
  @MinLength(1)
  originalName: string;

  @ApiProperty({ description: 'Storage-backend-relative path/key, independent of `url`.' })
  @IsString()
  @MinLength(1)
  storageKey: string;

  @ApiProperty({ description: 'Photographer credit.', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  photographer?: string;

  @ApiProperty({ description: 'When the photo was actually taken.', required: false })
  @IsOptional()
  @IsDateString()
  captureDate?: string;
}
