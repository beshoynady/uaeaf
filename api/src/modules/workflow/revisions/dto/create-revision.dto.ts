import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsMongoId } from 'class-validator';
import { PUBLICATION_ENTITY_TYPES } from '../../../../common/constants/workflow-entity-types.js';
import type { PublicationEntityType } from '../../../../common/constants/workflow-entity-types.js';

/**
 * Request body for POST /revisions: which record to freeze, and nothing else.
 *
 * The snapshot is taken by the server from the stored record. A body that
 * brings its own `snapshotData` is refused by the global
 * `forbidNonWhitelisted` pipe rather than ignored, so a caller still sending
 * one learns that it was never used.
 */
export class CreateRevisionDto {
  @ApiProperty({ description: 'The entity type to freeze (12-type list).', enum: PUBLICATION_ENTITY_TYPES })
  @IsIn(PUBLICATION_ENTITY_TYPES)
  entityType: PublicationEntityType;

  @ApiProperty({ description: 'The id of the stored record to freeze.' })
  @IsMongoId()
  entityId: string;
}
