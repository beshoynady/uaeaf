import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { COUNTRY_TYPES } from '../schemas/country.schema.js';
import type { CountryType } from '../schemas/country.schema.js';

/** Request body for POST /countries. */
export class CreateCountryDto {
  @ApiProperty({ description: 'Bilingual country/emirate name.', type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiProperty({ description: 'Whether this is a sovereign country or a UAE emirate.', enum: COUNTRY_TYPES })
  @IsIn(COUNTRY_TYPES)
  type: CountryType;
}
