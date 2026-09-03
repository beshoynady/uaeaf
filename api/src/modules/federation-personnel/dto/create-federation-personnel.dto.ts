import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';
import { SocialLinkDto } from '../../clubs/dto/social-link.dto.js';
import { FEDERATION_PERSONNEL_STATUSES } from '../schemas/federation-personnel.schema.js';
import type { FederationPersonnelStatus } from '../schemas/federation-personnel.schema.js';

/** `publicContact` request shape — `[PUBLIC]` official contact only. */
export class PersonnelPublicContactDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}

/** `internalContact` request shape — `[RESTRICTED]`, admin-only. */
export class PersonnelInternalContactDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  personalEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  idNumber?: string;
}

/** Request body for POST /federation-personnel. */
export class CreateFederationPersonnelDto {
  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  fullName: LocalizedTextDto;

  @ApiProperty({ required: false, description: 'ref → mediaAssets, must be an image.' })
  @IsOptional()
  @IsMongoId()
  photoId?: string;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  shortBio?: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  biography?: LocalizedTextDto;

  @ApiProperty()
  @IsMongoId()
  nationalityId: string;

  @ApiProperty({ type: PersonnelPublicContactDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PersonnelPublicContactDto)
  publicContact?: PersonnelPublicContactDto;

  @ApiProperty({ type: PersonnelInternalContactDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PersonnelInternalContactDto)
  internalContact?: PersonnelInternalContactDto;

  @ApiProperty({ enum: FEDERATION_PERSONNEL_STATUSES })
  @IsIn(FEDERATION_PERSONNEL_STATUSES)
  status: FederationPersonnelStatus;

  @ApiProperty({ type: [SocialLinkDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socialLinks?: SocialLinkDto[];
}
