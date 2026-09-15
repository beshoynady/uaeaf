import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { HeroPageDto } from '../../../../common/dto/hero-page.dto.js';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { IconKeyedContentBlockDto } from '../../../../common/dto/content-block.dto.js';
import { PageSeoDto } from '../../../../common/dto/page-seo.dto.js';
import { PUBLICATION_STATES } from '../../../../common/constants/publication-states.js';
import type { PublicationState } from '../../../../common/constants/publication-states.js';

/** Request body for POST /vision-mission-page. */
export class CreateVisionMissionPageDto extends HeroPageDto {
  @ApiProperty()
  @IsMongoId()
  federationId: string;

  @ApiProperty({ required: false, nullable: true, description: 'The photograph behind the vision statement: ref → mediaAssets, must be an image.' })
  @IsOptional()
  @IsMongoId()
  visionImageId?: string | null;

  @ApiProperty({ required: false, nullable: true, description: 'The photograph behind the mission statement: ref → mediaAssets, must be an image.' })
  @IsOptional()
  @IsMongoId()
  missionImageId?: string | null;

  @ApiProperty({ required: false, nullable: true, description: 'The photograph behind the values band: ref → mediaAssets, must be an image.' })
  @IsOptional()
  @IsMongoId()
  valuesImageId?: string | null;

  @ApiProperty({ required: false, nullable: true, description: 'The photograph behind the call to the strategic plan: ref → mediaAssets, must be an image.' })
  @IsOptional()
  @IsMongoId()
  ctaImageId?: string | null;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  visionTitle?: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  visionText: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  missionTitle?: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  missionText: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  goalsTitle?: LocalizedTextDto;

  @ApiProperty({ type: [IconKeyedContentBlockDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IconKeyedContentBlockDto)
  strategicGoals?: IconKeyedContentBlockDto[];

  @ApiProperty({ type: [IconKeyedContentBlockDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IconKeyedContentBlockDto)
  coreValues?: IconKeyedContentBlockDto[];

  @ApiProperty({ type: PageSeoDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PageSeoDto)
  seo?: PageSeoDto;

  @ApiProperty({ enum: PUBLICATION_STATES })
  @IsIn(PUBLICATION_STATES)
  publicationState: PublicationState;
}
