import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsMongoId } from 'class-validator';
import { CONTENT_ASSOCIATION_OWNER_TYPES } from '../../../common/schemas/content-association.schema.js';
import type { ContentAssociationOwnerType } from '../../../common/schemas/content-association.schema.js';

/** Request-body shape for one `associations[]` entry. */
export class ContentAssociationDto {
  @ApiProperty({ enum: CONTENT_ASSOCIATION_OWNER_TYPES })
  @IsIn(CONTENT_ASSOCIATION_OWNER_TYPES)
  ownerType: ContentAssociationOwnerType;

  @ApiProperty()
  @IsMongoId()
  ownerId: string;
}
