import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from './localized-text.dto.js';

/**
 * Request shape for the `seo` embed — mirrors `PageSeoSchema`.
 *
 * Shared rather than module-local since ADR-0069 D2, for the same reason
 * the schema is: two page collections now carry these three fields.
 */
export class PageSeoDto {
  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  metaTitle?: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  metaDescription?: LocalizedTextDto;

  @ApiProperty({ required: false, description: 'ref → mediaAssets, must be an image.' })
  @IsOptional()
  @IsMongoId()
  ogImageId?: string;
}
