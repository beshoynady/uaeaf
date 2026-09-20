import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto.js';
import { ARTICLE_PUBLICATION_STATES } from '../schemas/article.schema.js';
import type { ArticlePublicationState } from '../schemas/article.schema.js';

/** Query shape for the newsroom's own listing, `GET /articles`. */
export class QueryArticlesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ARTICLE_PUBLICATION_STATES, description: 'Narrow to drafts or to published items.' })
  @IsOptional()
  @IsIn(ARTICLE_PUBLICATION_STATES)
  publicationState?: ArticlePublicationState;

  /**
   * Free text matched against both headlines.
   *
   * Capped and escaped downstream before it reaches Mongo: an unescaped `.*`
   * typed into a search box is a collection scan any caller can trigger at
   * will, and the cap keeps a pathological pattern short even so.
   */
  @ApiPropertyOptional({ description: 'Matches either language of the headline.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  /**
   * Include items hidden from the public feed.
   *
   * Transformed here rather than validated as a string, because a query
   * parameter arrives as `"false"` — which is truthy, and would have made the
   * off position of this switch turn the filter on.
   */
  @ApiPropertyOptional({ description: 'Include articles hidden from the public feed. Defaults to false.' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  includeArchived?: boolean;
}
