import { PartialType } from '@nestjs/swagger';
import { CreateFederationPersonnelDto } from './create-federation-personnel.dto.js';

/** Request body for PATCH /federation-personnel/:id. Every field optional;
 *  omitting one leaves it unchanged.
 *
 *  `federationPersonnel` is NOT workflow-governed — its own schema doc
 *  comment says so explicitly ("no publicationState, absent from both
 *  Domain 7 closed lists"), and it is absent from `WORKFLOW_ENTITY_TYPES`.
 *  This writes the row directly, like every other plain-CRUD resource. */
export class UpdateFederationPersonnelDto extends PartialType(CreateFederationPersonnelDto, { skipNullProperties: false }) {}
