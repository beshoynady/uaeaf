import { PartialType } from '@nestjs/swagger';
import { CreateElectionCycleDto } from './create-election-cycles.dto.js';

/** Request body for PATCH /election-cycles/:id. Every field optional;
 *  omitting one leaves it unchanged. */
export class UpdateElectionCycleDto extends PartialType(CreateElectionCycleDto, { skipNullProperties: false }) {}
