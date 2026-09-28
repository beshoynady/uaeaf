import { PartialType } from '@nestjs/swagger';
import { CreateVenueDto } from './create-venue.dto.js';

/** Request body for PATCH /venues/:id. Every field optional; omitting one
 *  leaves it unchanged. */
export class UpdateVenueDto extends PartialType(CreateVenueDto, { skipNullProperties: false }) {}
