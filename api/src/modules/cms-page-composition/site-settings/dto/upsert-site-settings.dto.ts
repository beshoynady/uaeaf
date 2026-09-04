import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';

/** Request shape for the `defaultSeo` embed. */
export class DefaultSeoDto {
  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  titleSuffix?: LocalizedTextDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  defaultOgImageId?: string;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  defaultDescription?: LocalizedTextDto;
}

/** Request body for PUT /site-settings. Singleton: one upsert DTO. */
export class UpsertSiteSettingsDto {
  @ApiProperty({ type: DefaultSeoDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => DefaultSeoDto)
  defaultSeo?: DefaultSeoDto;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  footerAboutBlurb?: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  copyrightText?: LocalizedTextDto;

  @ApiProperty({ required: false }) @IsOptional() @IsMongoId() logoId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsMongoId() logoDarkId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsMongoId() faviconId?: string;

  @ApiProperty({ required: false, description: 'poly → pages | staticPages.' })
  @IsOptional() @IsMongoId() privacyPolicyPageId?: string;

  @ApiProperty({ required: false, description: 'poly → pages | staticPages.' })
  @IsOptional() @IsMongoId() termsOfUsePageId?: string;

  @ApiProperty({ required: false, description: 'poly → pages | staticPages.' })
  @IsOptional() @IsMongoId() accessibilityStatementPageId?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() cookieConsentEnabled?: boolean;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  cookieConsentText?: LocalizedTextDto;

  @ApiProperty({ required: false, description: '[RESTRICTED]' })
  @IsOptional() @IsBoolean() isMaintenanceMode?: boolean;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  maintenanceMessage?: LocalizedTextDto;

  @ApiProperty({ required: false, description: '[RESTRICTED]' })
  @IsOptional() @IsString() googleAnalyticsId?: string;

  @ApiProperty({ required: false, description: '[RESTRICTED]' })
  @IsOptional() @IsString() metaPixelId?: string;

  @ApiProperty({ required: false, description: '[RESTRICTED]' })
  @IsOptional() @IsInt() sessionTimeoutMinutes?: number;

  @ApiProperty({ required: false, description: '[RESTRICTED]' })
  @IsOptional() @IsInt() maxLoginAttempts?: number;

  @ApiProperty({ required: false, description: '[RESTRICTED]' })
  @IsOptional() @IsString() systemEmailSender?: string;
}
