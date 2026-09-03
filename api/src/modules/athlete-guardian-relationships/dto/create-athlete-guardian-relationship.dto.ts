import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';
import { GUARDIAN_RELATIONSHIP_TYPES } from '../schemas/athlete-guardian-relationship.schema.js';
import type { GuardianRelationshipType } from '../schemas/athlete-guardian-relationship.schema.js';
import { GuardianContactDto } from './guardian-contact.dto.js';

/** Request body for POST /athlete-guardian-relationships. */
export class CreateAthleteGuardianRelationshipDto {
  @ApiProperty()
  @IsMongoId()
  athleteId: string;

  @ApiProperty({ description: 'Bilingual guardian name.', type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  guardianName: LocalizedTextDto;

  @ApiProperty({ enum: GUARDIAN_RELATIONSHIP_TYPES })
  @IsIn(GUARDIAN_RELATIONSHIP_TYPES)
  relationshipType: GuardianRelationshipType;

  @ApiProperty({ type: GuardianContactDto })
  @ValidateNested()
  @Type(() => GuardianContactDto)
  guardianContact: GuardianContactDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  consentDocId?: string;

  @ApiProperty()
  @IsDateString()
  consentDate: string;

  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}
