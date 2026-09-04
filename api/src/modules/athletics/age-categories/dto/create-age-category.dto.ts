import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';

/** Request body for POST /age-categories. */
export class CreateAgeCategoryDto {
  @ApiProperty({ description: 'Bilingual age-category name, e.g. { en: "U18", ar: "تحت 18" }.', type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiProperty({ description: 'Minimum age (inclusive).' })
  @IsInt()
  @Min(0)
  minAge: number;

  @ApiProperty({ description: 'Maximum age (inclusive).' })
  @IsInt()
  @Min(0)
  maxAge: number;
}
