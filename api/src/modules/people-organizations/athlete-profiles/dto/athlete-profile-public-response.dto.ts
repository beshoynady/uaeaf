import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { SocialLinkDto } from '../../clubs/dto/social-link.dto.js';
import { ATHLETE_PROFILE_STATUSES } from '../schemas/athlete-profile.schema.js';
import type { AthleteProfileStatus } from '../schemas/athlete-profile.schema.js';

/** Public-safe `AthleteProfile` shape — deliberately excludes `restricted`
 *  (`[SENSITIVE-MINOR]`/PII). A distinct response class, never the raw
 *  document, per the 2026-09-03 correction. */
export class AthleteProfilePublicResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() athleteId: string;
  @ApiProperty() slug: string;
  @ApiProperty({ required: false, nullable: true }) clubId: string | null;
  @ApiProperty() registrationNumber: string;
  @ApiProperty({ enum: ATHLETE_PROFILE_STATUSES }) status: AthleteProfileStatus;
  @ApiProperty({ required: false, nullable: true }) photoId: string | null;
  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true }) bio: LocalizedTextDto | null;
  @ApiProperty({ type: [SocialLinkDto] }) socialLinks: SocialLinkDto[];
}
