import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsMongoId, IsString, MinLength, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { PUBLICATION_STATES } from '../../../../common/constants/publication-states.js';
import type { PublicationState } from '../../../../common/constants/publication-states.js';
import { GOVERNANCE_DOCUMENT_TYPES } from '../schemas/governance-documents.schema.js';
import type { GovernanceDocumentType } from '../schemas/governance-documents.schema.js';

/** Request body for POST /governance-documents. */
export class CreateGovernanceDocumentDto {
  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description: LocalizedTextDto;

  @ApiProperty({ enum: GOVERNANCE_DOCUMENT_TYPES })
  @IsIn(GOVERNANCE_DOCUMENT_TYPES)
  type: GovernanceDocumentType;

  @ApiProperty({ description: 'ref → documents. Attached file, not an independently approved entity.' })
  @IsMongoId()
  fileId: string;

  @ApiProperty({ description: 'e.g. "1.0".' })
  @IsString()
  @MinLength(1)
  documentVersion: string;

  @ApiProperty({ enum: PUBLICATION_STATES })
  @IsIn(PUBLICATION_STATES)
  publicationState: PublicationState;
}
