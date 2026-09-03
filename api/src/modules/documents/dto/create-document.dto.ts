import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { DOCUMENT_TYPES, DOCUMENT_OWNER_TYPES, DOCUMENT_PUBLICATION_STATES } from '../schemas/document.schema.js';
import type { DocumentType, DocumentOwnerType, DocumentPublicationState } from '../schemas/document.schema.js';
import { DocumentFileDto } from './document-file.dto.js';

/** Request body for POST /documents. */
export class CreateDocumentDto {
  @ApiProperty({ type: DocumentFileDto })
  @ValidateNested()
  @Type(() => DocumentFileDto)
  file: DocumentFileDto;

  @ApiProperty({ enum: DOCUMENT_TYPES })
  @IsIn(DOCUMENT_TYPES)
  documentType: DocumentType;

  @ApiProperty({
    description: 'Set together with ownerId when this document is a generic attachment (mode b).',
    enum: DOCUMENT_OWNER_TYPES,
    required: false,
  })
  @IsOptional()
  @IsIn(DOCUMENT_OWNER_TYPES)
  ownerType?: DocumentOwnerType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  ownerId?: string;

  @ApiProperty()
  @IsDateString()
  effectiveDate: string;

  @ApiProperty({ description: 'Descriptive only — has no effect on public visibility.', required: false })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiProperty({ enum: DOCUMENT_PUBLICATION_STATES })
  @IsIn(DOCUMENT_PUBLICATION_STATES)
  publicationState: DocumentPublicationState;
}
