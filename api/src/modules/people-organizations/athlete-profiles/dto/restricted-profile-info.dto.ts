import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/** Request-body shape for `athleteProfiles.restricted`. */
export class RestrictedProfileInfoDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  emiratesIdOrPassport?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  email?: string;
}
