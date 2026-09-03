import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../common/schemas/localized-text.schema.js';
import { LICENSE_LEVELS } from '../../../common/constants/license-levels.js';
import type { LicenseLevel } from '../../../common/constants/license-levels.js';
import { RESIDENCY_TYPES } from '../../../common/constants/residency-types.js';
import type { ResidencyType } from '../../../common/constants/residency-types.js';

export type OfficialDocument = HydratedDocument<Official>;

export const OFFICIAL_ROLE_TYPES = ['Referee', 'Judge', 'Starter', 'Timekeeper', 'TechnicalDelegate', 'Other'] as const;
export type OfficialRoleType = (typeof OFFICIAL_ROLE_TYPES)[number];

/** Implements: officials collection, Domain 2 — People & Organizations
 *  (FigJam node `80:6182`, re-read fresh 2026-09-03; finalized per the
 *  2026-09-03 correction). Same Local/Guest `residencyType` unification
 *  pattern as `athletes` (see that schema's doc comment) — Local officials
 *  have a linked `officialProfiles` row, Guest officials do not.
 *  `nationalityId` refs `countries`, replacing an earlier free-text field,
 *  for consistency with `athletes.nationalityId`.
 *
 *  No `slug` (removed 2026-09-03): the public routing identifier is now
 *  solely `officialProfiles.slug` — a Guest official (no Profile row) has
 *  no individual public page, which is intentional. */
@Schema({ collection: 'officials' })
export class Official extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  fullName: LocalizedText;

  @Prop({ type: String, enum: OFFICIAL_ROLE_TYPES, required: true })
  roleType: OfficialRoleType;

  @Prop({ type: String, enum: LICENSE_LEVELS, required: true })
  licenseLevel: LicenseLevel;

  /** Same flagged future-redesign / access-isolation note as
   *  `Athlete.disciplineIds` — see that schema. */
  @Prop({ type: [Types.ObjectId], ref: 'Discipline', default: [] })
  disciplineIds: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Country', required: true })
  nationalityId: Types.ObjectId;

  @Prop({ type: String, enum: RESIDENCY_TYPES, required: true })
  residencyType: ResidencyType;

  @Prop({ type: LocalizedTextSchema, default: null })
  federationName: LocalizedText | null;
}

export const OfficialSchema = SchemaFactory.createForClass(Official);
