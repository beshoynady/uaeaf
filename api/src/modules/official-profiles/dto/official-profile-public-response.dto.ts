import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';
import { OFFICIAL_PROFILE_GENDERS, OFFICIAL_PROFILE_STATUSES } from '../schemas/official-profile.schema.js';
import type { OfficialProfileGender, OfficialProfileStatus } from '../schemas/official-profile.schema.js';

/** Public-safe `OfficialProfile` shape. No sensitive field is stripped
 *  today (`officialProfiles` has no `restricted` object), kept as an
 *  explicit typed contract for the same reason as
 *  `AthleteProfilePublicResponseDto` (2026-09-03 correction). */
export class OfficialProfilePublicResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() officialId: string;
  @ApiProperty() slug: string;
  @ApiProperty({ required: false, nullable: true }) clubId: string | null;
  @ApiProperty() registrationNumber: string;
  @ApiProperty({ required: false, nullable: true }) photoId: string | null;
  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true }) bio: LocalizedTextDto | null;
  @ApiProperty({ enum: OFFICIAL_PROFILE_GENDERS }) gender: OfficialProfileGender;
  @ApiProperty({ enum: OFFICIAL_PROFILE_STATUSES }) status: OfficialProfileStatus;
}
