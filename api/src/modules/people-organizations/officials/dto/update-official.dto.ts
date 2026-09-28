import { PartialType } from '@nestjs/swagger';
import { CreateOfficialDto } from './create-official.dto.js';

/** Request body for PATCH /officials/:id. Every field optional; omitting
 *  one leaves it unchanged. */
export class UpdateOfficialDto extends PartialType(CreateOfficialDto, { skipNullProperties: false }) {}
