import { PartialType } from '@nestjs/swagger';
import { CreateCountryDto } from './create-country.dto.js';

/** Request body for PATCH /countries/:id. Every field optional; omitting
 *  one leaves it unchanged. */
export class UpdateCountryDto extends PartialType(CreateCountryDto, { skipNullProperties: false }) {}
