import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';
import { PUBLICATION_STATES } from '../../../common/constants/publication-states.js';
import type { PublicationState } from '../../../common/constants/publication-states.js';
import { COMMITTEE_TYPES, COMMITTEE_GROUPS } from '../schemas/committees.schema.js';
import type { CommitteeType, CommitteeGroup } from '../schemas/committees.schema.js';

/** Request body for POST /committees. */
export class CreateCommitteeDto {
  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description: LocalizedTextDto;

  @ApiProperty()
  @IsInt()
  displayOrder: number;

  @ApiProperty({
    required: false,
    description:
      'Descriptive badge only — has no effect on public visibility and is never auto-synced ' +
      'with publicationState or archivedAt.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ enum: COMMITTEE_TYPES })
  @IsIn(COMMITTEE_TYPES)
  committeeType: CommitteeType;

  @ApiProperty({ enum: COMMITTEE_GROUPS })
  @IsIn(COMMITTEE_GROUPS)
  committeeGroup: CommitteeGroup;

  @ApiProperty({ enum: PUBLICATION_STATES })
  @IsIn(PUBLICATION_STATES)
  publicationState: PublicationState;
}
