import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import {
  SPONSORSHIP_STATUSES,
  SPONSORSHIP_TARGET_TYPES,
  SPONSORSHIP_TIERS,
} from '../schemas/sponsorship.schema.js';
import type { SponsorshipStatus, SponsorshipTargetType, SponsorshipTier } from '../schemas/sponsorship.schema.js';

/** Request body for POST /sponsorships. Dates are instants (ISO 8601); the
 *  dashboard types them in Asia/Dubai and converts. `isDemo` is absent by
 *  design (ADR-0085 D2.1). */
export class CreateSponsorshipDto {
  @ApiProperty() @IsMongoId() sponsorId: string;

  @ApiProperty({ enum: SPONSORSHIP_TARGET_TYPES }) @IsIn(SPONSORSHIP_TARGET_TYPES) targetType: SponsorshipTargetType;

  @ApiPropertyOptional({
    nullable: true,
    description: 'For Federation: the federation record, or empty. For Championship/Event: empty until those collections exist.',
  })
  @IsOptional()
  @IsMongoId()
  targetId?: string | null;

  @ApiProperty({ enum: SPONSORSHIP_TIERS }) @IsIn(SPONSORSHIP_TIERS) tier: SponsorshipTier;

  @ApiProperty() @IsDateString() startDate: string;

  @ApiPropertyOptional({ nullable: true, description: 'Empty is open-ended. Required for Championship and Event.' })
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional({ enum: SPONSORSHIP_STATUSES }) @IsOptional() @IsIn(SPONSORSHIP_STATUSES) status?: SponsorshipStatus;

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsMongoId() bannerAssetId?: string | null;

  @ApiPropertyOptional({ type: LocalizedTextDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  promotionalText?: LocalizedTextDto | null;

  @ApiPropertyOptional({ type: LocalizedTextDto, nullable: true, description: 'What exactly is sponsored, at most 120 characters a side.' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  scopeLabel?: LocalizedTextDto | null;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;

  @ApiProperty() @IsInt() displayOrder: number;

  @ApiPropertyOptional({ description: 'Hidden unless true.' }) @IsOptional() @IsBoolean() isVisible?: boolean;
}

/** Request body for PATCH /sponsorships/:id. */
export class UpdateSponsorshipDto extends PartialType(CreateSponsorshipDto) {}
