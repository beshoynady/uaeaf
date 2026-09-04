import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../common/schemas/localized-text.schema.js';
import { LICENSE_LEVELS } from '../../../common/constants/license-levels.js';
import type { LicenseLevel } from '../../../common/constants/license-levels.js';

export type CoachDocument = HydratedDocument<Coach>;

export const COACH_GENDERS = ['Male', 'Female'] as const;
export type CoachGender = (typeof COACH_GENDERS)[number];

export const COACH_STATUSES = ['Active', 'Inactive'] as const;
export type CoachStatus = (typeof COACH_STATUSES)[number];

/** Implements: coaches collection, Domain 2 — People & Organizations
 *  (FigJam node `80:6144`, re-read fresh 2026-09-03). `nationalityId` refs
 *  `countries` — corrected on the live board 2026-09-02 from a plain
 *  String, for consistency with `athletes.nationalityId`. `startDate` is
 *  optional (career start) so years of experience is computed client-side
 *  rather than stored as a static number. */
@Schema({ collection: 'coaches' })
export class Coach extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  fullName: LocalizedText;

  @Prop({ required: true })
  slug: string;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  photoId: Types.ObjectId | null;

  @Prop({ type: String, enum: LICENSE_LEVELS, required: true })
  licenseLevel: LicenseLevel;

  /** Uniqueness added (schema-audit-2026-09-04.md §3.3/§9.5, P1 finding):
   *  `athleteProfiles`/`officialProfiles.registrationNumber` already carry
   *  this exact constraint for the same "official issuing-authority
   *  number" concept — `coaches` had never been given the equivalent
   *  treatment. Declared as a partial index below, not `unique: true`
   *  here — see that index's comment. */
  @Prop({ required: true, trim: true })
  registrationNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Club', default: null })
  clubId: Types.ObjectId | null;

  @Prop({ type: [Types.ObjectId], ref: 'Discipline', default: [] })
  disciplineIds: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Country', required: true })
  nationalityId: Types.ObjectId;

  @Prop({ type: LocalizedTextSchema, default: null })
  bio: LocalizedText | null;

  @Prop({ type: String, enum: COACH_GENDERS, required: true })
  gender: CoachGender;

  @Prop({ type: String, enum: COACH_STATUSES, required: true })
  status: CoachStatus;

  @Prop({ type: Date, default: null })
  startDate: Date | null;
}

export const CoachSchema = SchemaFactory.createForClass(Coach);
// Partial (not a plain `unique: true` @Prop) so a soft-deleted coach's
// slug/registrationNumber don't permanently block a corrected re-creation
// (schema-audit-2026-09-04.md §9.2, P1 finding).
CoachSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { archivedAt: null } });
CoachSchema.index(
  { registrationNumber: 1 },
  { unique: true, partialFilterExpression: { archivedAt: null } },
);
