import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { OrganizationNameDto } from '../../../../common/dto/organization-name.dto.js';
import { MEMBERSHIP_STATUSES, MEMBERSHIP_TYPES } from '../schemas/membership.schema.js';
import type { MembershipStatus, MembershipType } from '../schemas/membership.schema.js';

/** Request body for POST /memberships. `isDemo` is absent by design. */
export class CreateMembershipDto {
  @ApiProperty({ type: OrganizationNameDto })
  @ValidateNested()
  @Type(() => OrganizationNameDto)
  organizationName: OrganizationNameDto;

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsMongoId() organizationLogoId?: string | null;

  @ApiProperty({ enum: MEMBERSHIP_TYPES }) @IsIn(MEMBERSHIP_TYPES) membershipType: MembershipType;

  @ApiProperty() @IsDateString() startDate: string;

  @ApiPropertyOptional({ nullable: true, description: 'Empty is ongoing.' }) @IsOptional() @IsDateString() endDate?: string | null;

  @ApiPropertyOptional({ enum: MEMBERSHIP_STATUSES }) @IsOptional() @IsIn(MEMBERSHIP_STATUSES) status?: MembershipStatus;

  @ApiProperty() @IsInt() displayOrder: number;

  @ApiPropertyOptional({ description: 'Hidden unless true.' }) @IsOptional() @IsBoolean() isVisible?: boolean;
}

/** Request body for PATCH /memberships/:id. */
export class UpdateMembershipDto extends PartialType(CreateMembershipDto) {}
