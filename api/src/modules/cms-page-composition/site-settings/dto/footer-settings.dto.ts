import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';

/** The footer's three column headings (ADR-0092). A heading left out or
 *  `null` is stored as `null`, which the site reads as its built-in one. */
export class FooterHeadingsDto {
  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  quickLinks?: LocalizedTextDto | null;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  location?: LocalizedTextDto | null;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  contact?: LocalizedTextDto | null;
}

/**
 * Request body for PUT /site-settings/footer — the footer's own words, the way
 * the dashboard's footer screen saves them: whole, with a cleared field sent
 * as `null` or left out. Everything else the footer shows is read from the
 * contact page's record or from the site's navigation, and is not accepted
 * here.
 */
export class FooterSettingsDto {
  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true, description: 'The description under the federation\'s name.' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  footerAboutBlurb?: LocalizedTextDto | null;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  copyrightText?: LocalizedTextDto | null;

  @ApiProperty({ type: FooterHeadingsDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => FooterHeadingsDto)
  footerHeadings?: FooterHeadingsDto | null;
}
