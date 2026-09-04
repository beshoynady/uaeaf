import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsMongoId, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { PAGE_STATUSES } from '../schemas/pages.schema.js';
import type { PageStatus } from '../schemas/pages.schema.js';

/** Request shape for the `seo` embed. */
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  ogImageId?: string;
}

/** Request body for POST /pages. */
export class CreatePageDto {
  @ApiProperty({ description: 'Unique route slug.' })
  @IsString()
  @MinLength(1)
  slug: string;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiProperty({ enum: PAGE_STATUSES, description: 'Structural routing status, not publicationState.' })
  @IsIn(PAGE_STATUSES)
  status: PageStatus;

  @ApiProperty({ type: PageSeoDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PageSeoDto)
  seo?: PageSeoDto;
}
