import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { HeroPageDto } from '../../../../common/dto/hero-page.dto.js';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { ContentBlockDto } from '../../../../common/dto/content-block.dto.js';
import { PUBLICATION_STATES } from '../../../../common/constants/publication-states.js';
import type { PublicationState } from '../../../../common/constants/publication-states.js';

/** Request body for POST /president-message-page. */
export class CreatePresidentMessagePageDto extends HeroPageDto {
  @ApiProperty({ description: 'Canonical link to the presidential appointment/term.' })
  @IsMongoId()
  federationAppointmentId: string;

  @ApiProperty({ type: [ContentBlockDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentBlockDto)
  goals?: ContentBlockDto[];

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  messageBody: LocalizedTextDto;

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

  @ApiProperty({ enum: PUBLICATION_STATES })
  @IsIn(PUBLICATION_STATES)
  publicationState: PublicationState;
}
