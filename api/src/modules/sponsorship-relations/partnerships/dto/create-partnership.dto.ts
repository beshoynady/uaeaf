import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { OrganizationNameDto } from '../../../../common/dto/organization-name.dto.js';
import { PARTNERSHIP_TYPES } from '../schemas/partnership.schema.js';
import type { PartnershipType } from '../schemas/partnership.schema.js';

/** Request body for POST /partnerships. `isDemo` is absent by design. */
export class CreatePartnershipDto {
  @ApiProperty({ type: OrganizationNameDto })
  @ValidateNested()
  @Type(() => OrganizationNameDto)
  partnerName: OrganizationNameDto;

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsMongoId() partnerLogoId?: string | null;

  @ApiProperty({ enum: PARTNERSHIP_TYPES }) @IsIn(PARTNERSHIP_TYPES) partnershipType: PartnershipType;

  @ApiProperty() @IsDateString() startDate: string;

  @ApiPropertyOptional({ nullable: true, description: 'Empty is ongoing.' }) @IsOptional() @IsDateString() endDate?: string | null;

  @ApiPropertyOptional({ description: 'The relationship itself, not visibility.' }) @IsOptional() @IsBoolean() isActive?: boolean;

  @ApiProperty() @IsInt() displayOrder: number;

  @ApiPropertyOptional({ description: 'Hidden unless true.' }) @IsOptional() @IsBoolean() isVisible?: boolean;
}

/** Request body for PATCH /partnerships/:id. */
export class UpdatePartnershipDto extends PartialType(CreatePartnershipDto) {}
