import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsMongoId, IsOptional } from 'class-validator';
import {
  CONTENT_ASSOCIATION_OWNER_TYPES,
  CONTENT_ASSOCIATION_ROLES,
} from '../../../../common/schemas/content-association.schema.js';
import type {
  ContentAssociationOwnerType,
  ContentAssociationRole,
} from '../../../../common/schemas/content-association.schema.js';

/** Request-body shape for one `associations[]` entry. */
export class ContentAssociationDto {
  @ApiProperty({ enum: CONTENT_ASSOCIATION_OWNER_TYPES })
  @IsIn(CONTENT_ASSOCIATION_OWNER_TYPES)
  ownerType: ContentAssociationOwnerType;

  @ApiProperty()
  @IsMongoId()
  ownerId: string;

  @ApiProperty({ enum: CONTENT_ASSOCIATION_ROLES, required: false })
  @IsOptional()
  @IsIn(CONTENT_ASSOCIATION_ROLES)
  role?: ContentAssociationRole;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  displayOrder?: number;
}
