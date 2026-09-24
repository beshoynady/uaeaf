import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { VIDEO_CATEGORIES, VIDEO_EXTERNAL_PLATFORMS, VIDEO_KINDS } from '../schemas/video.schema.js';
import { VIDEO_ASSOCIATION_TYPES } from '../videos.public-filter.js';

/**
 * Query string for `GET /videos/public`.
 *
 * Every field is optional and every one is validated, because all of them
 * arrive from a public URL that anyone can hand-edit. The enums are refused
 * outright — an invented `kind` is a mistake worth a 400 — while `season`,
 * `association` and the date bounds are merely *shaped* here and ignored
 * downstream if they do not parse. That split is deliberate: a stale link
 * carrying last season's label should show the library, not an error, and an
 * error page reads to a visitor as the site being broken.
 */
export class QueryPublicVideosDto {
  @ApiProperty({ required: false, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, minimum: 1, description: 'Clamped to 48 upstream.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiProperty({ required: false, enum: VIDEO_KINDS })
  @IsOptional()
  @IsIn(VIDEO_KINDS)
  kind?: string;

  @ApiProperty({ required: false, enum: VIDEO_EXTERNAL_PLATFORMS })
  @IsOptional()
  @IsIn(VIDEO_EXTERNAL_PLATFORMS)
  platform?: string;

  @ApiProperty({ required: false, enum: VIDEO_CATEGORIES })
  @IsOptional()
  @IsIn(VIDEO_CATEGORIES)
  category?: string;

  @ApiProperty({ required: false, description: 'e.g. "2025–2026". Ignored if unparseable.' })
  @IsOptional()
  @IsString()
  season?: string;

  @ApiProperty({
    required: false,
    description: `<ownerType>:<id>, where ownerType is one of ${VIDEO_ASSOCIATION_TYPES.join(', ')}.`,
  })
  @IsOptional()
  @IsString()
  association?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'ISO date. Ignored if unparseable.' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiProperty({ required: false, description: 'ISO date, inclusive to end of day.' })
  @IsOptional()
  @IsString()
  to?: string;
}
