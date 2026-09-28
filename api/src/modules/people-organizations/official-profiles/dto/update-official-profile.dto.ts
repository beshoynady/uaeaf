import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateOfficialProfileDto } from './create-official-profile.dto.js';

/**
 * Request body for PATCH /official-profiles/:id. Every field optional;
 * omitting one leaves it unchanged.
 *
 * `officialId` is omitted rather than made optional (CLAUDE.md §31 point 2 —
 * prefer the unsafe state unreachable over a condition someone has to
 * remember). Re-parenting a profile to a different official does not re-run
 * `create()`'s Local-residency/one-profile-per-official checks, so a caller
 * could otherwise use this route to end up with two profiles for one
 * official, or a Guest official with a profile. The global `ValidationPipe`
 * (`whitelist: true, forbidNonWhitelisted: true`) refuses a body carrying
 * `officialId` outright, before the controller ever runs — relinking is a
 * different operation with different rules; if it is ever wanted it gets
 * its own route with those checks.
 */
export class UpdateOfficialProfileDto extends PartialType(
  OmitType(CreateOfficialProfileDto, ['officialId'] as const),
  { skipNullProperties: false },
) {}
