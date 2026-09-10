import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsDefined,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';

/**
 * The metadata half of a multipart upload.
 *
 * Everything describing the *file* is deliberately absent: `url`, `width`,
 * `height`, `size`, `mimeType` and `storageKey` are read from the bytes and
 * from the storage provider's own answer, never accepted from the client.
 * `CreateMediaAssetDto` takes them because that endpoint registers a file
 * someone else already stored; this one stores the file itself, so anything
 * the client claimed about it would be a claim the server can check and
 * therefore must not trust.
 *
 * The fields are read from multipart form parts, which are strings — the
 * bilingual objects arrive as JSON text and are parsed before validation
 * (see `ParseJsonFieldsPipe`), so the shape validated here is the shape the
 * service receives.
 */
export class UploadMediaAssetDto {
  @ApiProperty({ description: 'Album this asset belongs to. Omitted for a page image.', required: false })
  @IsOptional()
  @IsMongoId()
  albumId?: string;

  /** `@IsDefined()` is not redundant beside `@ValidateNested()`: on an
   *  absent value `ValidateNested` passes silently, so without it a request
   *  missing this field reached the handler, stored its file, and only
   *  failed at the schema — leaving the image behind. Measured, not
   *  supposed. */
  @ApiProperty({ description: 'Bilingual caption.', type: LocalizedTextDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  caption: LocalizedTextDto;

  /** Required, and required in both languages by `LocalizedTextDto`. An
   *  image whose alternative text is optional is an image that ships
   *  without it: WCAG 1.1.1 is an acceptance gate on this platform, and the
   *  upload screen is the only moment anyone knows what the picture shows. */
  @ApiProperty({ description: 'Bilingual alternative text. Required.', type: LocalizedTextDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  altText: LocalizedTextDto;

  @ApiProperty({ description: 'Sort position within the parent album.', required: false })
  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @ApiProperty({ description: 'Photographer credit.', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  photographer?: string;

  @ApiProperty({ description: 'When the photograph was taken.', required: false })
  @IsOptional()
  @IsDateString()
  captureDate?: string;
}
