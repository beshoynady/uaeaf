import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsMongoId, IsNumber, IsOptional, IsString, Matches, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { OrganizationNameDto } from '../../../../common/dto/organization-name.dto.js';

/** The protected sub-document. Written and read through the RBAC-gated
 *  routes only. */
export class SponsorRestrictedDto {
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsEmail() contactEmail?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @Matches(/^\+?[0-9\s-]{7,20}$/) contactPhone?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsNumber() contractValue?: number | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsMongoId() contractDocId?: string | null;
}

/** Request body for POST /sponsors. `isDemo` is deliberately absent: only the
 *  seed marks a record as fictional (ADR-0085 D2.1). */
export class CreateSponsorDto {
  @ApiProperty({ type: OrganizationNameDto, description: 'Arabic, English or both — as the organisation writes it.' })
  @ValidateNested()
  @Type(() => OrganizationNameDto)
  name: OrganizationNameDto;

  @ApiProperty({ description: 'A mediaAssets id; required by the specification.' }) @IsMongoId() logoId: string;

  @ApiPropertyOptional({ nullable: true, description: 'http:// or https://' })
  @IsOptional()
  @IsString()
  website?: string | null;

  @ApiPropertyOptional({ type: LocalizedTextDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  categoryLabel?: LocalizedTextDto | null;

  @ApiPropertyOptional({ type: SponsorRestrictedDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SponsorRestrictedDto)
  restricted?: SponsorRestrictedDto;
}

/** Request body for PATCH /sponsors/:id — any subset of the create body. */
export class UpdateSponsorDto extends PartialType(CreateSponsorDto) {}
