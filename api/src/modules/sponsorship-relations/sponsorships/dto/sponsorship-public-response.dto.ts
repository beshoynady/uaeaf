import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { SponsorPublicResponseDto } from '../../sponsors/dto/sponsor-public-response.dto.js';
import { SPONSORSHIP_TARGET_TYPES, SPONSORSHIP_TIERS } from '../schemas/sponsorship.schema.js';
import type { SponsorshipTargetType, SponsorshipTier } from '../schemas/sponsorship.schema.js';

/** A running sponsorship as the public reads it (ADR-0085): the sponsor,
 *  its tier, what it sponsors, and the window the site and the dashboard
 *  preview apply with the shared rule. `status`, `isVisible`, `isDemo`
 *  and the target id stay on the server. */
export class SponsorshipPublicResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: SponsorPublicResponseDto }) sponsor: SponsorPublicResponseDto;
  @ApiProperty({ enum: SPONSORSHIP_TIERS }) tier: SponsorshipTier;
  @ApiProperty({ enum: SPONSORSHIP_TARGET_TYPES }) targetType: SponsorshipTargetType;
  @ApiProperty({ type: LocalizedTextDto, nullable: true }) scopeLabel: LocalizedTextDto | null;
  @ApiProperty() isFeatured: boolean;
  @ApiProperty() displayOrder: number;
  @ApiProperty() startDate: string;
  @ApiProperty({ nullable: true }) endDate: string | null;
}
