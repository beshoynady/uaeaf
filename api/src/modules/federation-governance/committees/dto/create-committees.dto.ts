import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { PUBLICATION_STATES } from '../../../../common/constants/publication-states.js';
import type { PublicationState } from '../../../../common/constants/publication-states.js';
import { COMMITTEE_TYPES, COMMITTEE_GROUPS, COMMITTEE_KINDS } from '../schemas/committees.schema.js';
import type { CommitteeType, CommitteeGroup, CommitteeKind } from '../schemas/committees.schema.js';
import { CommitteeDutyDto } from './committee-duty.dto.js';
import { FormationDecisionDto } from './formation-decision.dto.js';

/** Lowercase letters, digits, and single hyphens between them — the same
 *  shape as `ARTICLE_SLUG_PATTERN`. */
export const COMMITTEE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MESSAGE =
  'slug must be lowercase letters and digits joined by single hyphens, e.g. "medical-committee"';

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

  @ApiProperty({ description: 'Unique, e.g. "medical-committee".' })
  @IsString()
  @MaxLength(120)
  @Matches(COMMITTEE_SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug: string;

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

  @ApiPropertyOptional({ type: LocalizedTextDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  summary?: LocalizedTextDto | null;

  @ApiPropertyOptional({ type: LocalizedTextDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  about?: LocalizedTextDto | null;

  @ApiPropertyOptional({ type: [CommitteeDutyDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommitteeDutyDto)
  duties?: CommitteeDutyDto[];

  @ApiPropertyOptional({ type: FormationDecisionDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => FormationDecisionDto)
  formationDecision?: FormationDecisionDto | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  documentIds?: string[];

  @ApiPropertyOptional({ description: "The admin's own show/hide switch. Separate from isActive." })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({
    enum: COMMITTEE_KINDS,
    nullable: true,
    description: 'Null until an admin classifies the committee.',
  })
  @IsOptional()
  @IsIn(COMMITTEE_KINDS)
  kind?: CommitteeKind | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'ref → committees. Set only on a sub-committee; null there means it follows the board.',
  })
  @IsOptional()
  @IsMongoId()
  parentCommitteeId?: string | null;
}
