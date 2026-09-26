import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { CreateAlbumDto } from './create-album.dto.js';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';

/**
 * Request body for `PATCH /albums/:id`.
 *
 * `slug` is omitted rather than made optional. A published album's slug is its
 * address: a visitor may have it bookmarked, a search engine may have indexed
 * it, and another page may link to it. Changing it silently breaks all three,
 * so renaming is a deliberate operation this endpoint does not offer.
 *
 * `publicationState` is omitted for the same reason `CreateAlbumDto` refuses
 * `'Published'`: the only route into that state is `PATCH /albums/:id/publish`,
 * behind its own `Publish` permission. Accepting it here would let anyone with
 * `Update` bypass that gate.
 *
 * Every affiliation field stays settable, and the coherence rules are
 * re-checked on the merged result — not on the patch alone, or clearing a
 * championship while leaving its competition would pass.
 */
export class UpdateAlbumDto extends PartialType(
  OmitType(CreateAlbumDto, [
    'slug',
    'publicationState',
    // Redeclared below as nullable. Omitted rather than widened in place,
    // because a create has two states per field and a patch has three.
    'championshipId',
    'competitionId',
    'publicEventId',
    'location',
    'eventDate',
    'coverImageId',
    'athleteIds',
    'clubIds',
  ] as const),
) {
  /** Explicitly nullable, unlike the create DTO's optional form: `undefined`
   *  means "leave it alone" and `null` means "clear it", and a PATCH needs
   *  both. */
  @ApiProperty({ required: false, nullable: true, description: 'Pass null to clear.' })
  @IsOptional()
  @IsMongoId()
  championshipId?: string | null;

  @ApiProperty({ required: false, nullable: true, description: 'Pass null to clear.' })
  @IsOptional()
  @IsMongoId()
  competitionId?: string | null;

  @ApiProperty({ required: false, nullable: true, description: 'Pass null to clear.' })
  @IsOptional()
  @IsMongoId()
  publicEventId?: string | null;

  @ApiProperty({ required: false, nullable: true, type: LocalizedTextDto, description: 'Pass null to clear.' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  location?: LocalizedTextDto | null;

  @ApiProperty({ required: false, nullable: true, description: 'Pass null to clear.' })
  @IsOptional()
  @IsDateString()
  eventDate?: string | null;

  @ApiProperty({ required: false, nullable: true, description: 'Pass null to clear.' })
  @IsOptional()
  @IsMongoId()
  coverImageId?: string | null;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  athleteIds?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  clubIds?: string[];
}
