import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsMongoId, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { LocalizedRichTextDto } from '../../../../common/dto/localized-rich-text.dto.js';
import { PageSeoDto } from '../../../../common/dto/page-seo.dto.js';
import { ARTICLE_CATEGORIES } from '../schemas/article.schema.js';
import type { ArticleCategory } from '../schemas/article.schema.js';

/**
 * Lowercase letters, digits, and single hyphens between them.
 *
 * Latin-only for both languages, deliberately: the slug is one shared URL, and
 * a percent-encoded Arabic segment is unreadable in exactly the places a news
 * item travels — a pasted link, a message, a printed reference.
 */
export const ARTICLE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const SLUG_MESSAGE =
  'slug must be lowercase letters and digits joined by single hyphens, e.g. "national-championship-2026"';

/** Request body for `POST /articles`. */
export class CreateArticleDto {
  @ApiProperty({ type: LocalizedTextDto, description: 'The headline, in both languages.' })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiProperty({
    enum: ARTICLE_CATEGORIES,
    required: false,
    default: 'General',
    description:
      "Which shelf of the newsroom this belongs on. Not `externalMediaCoverage`, which is a " +
      'separate collection of links to coverage published elsewhere — this labels an article the ' +
      'federation wrote itself. Omitted means General.',
  })
  @IsOptional()
  @IsIn(ARTICLE_CATEGORIES)
  category?: ArticleCategory;

  @ApiProperty({
    description: 'URL segment, shared by both language editions of the story.',
    example: 'national-championship-results-2026',
  })
  @IsString()
  @MaxLength(120)
  @Matches(ARTICLE_SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug: string;

  @ApiProperty({ required: false, nullable: true, description: 'ref → mediaAssets, must be an image.' })
  @IsOptional()
  @IsMongoId()
  coverMediaId?: string | null;

  @ApiProperty({ type: LocalizedRichTextDto, description: 'The article body, one document per language.' })
  @ValidateNested()
  @Type(() => LocalizedRichTextDto)
  body: LocalizedRichTextDto;

  @ApiProperty({
    type: LocalizedTextDto,
    description: 'The byline readers see. May differ from the account that wrote the article.',
  })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  authorDisplayName: LocalizedTextDto;

  @ApiProperty({
    type: PageSeoDto,
    required: false,
    nullable: true,
    description: 'Overrides for the page title, description and share image. Absent means fall back to the headline.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PageSeoDto)
  seo?: PageSeoDto | null;
}
