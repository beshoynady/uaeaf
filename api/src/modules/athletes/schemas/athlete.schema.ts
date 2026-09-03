import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../common/schemas/localized-text.schema.js';
import { RESIDENCY_TYPES } from '../../../common/constants/residency-types.js';
import type { ResidencyType } from '../../../common/constants/residency-types.js';

export type AthleteDocument = HydratedDocument<Athlete>;

export const ATHLETE_GENDERS = ['Male', 'Female'] as const;
export type AthleteGender = (typeof ATHLETE_GENDERS)[number];

/** Implements: athletes collection, Domain 2 — People & Organizations
 *  (FigJam node `80:6020`, re-read fresh 2026-09-03; finalized per the
 *  2026-09-03 correction). Unifies Local (registered UAEAF member, has a
 *  linked `athleteProfiles` row) and Guest (foreign athlete at a
 *  UAEAF-hosted championship, no profile) via `residencyType` — confirmed
 *  2026-09-01. Deliberately has no `coachId` or `isNationalTeam` field:
 *  current coach and national-team status are derived by querying
 *  `athleteCoachHistory`/`athleteNationalTeamHistory` for a row with
 *  `endDate: null` (see those services), never denormalized here.
 *  `dateOfBirth` is `[SENSITIVE-MINOR]` — governed by ADR-0028 / Federal
 *  Law 26/2025; never expose it in a public response — use
 *  `AthletesService.toPublicResponse()`, not the raw document.
 *
 *  This is a core/internal entity: never add achievement/result/medal/
 *  record/ranking/statistic/participation fields here — those derive from
 *  Season→Competition→Discipline→Category→Result and must never be
 *  duplicated onto Athlete (2026-09-03 correction).
 *
 *  No `slug` (removed 2026-09-03): the public routing identifier is now
 *  solely `athleteProfiles.slug` — a Guest athlete (no Profile row) has no
 *  individual public page at all, which is intentional, not a gap. */
@Schema({ collection: 'athletes' })
export class Athlete extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  name: LocalizedText;

  @Prop({ type: Date, required: true })
  dateOfBirth: Date;

  @Prop({ type: Types.ObjectId, ref: 'Country', required: true })
  nationalityId: Types.ObjectId;

  /** Flagged, NOT-YET-DECIDED future redesign candidate (a richer
   *  athlete-discipline relation) — kept as a plain ref array for now.
   *  Read it only via `AthletesService.getDisciplineIds()`, never by
   *  destructuring this field directly from another module, so a future
   *  migration doesn't touch the public API shape. */
  @Prop({ type: [Types.ObjectId], ref: 'Discipline', default: [] })
  disciplineIds: Types.ObjectId[];

  @Prop({ type: String, enum: ATHLETE_GENDERS, required: true })
  gender: AthleteGender;

  @Prop({ type: String, enum: RESIDENCY_TYPES, required: true })
  residencyType: ResidencyType;

  @Prop({ type: LocalizedTextSchema, default: null })
  federationName: LocalizedText | null;
}

export const AthleteSchema = SchemaFactory.createForClass(Athlete);
