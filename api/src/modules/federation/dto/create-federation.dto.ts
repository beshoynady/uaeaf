import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsMongoId, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';
import { FEDERATION_STATUSES } from '../schemas/federation.schema.js';
import type { FederationStatus } from '../schemas/federation.schema.js';

/** Request body for POST /federation. */
export class CreateFederationDto {
  @ApiProperty({ type: LocalizedTextDto, description: 'Full official name.' })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  shortName?: LocalizedTextDto;

  @ApiProperty({ required: false, description: 'Plain (non-bilingual) string, e.g. "UAEAF".' })
  @IsOptional()
  @IsString()
  acronym?: string;

  @ApiProperty({ description: 'ref → mediaAssets, must be an image.' })
  @IsMongoId()
  logoId: string;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  address?: LocalizedTextDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  registrationAuthority?: string;

  @ApiProperty({ enum: FEDERATION_STATUSES })
  @IsIn(FEDERATION_STATUSES)
  status: FederationStatus;
}
