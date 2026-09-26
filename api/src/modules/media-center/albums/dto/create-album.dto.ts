import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { ALBUM_PUBLICATION_STATES } from '../schemas/album.schema.js';
import type { AlbumPublicationState } from '../schemas/album.schema.js';

/** `publicationState` values creatable directly via POST /albums —
 *  `'Published'` is deliberately excluded: it is reachable only through
 *  `PATCH /albums/:id/publish`, which is gated by a dedicated `Publish`
 *  permission rather than `albums`/`Create`. Allowing `'Published'` here
 *  would let anyone with Create access bypass that gate entirely. */
export const CREATABLE_ALBUM_PUBLICATION_STATES = ALBUM_PUBLICATION_STATES.filter(
  (state) => state !== 'Published',
);

/** Request body for POST /albums. Deliberately excludes `publishedAt`/
 *  `publishedBy` (server-set only, via `AlbumsService.publish()`) and the
 *  inherited `createdBy`/`updatedBy`/`archivedAt`/`archivedBy` fields. */
export class CreateAlbumDto {
  @ApiProperty({ description: 'Bilingual album title.', type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiProperty({ description: 'Unique slug for the public detail page.' })
  @IsString()
  @MinLength(1)
  slug: string;

  @ApiProperty({ description: 'Bilingual album description.', type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description?: LocalizedTextDto;

  @ApiProperty({
    description:
      'The championship. An album’s season is derived from `eventDate`, so there is no season to set.',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  championshipId?: string;

  @ApiProperty({ description: 'One competition inside the championship. Requires championshipId.', required: false })
  @IsOptional()
  @IsMongoId()
  competitionId?: string;

  @ApiProperty({
    description: 'A conference, honouring or other institutional occasion. Excludes championshipId.',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  publicEventId?: string;

  @ApiProperty({ description: 'Athletes appearing in this album.', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  athleteIds?: string[];

  @ApiProperty({ description: 'Clubs appearing in this album.', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  clubIds?: string[];

  @ApiProperty({ description: 'When the occasion happened.', required: false })
  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @ApiProperty({ description: 'Where the occasion happened.', type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  location?: LocalizedTextDto;

  @ApiProperty({
    description:
      'Bilingual championship/tournament display name, captured directly since the ' +
      "championships collection doesn't exist yet — independent of `associations[]`. " +
      "Supply both if this album is also associated with a 'championships' owner.",
    type: LocalizedTextDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  championshipName?: LocalizedTextDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  coverImageId?: string;

  @ApiProperty()
  @IsInt()
  displayOrder: number;

  @ApiProperty({ enum: CREATABLE_ALBUM_PUBLICATION_STATES })
  @IsIn(CREATABLE_ALBUM_PUBLICATION_STATES)
  publicationState: AlbumPublicationState;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
