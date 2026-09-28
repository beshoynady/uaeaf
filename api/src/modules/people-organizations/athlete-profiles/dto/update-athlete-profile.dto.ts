import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateAthleteProfileDto } from './create-athlete-profile.dto.js';

/**
 * Request body for PATCH /athlete-profiles/:id. Every field optional;
 * omitting one leaves it unchanged.
 *
 * `athleteId` is omitted rather than made optional (CLAUDE.md §31 point 2 —
 * prefer the unsafe state unreachable over a condition someone has to
 * remember). Re-parenting a profile to a different athlete does not re-run
 * `create()`'s Local-residency/one-profile-per-athlete checks, so a caller
 * could otherwise use this route to end up with two profiles for one
 * athlete, or a Guest athlete with a profile. The global `ValidationPipe`
 * (`whitelist: true, forbidNonWhitelisted: true`) refuses a body carrying
 * `athleteId` outright, before the controller ever runs — relinking is a
 * different operation with different rules; if it is ever wanted it gets
 * its own route with those checks.
 */
export class UpdateAthleteProfileDto extends PartialType(
  OmitType(CreateAthleteProfileDto, ['athleteId'] as const),
  { skipNullProperties: false },
) {}
