import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Shared page/limit query shape for public list routes. No pagination
 *  convention existed anywhere in this codebase before this session
 *  (2026-09-04, public-routes closure task) — introduced here rather than
 *  per-route so every future paginated public list uses the same query
 *  names and bounds. `limit` is capped at 200 so a caller can't force an
 *  unbounded collection scan. */
export class PaginationQueryDto {
  @ApiPropertyOptional({ description: '1-indexed page number.', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page (max 200).', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
