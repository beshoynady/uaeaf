import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
// Shared since ADR-0069 D2. Re-exported so this module's importers are unchanged.
import { PageSeoDto } from '../../../../common/dto/page-seo.dto.js';
import { PAGE_STATUSES } from '../schemas/pages.schema.js';
import type { PageStatus } from '../schemas/pages.schema.js';

export { PageSeoDto };

/** Request body for POST /pages. */
export class CreatePageDto {
  @ApiProperty({ description: 'Unique route slug.' })
  @IsString()
  @MinLength(1)
  slug: string;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiProperty({ enum: PAGE_STATUSES, description: 'Structural routing status, not publicationState.' })
  @IsIn(PAGE_STATUSES)
  status: PageStatus;

  @ApiProperty({ type: PageSeoDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PageSeoDto)
  seo?: PageSeoDto;
}
