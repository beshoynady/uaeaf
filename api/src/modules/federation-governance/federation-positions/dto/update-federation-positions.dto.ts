import { PartialType } from '@nestjs/swagger';
import { CreateFederationPositionDto } from './create-federation-positions.dto.js';

/** Request body for PATCH /federation-positions/:id. Every field optional;
 *  omitting one leaves it unchanged. */
export class UpdateFederationPositionDto extends PartialType(CreateFederationPositionDto, {
  skipNullProperties: false,
}) {}
