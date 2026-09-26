import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ALBUM_PAGE_SIZE } from '../albums.service.js';

/**
 * The public gallery's query string.
 *
 * Every id is `IsString` rather than `IsMongoId`: a malformed id is ignored by
 * `buildAlbumFilter`, and rejecting the whole request instead would turn a
 * stale bookmark into a 400 on a public page. The filter decides what is
 * usable; this only decides what is accepted.
 */
export class AlbumListQueryDto {
  @ApiPropertyOptional({
    description:
      'A season label such as `2025–2026`. Not an id: a season is derived from the album’s date, the same as the video library.',
  })
  @IsOptional()
  @IsString()
  season?: string;

  @ApiPropertyOptional({ description: 'Championship id. Also returns its competitions albums.' })
  @IsOptional()
  @IsString()
  championship?: string;

  @ApiPropertyOptional({ description: 'Competition id.' })
  @IsOptional()
  @IsString()
  competition?: string;

  @ApiPropertyOptional({ description: 'Public event id — a conference, an honouring.' })
  @IsOptional()
  @IsString()
  publicEvent?: string;

  @ApiPropertyOptional({ description: 'Athlete id.' })
  @IsOptional()
  @IsString()
  athlete?: string;

  @ApiPropertyOptional({ description: 'Club id.' })
  @IsOptional()
  @IsString()
  club?: string;

  @ApiPropertyOptional({ description: 'Start of the period, inclusive (ISO date).' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'End of the period, inclusive (ISO date).' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ description: 'Free-text search over title and location, both languages.' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: '1-indexed page number.', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Albums per page (max 48).', default: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(48)
  limit?: number = ALBUM_PAGE_SIZE;
}
