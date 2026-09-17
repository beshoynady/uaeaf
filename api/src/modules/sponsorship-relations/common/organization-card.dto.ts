import { ApiProperty } from '@nestjs/swagger';
import { PublicImageDto } from '../../../common/dto/public-page.dto.js';

/** An organisation's name as the public reads it: each side as stored,
 *  `null` where the organisation has no name in that language (ADR-0085 D4). */
export class OrganizationNamePublicDto {
  @ApiProperty({ nullable: true }) ar: string | null;
  @ApiProperty({ nullable: true }) en: string | null;
}

/** One logo-plus-name card: what a partner and a membership both are on the
 *  homepage (ADR-0077 D3, ADR-0085 D5). A card with no logo draws its name in
 *  the logo's place. */
export class OrganizationCardPublicDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: OrganizationNamePublicDto }) name: OrganizationNamePublicDto;
  @ApiProperty({ type: PublicImageDto, nullable: true }) logo: PublicImageDto | null;
  @ApiProperty() displayOrder: number;
}
