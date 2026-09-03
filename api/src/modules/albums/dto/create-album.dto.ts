import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';
import { ALBUM_PUBLICATION_STATES } from '../schemas/album.schema.js';
import type { AlbumPublicationState } from '../schemas/album.schema.js';
import { ContentAssociationDto } from './content-association.dto.js';

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

  @ApiProperty()
  @IsMongoId()
  contentCategoryId: string;

  @ApiProperty({ type: [ContentAssociationDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentAssociationDto)
  associations?: ContentAssociationDto[];

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
