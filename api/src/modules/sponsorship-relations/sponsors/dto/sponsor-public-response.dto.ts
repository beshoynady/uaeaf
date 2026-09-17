import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { PublicImageDto } from '../../../../common/dto/public-page.dto.js';
import { OrganizationNamePublicDto } from '../../common/organization-card.dto.js';

/** A sponsor as the public reads it, inside a sponsorship. Structurally
 *  omits `restricted` and `isDemo`: a distinct class, never a filtered copy
 *  of the document (the discipline `SiteSettingsPublicResponseDto` set). */
export class SponsorPublicResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: OrganizationNamePublicDto }) name: OrganizationNamePublicDto;
  @ApiProperty({ type: PublicImageDto, nullable: true }) logo: PublicImageDto | null;
  @ApiProperty({ nullable: true }) website: string | null;
  @ApiProperty({ type: LocalizedTextDto, nullable: true }) categoryLabel: LocalizedTextDto | null;
}
