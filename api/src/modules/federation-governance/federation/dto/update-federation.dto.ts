import { PartialType } from '@nestjs/swagger';
import { CreateFederationDto } from './create-federation.dto.js';

/** Request body for PATCH /federation/:id. Every field optional; omitting
 *  one leaves it unchanged. */
export class UpdateFederationDto extends PartialType(CreateFederationDto, { skipNullProperties: false }) {}
