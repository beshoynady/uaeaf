import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { SocialLinkDto } from '../../../people-organizations/clubs/dto/social-link.dto.js';
import { FEDERATION_PERSONNEL_STATUSES } from '../schemas/federation-personnel.schema.js';
import type { FederationPersonnelStatus } from '../schemas/federation-personnel.schema.js';

/** Response-side shape of `publicContact`. Distinct from the request DTO:
 *  stored absent values are `null` (schema default), not `undefined`. */
export class PersonnelPublicContactResponseDto {
  @ApiProperty({ required: false, nullable: true }) email: string | null;
  @ApiProperty({ required: false, nullable: true }) phone: string | null;
}

/** Public-safe `FederationPersonnel` shape — structurally excludes
 *  `internalContact` (`[RESTRICTED]`: personalEmail / idNumber). A distinct
 *  response class rather than a conditionally-serialised subset, the same
 *  discipline applied to `athleteProfiles.restricted` in Week 3. */
export class FederationPersonnelPublicResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: LocalizedTextDto }) fullName: LocalizedTextDto;
  @ApiProperty({ required: false, nullable: true }) photoId: string | null;
  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true }) shortBio: LocalizedTextDto | null;
  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true }) biography: LocalizedTextDto | null;
  @ApiProperty() nationalityId: string;
  @ApiProperty({ type: PersonnelPublicContactResponseDto, required: false, nullable: true })
  publicContact: PersonnelPublicContactResponseDto | null;
  @ApiProperty({ enum: FEDERATION_PERSONNEL_STATUSES }) status: FederationPersonnelStatus;
  @ApiProperty({ type: [SocialLinkDto] }) socialLinks: SocialLinkDto[];
}
