import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';
import { PUBLICATION_STATES } from '../../../common/constants/publication-states.js';
import type { PublicationState } from '../../../common/constants/publication-states.js';
import { ORG_NODE_TYPES } from '../schemas/organizational-structure.schema.js';
import type { OrgNodeType } from '../schemas/organizational-structure.schema.js';

/** Request body for POST /organizational-structure. */
export class CreateOrganizationalStructureNodeDto {
  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiProperty({ required: false, description: 'Parent node in the org tree.' })
  @IsOptional()
  @IsMongoId()
  parentNodeId?: string;

  @ApiProperty()
  @IsInt()
  displayOrder: number;

  @ApiProperty({ enum: ORG_NODE_TYPES })
  @IsIn(ORG_NODE_TYPES)
  nodeType: OrgNodeType;

  @ApiProperty({ enum: PUBLICATION_STATES })
  @IsIn(PUBLICATION_STATES)
  publicationState: PublicationState;

  @ApiProperty({ required: false, description: 'For standalone nodes not tied to a committee.' })
  @IsOptional()
  @IsMongoId()
  federationAppointmentId?: string;
}

/** Request body for PATCH /organizational-structure/:id/parent. */
export class SetParentNodeDto {
  @ApiProperty({
    required: false,
    nullable: true,
    description: 'New parent node id, or omit/null to detach to the tree root.',
  })
  @IsOptional()
  @IsMongoId()
  parentNodeId?: string | null;
}
