import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { SEARCH_SOURCE_KEYS } from '../search-sources.js';
import type { SearchSourceKey } from '../search-sources.js';

/** Splits `types=articles,clubs` into its parts, trimming each. Anything not
 *  a string (an array or object a caller could smuggle in via `types[]=`)
 *  passes through unchanged and fails `@IsString({ each: true })` instead of
 *  being coerced into one. */
const splitCsv = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
    : value;

/**
 * Query string for `GET /search/public`.
 *
 * `q` is required and typed — `@IsString()` alone is what stops a
 * hand-crafted `?q[$ne]=1` from ever reaching the service as an object: the
 * query parser would turn that into `{ $ne: '1' }`, and this rejects it with
 * a 400 before it exists as anything but a rejected request. `@MaxLength(80)`
 * is this DTO's own bound on the raw string, rather than trusting a
 * transport-layer limit it does not control. The lower bound (2, after
 * `normalizeArabic` + trim) stays in `SearchService`, not here: a query that
 * is too short answers `{ groups: [] }` with 200 — a reader typing their
 * first character has not made a mistake, which `@MinLength` cannot express.
 *
 * An unrecognised `types` value is dropped by the service, never rejected
 * here, per the same "a stray value is not an error" rule.
 */
export class QuerySearchDto {
  @ApiProperty({ description: '2–80 characters after trim; shorter returns an empty result, not an error.' })
  @IsString()
  @MaxLength(80)
  q: string;

  @ApiProperty({ required: false, enum: ['ar', 'en'], default: 'ar' })
  @IsOptional()
  @IsIn(['ar', 'en'])
  locale?: 'ar' | 'en';

  @ApiProperty({
    required: false,
    description: `Comma-separated subset of ${SEARCH_SOURCE_KEYS.join(', ')}. An unknown value is ignored.`,
  })
  @IsOptional()
  @Transform(splitCsv)
  @IsString({ each: true })
  types?: SearchSourceKey[];

  @ApiProperty({ required: false, minimum: 1, default: 5, description: 'Per type; clamped to 10 upstream.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
