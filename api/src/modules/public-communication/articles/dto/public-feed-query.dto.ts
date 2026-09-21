import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto.js';
import { ARTICLE_CATEGORIES } from '../schemas/article.schema.js';
import type { ArticleCategory } from '../schemas/article.schema.js';

/**
 * How a visitor narrows the public news feed.
 *
 * Separate from `QueryArticlesDto`, which is the newsroom's own listing: that
 * one filters by publication state and can include hidden items, neither of
 * which a visitor may do. Sharing one DTO between an authenticated listing and
 * an anonymous one is how a filter meant for staff ends up reachable without a
 * session.
 */
export class PublicFeedQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ARTICLE_CATEGORIES,
    description: 'Narrow to one shelf of the newsroom. Omitted means every category.',
  })
  @IsOptional()
  @IsIn(ARTICLE_CATEGORIES)
  category?: ArticleCategory;

  @ApiPropertyOptional({ description: 'Published on or after this date (inclusive).', example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Published on or before this date, to the end of that day (inclusive).',
    example: '2026-06-30',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Matches either language of the headline.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
