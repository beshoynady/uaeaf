import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { LocalizedRichTextDto } from '../../../../common/dto/localized-rich-text.dto.js';
import { PageSeoDto } from '../../../../common/dto/page-seo.dto.js';
import { ARTICLE_SLUG_PATTERN } from './create-article.dto.js';
import { ARTICLE_CATEGORIES } from '../schemas/article.schema.js';
import type { ArticleCategory } from '../schemas/article.schema.js';

const SLUG_MESSAGE =
  'slug must be lowercase letters and digits joined by single hyphens, e.g. "national-championship-2026"';

/**
 * Request body for `PATCH /articles/:id` — every field optional.
 *
 * Written out rather than derived with `PartialType`, matching
 * `UpdatePresidentMessagePageDto` and every other update DTO here. The reason
 * is the one that applies across the codebase: a derived partial silently
 * inherits whatever the create DTO gains next, including a field that must
 * never be patched, and the inheritance is invisible at the point where
 * someone would look for it.
 *
 * Absent means "leave alone". `null` on a nullable field means "clear it".
 */
export class UpdateArticleDto {
  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title?: LocalizedTextDto;

  @ApiProperty({ enum: ARTICLE_CATEGORIES, required: false })
  @IsOptional()
  @IsIn(ARTICLE_CATEGORIES)
  category?: ArticleCategory;

  @ApiProperty({ type: [String], required: false, description: 'Free labels for display and filtering. NOT a second category: `category` is a closed list of one, and it decides which homepage section the article appears in.' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  @ApiProperty({ required: false, example: 'national-championship-results-2026' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(ARTICLE_SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug?: string;

  @ApiProperty({ required: false, nullable: true, description: 'Null clears the cover image.' })
  @IsOptional()
  @IsMongoId()
  coverMediaId?: string | null;

  @ApiProperty({ type: LocalizedRichTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedRichTextDto)
  body?: LocalizedRichTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  authorDisplayName?: LocalizedTextDto;

  @ApiProperty({ type: PageSeoDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => PageSeoDto)
  seo?: PageSeoDto | null;
}
