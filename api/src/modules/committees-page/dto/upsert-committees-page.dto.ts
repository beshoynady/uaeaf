import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { HeroPageDto } from '../../../common/dto/hero-page.dto.js';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';

/** Request body for PUT /committees-page. Singleton: one upsert DTO. */
export class UpsertCommitteesPageDto extends HeroPageDto {
  @ApiProperty({ type: LocalizedTextDto, description: 'e.g. "حوكمة وتمكين".' })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  introHeading: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  introText: LocalizedTextDto;
}
