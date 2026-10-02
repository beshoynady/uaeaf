import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsMongoId, IsOptional, ValidateIf, ValidateNested } from 'class-validator';
import { CreateCommitteeDto } from './create-committees.dto.js';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { CommitteeDutyDto } from './committee-duty.dto.js';
import { FormationDecisionDto } from './formation-decision.dto.js';
import { COMMITTEE_KINDS } from '../schemas/committees.schema.js';
import type { CommitteeKind } from '../schemas/committees.schema.js';

/** Request body for PATCH /committees/:id. Every field optional; omitting
 *  one leaves it unchanged.
 *
 *  Writes the draft row directly, same as `ArticlesService.update()` —
 *  `committees` is workflow-governed (List A/B), but a revision is a
 *  snapshot `RevisionsService`/`PublishingService` freeze at submit/publish
 *  time, not something an ordinary field edit creates (confirmed against
 *  `articles.service.ts`, which saves its own draft the same way).
 *
 *  The nullable fields below are redeclared, matching `UpdateSeasonDto`:
 *  `undefined` leaves the stored value, `null` clears it. `duties`,
 *  `documentIds` and `isVisible` are redeclared for the opposite reason —
 *  `null` is refused there, matching `setObjectIdArrayField`'s rule that no
 *  array field accepts null, extended here to the plain boolean it sits
 *  beside. `@IsOptional()`, inherited from `CreateCommitteeDto` on all
 *  three, would otherwise AND with `PartialType`'s own `ValidateIf` and
 *  still skip every validator on `null`. */
export class UpdateCommitteeDto extends PartialType(CreateCommitteeDto, { skipNullProperties: false }) {
  @ApiPropertyOptional({ type: LocalizedTextDto, nullable: true, description: 'Pass null to clear.' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  summary?: LocalizedTextDto | null;

  @ApiPropertyOptional({ type: LocalizedTextDto, nullable: true, description: 'Pass null to clear.' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  about?: LocalizedTextDto | null;

  @ApiPropertyOptional({ type: FormationDecisionDto, nullable: true, description: 'Pass null to clear.' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FormationDecisionDto)
  formationDecision?: FormationDecisionDto | null;

  @ApiPropertyOptional({ enum: COMMITTEE_KINDS, nullable: true, description: 'Pass null to clear.' })
  @IsOptional()
  @IsIn(COMMITTEE_KINDS)
  kind?: CommitteeKind | null;

  @ApiPropertyOptional({ nullable: true, description: 'Pass null to clear.' })
  @IsOptional()
  @IsMongoId()
  parentCommitteeId?: string | null;

  @ApiPropertyOptional({ type: [CommitteeDutyDto], description: 'Omit to leave unchanged; null is refused.' })
  @ValidateIf((_, value) => value !== undefined)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommitteeDutyDto)
  duties?: CommitteeDutyDto[];

  @ApiPropertyOptional({ type: [String], description: 'Omit to leave unchanged; null is refused.' })
  @ValidateIf((_, value) => value !== undefined)
  @IsArray()
  @IsMongoId({ each: true })
  documentIds?: string[];

  @ApiPropertyOptional({ description: 'Omit to leave unchanged; null is refused.' })
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  isVisible?: boolean;
}
