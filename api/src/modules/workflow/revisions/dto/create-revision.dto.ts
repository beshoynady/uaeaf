import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsMongoId, IsObject } from 'class-validator';
import { PUBLICATION_ENTITY_TYPES } from '../../../../common/constants/workflow-entity-types.js';
import type { PublicationEntityType } from '../../../../common/constants/workflow-entity-types.js';

/** Request body for POST /revisions. */
export class CreateRevisionDto {
  @ApiProperty({ description: 'The entity type this revision snapshots (12-type list).', enum: PUBLICATION_ENTITY_TYPES })
  @IsIn(PUBLICATION_ENTITY_TYPES)
  entityType: PublicationEntityType;

  @ApiProperty({ description: 'The entity id this revision snapshots.' })
  @IsMongoId()
  entityId: string;

  @ApiProperty({ description: 'Frozen content at this version.', type: Object })
  @IsObject()
  snapshotData: Record<string, unknown>;
}
