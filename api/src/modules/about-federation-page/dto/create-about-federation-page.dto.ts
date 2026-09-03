import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { HeroPageDto } from '../../../common/dto/hero-page.dto.js';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';
import { PUBLICATION_STATES } from '../../../common/constants/publication-states.js';
import type { PublicationState } from '../../../common/constants/publication-states.js';
import { ABOUT_FEDERATION_MAX_ACHIEVEMENTS } from '../schemas/about-federation-page.schema.js';

/** Request shape for one `achievements[]` milestone. */
export class AchievementDto {
  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  text: LocalizedTextDto;

  @ApiProperty()
  @IsInt()
  year: number;
}

/** Request body for POST /about-federation-page. */
export class CreateAboutFederationPageDto extends HeroPageDto {
  @ApiProperty()
  @IsDateString()
  foundingDate: string;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  historicalIntro: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  foundingDecreeCaption: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  roleHeading: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  roleText: LocalizedTextDto;

  @ApiProperty({ description: 'e.g. 1976.' })
  @IsInt()
  globalMembershipYear: number;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  globalMembershipHeading: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  globalMembershipText: LocalizedTextDto;

  @ApiProperty({ required: false, description: 'ref → mediaAssets, must be an image.' })
  @IsOptional()
  @IsMongoId()
  firstPresidentPhoto?: string;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  firstPresidentName: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  firstPresidentTitle: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  firstPresidentBio: LocalizedTextDto;

  @ApiProperty({ type: [AchievementDto], required: false, maxItems: ABOUT_FEDERATION_MAX_ACHIEVEMENTS })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(ABOUT_FEDERATION_MAX_ACHIEVEMENTS)
  @ValidateNested({ each: true })
  @Type(() => AchievementDto)
  achievements?: AchievementDto[];

  @ApiProperty({ enum: PUBLICATION_STATES })
  @IsIn(PUBLICATION_STATES)
  publicationState: PublicationState;
}
