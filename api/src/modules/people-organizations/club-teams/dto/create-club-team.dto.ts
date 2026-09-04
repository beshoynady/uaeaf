import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { CLUB_TEAM_GENDERS } from '../schemas/club-team.schema.js';
import type { ClubTeamGender } from '../schemas/club-team.schema.js';

/** Request body for POST /club-teams. */
export class CreateClubTeamDto {
  @ApiProperty()
  @IsMongoId()
  clubId: string;

  @ApiProperty({ description: 'Bilingual squad name, e.g. { en: "First Team (Men)", ar: "الفريق الأول (رجال)" }.', type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiProperty()
  @IsMongoId()
  ageCategoryId: string;

  @ApiProperty({ enum: CLUB_TEAM_GENDERS })
  @IsIn(CLUB_TEAM_GENDERS)
  gender: ClubTeamGender;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  athleteIds?: string[];
}
