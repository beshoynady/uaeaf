import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { CreateSeasonDto } from './create-season.dto.js';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';

/**
 * Request body for `PATCH /seasons/:id`.
 *
 * `slug` is omitted, not made optional: a published season's slug is its
 * public address, so renaming it is not offered here. `publicationState`
 * stays on `CreateSeasonDto` because `'Live'` is already excluded from
 * `CREATABLE_SEASON_PUBLICATION_STATES` — the only route into `Live` is
 * `PATCH /seasons/:id/publish`.
 *
 * The nullable fields below are redeclared rather than merely made optional:
 * `undefined` leaves the stored value, `null` clears it — a create has only
 * the first two states per field, a patch needs all three.
 */
export class UpdateSeasonDto extends PartialType(
  OmitType(CreateSeasonDto, [
    'slug',
    'tagline',
    'logoId',
    'bannerId',
    'shareImageId',
    'closingSummary',
    'calendarDocumentId',
  ] as const),
  { skipNullProperties: false },
) {
  @ApiPropertyOptional({ type: LocalizedTextDto, nullable: true, description: 'Pass null to clear.' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  tagline?: LocalizedTextDto | null;

  @ApiPropertyOptional({ nullable: true, description: 'Pass null to clear.' })
  @IsOptional()
  @IsMongoId()
  logoId?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Pass null to clear.' })
  @IsOptional()
  @IsMongoId()
  bannerId?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Pass null to clear.' })
  @IsOptional()
  @IsMongoId()
  shareImageId?: string | null;

  @ApiPropertyOptional({ type: LocalizedTextDto, nullable: true, description: 'Pass null to clear.' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  closingSummary?: LocalizedTextDto | null;

  @ApiPropertyOptional({ nullable: true, description: 'Pass null to clear.' })
  @IsOptional()
  @IsMongoId()
  calendarDocumentId?: string | null;
}
