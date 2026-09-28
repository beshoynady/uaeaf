import { PartialType } from '@nestjs/swagger';
import { CreatePageDto } from './create-pages.dto.js';

/** Request body for PATCH /pages/:id. Every field optional; omitting one
 *  leaves it unchanged. */
export class UpdatePageDto extends PartialType(CreatePageDto, { skipNullProperties: false }) {}
