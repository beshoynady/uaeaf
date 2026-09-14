import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { Types } from 'mongoose';
import { LocalizedTextDto } from './localized-text.dto.js';
import type { PageSeo } from '../schemas/page-seo.schema.js';

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

/** The stored embed for a validated `seo` body (ADR-0070 D3): each field left
 *  out is `null`, as the schema defaults it, and the share image is an
 *  ObjectId, like every other image ref. */
export const toPageSeo = (seo: PageSeoDto): PageSeo => ({
  metaTitle: seo.metaTitle ?? null,
  metaDescription: seo.metaDescription ?? null,
  ogImageId: seo.ogImageId ? new Types.ObjectId(seo.ogImageId) : null,
});
