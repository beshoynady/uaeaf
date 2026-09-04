import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { HeroPageDto } from '../../../../common/dto/hero-page.dto.js';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { ContentBlockDto, IconedContentBlockDto } from '../../../../common/dto/content-block.dto.js';
import { PUBLICATION_STATES } from '../../../../common/constants/publication-states.js';
import type { PublicationState } from '../../../../common/constants/publication-states.js';

/** Request body for POST /vision-mission-page. */
export class CreateVisionMissionPageDto extends HeroPageDto {
  @ApiProperty()
  @IsMongoId()
  federationId: string;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  visionText: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  missionText: LocalizedTextDto;

  @ApiProperty({ type: [ContentBlockDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentBlockDto)
  strategicGoals?: ContentBlockDto[];

  @ApiProperty({ type: [IconedContentBlockDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IconedContentBlockDto)
  coreValues?: IconedContentBlockDto[];

  @ApiProperty({ enum: PUBLICATION_STATES })
  @IsIn(PUBLICATION_STATES)
  publicationState: PublicationState;
}
