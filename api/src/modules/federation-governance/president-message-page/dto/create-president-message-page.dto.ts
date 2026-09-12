import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { HeroPageDto } from '../../../../common/dto/hero-page.dto.js';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { LocalizedRichTextDto } from '../../../../common/dto/localized-rich-text.dto.js';
import { IconKeyedContentBlockDto } from '../../../../common/dto/content-block.dto.js';
import { PageSeoDto } from '../../../../common/dto/page-seo.dto.js';
import { PUBLICATION_STATES } from '../../../../common/constants/publication-states.js';
import type { PublicationState } from '../../../../common/constants/publication-states.js';

/** Request body for POST /president-message-page. */
export class CreatePresidentMessagePageDto extends HeroPageDto {
  @ApiProperty({ description: 'Canonical link to the presidential appointment/term.' })
  @IsMongoId()
  federationAppointmentId: string;

  @ApiProperty({ required: false, description: "The president's portrait — ref → mediaAssets." })
  @IsOptional()
  @IsMongoId()
  featuredImageId?: string;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  pullQuote?: LocalizedTextDto;

  @ApiProperty({
    type: LocalizedRichTextDto,
    description: 'ProseMirror/TipTap document per language, checked against the ADR-0069 allowlist.',
  })
  @ValidateNested()
  @Type(() => LocalizedRichTextDto)
  messageBody: LocalizedRichTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  valuesTitle?: LocalizedTextDto;

  @ApiProperty({ type: [IconKeyedContentBlockDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IconKeyedContentBlockDto)
  values?: IconKeyedContentBlockDto[];

  @ApiProperty({
    type: LocalizedTextDto,
    description: 'Denormalized display snapshot — canonical identity is federationAppointmentId.',
  })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  signatoryName: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, description: 'Denormalized display snapshot.' })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  signatoryTitle: LocalizedTextDto;

  @ApiProperty({ type: PageSeoDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PageSeoDto)
  seo?: PageSeoDto;

  @ApiProperty({ enum: PUBLICATION_STATES })
  @IsIn(PUBLICATION_STATES)
  publicationState: PublicationState;
}
