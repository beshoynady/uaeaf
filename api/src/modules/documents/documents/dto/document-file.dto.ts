import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { DocumentFileVariantDto } from './document-file-variant.dto.js';

/** Request-body shape for `documents.file` — bilingual, one file per language. */
export class DocumentFileDto {
  @ApiProperty({ type: DocumentFileVariantDto })
  @ValidateNested()
  @Type(() => DocumentFileVariantDto)
  en: DocumentFileVariantDto;

  @ApiProperty({ type: DocumentFileVariantDto })
  @ValidateNested()
  @Type(() => DocumentFileVariantDto)
  ar: DocumentFileVariantDto;
}
