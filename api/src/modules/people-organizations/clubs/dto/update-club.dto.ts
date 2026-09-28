import { PartialType } from '@nestjs/swagger';
import { CreateClubDto } from './create-club.dto.js';

/** Request body for PATCH /clubs/:id. Every field optional; omitting one
 *  leaves it unchanged. */
export class UpdateClubDto extends PartialType(CreateClubDto, { skipNullProperties: false }) {}
