import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, ValidateIf, ValidateNested } from 'class-validator';
import { CreateFederationPersonnelDto } from './create-federation-personnel.dto.js';
import { PersonnelCvDto } from './personnel-cv.dto.js';

/** Request body for PATCH /federation-personnel/:id. Every field optional;
 *  omitting one leaves it unchanged.
 *
 *  `federationPersonnel` is NOT workflow-governed — its own schema doc
 *  comment says so explicitly ("no publicationState, absent from both
 *  Domain 7 closed lists"), and it is absent from `WORKFLOW_ENTITY_TYPES`.
 *  This writes the row directly, like every other plain-CRUD resource.
 *
 *  `slug` is omitted, not made optional: it is the person's public address
 *  and is fixed after creation (`FederationPersonnelsService.update`
 *  refuses a body that names a different one).
 *
 *  `cv` and `showPublicContact` are redeclared rather than left to
 *  `PartialType`'s own `@IsOptional()`, which ANDs with a second condition
 *  and would still let `null` through onto these non-nullable fields —
 *  `@ValidateIf((_, v) => v !== undefined)` refuses `null` while still
 *  allowing omission. */
export class UpdateFederationPersonnelDto extends PartialType(
  OmitType(CreateFederationPersonnelDto, ['slug'] as const),
  { skipNullProperties: false },
) {
  @ApiPropertyOptional({ type: PersonnelCvDto, description: 'Omit to leave unchanged; null is refused.' })
  @ValidateIf((_, value) => value !== undefined)
  @ValidateNested()
  @Type(() => PersonnelCvDto)
  cv?: PersonnelCvDto;

  @ApiPropertyOptional({ description: 'Omit to leave unchanged; null is refused.' })
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  showPublicContact?: boolean;
}
