import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { HeroPageDto } from '../../../../common/dto/hero-page.dto.js';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { SocialLinkDto } from '../../../people-organizations/clubs/dto/social-link.dto.js';

/** Request shape for one `phones[]` entry. */
export class LabelledPhoneDto {
  @ApiProperty({ type: LocalizedTextDto, description: 'e.g. Main Line / Help Center.' })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  label: LocalizedTextDto;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  number: string;
}

/** Request shape for `address` — all parts plain strings, per the board. */
export class PostalAddressDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() country?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() emirate?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() city?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() area?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() street?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() building?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() poBox?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() postalCode?: string;
}

/** Request body for PUT /contact-us-page. Singleton: one upsert DTO. */
export class UpsertContactUsPageDto extends HeroPageDto {
  @ApiProperty({ description: 'Public-facing contact address for the whole site.' })
  @IsEmail()
  email: string;

  @ApiProperty({ type: [LabelledPhoneDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabelledPhoneDto)
  phones?: LabelledPhoneDto[];

  @ApiProperty({ type: PostalAddressDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PostalAddressDto)
  address?: PostalAddressDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  googleMapsUrl?: string;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  officeHours?: LocalizedTextDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ type: [SocialLinkDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socialLinks?: SocialLinkDto[];
}
