import { PartialType } from '@nestjs/swagger';
import { CreateAgeCategoryDto } from './create-age-category.dto.js';

/** Request body for PATCH /age-categories/:id. Every field optional;
 *  omitting one leaves it unchanged. */
export class UpdateAgeCategoryDto extends PartialType(CreateAgeCategoryDto, { skipNullProperties: false }) {}
