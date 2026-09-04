import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../common/schemas/localized-text.schema.js';
import { SocialLink, SocialLinkSchema } from '../../../common/schemas/social-link.schema.js';
import { RestrictedProfileInfo, RestrictedProfileInfoSchema } from './restricted-profile-info.schema.js';

export type AthleteProfileDocument = HydratedDocument<AthleteProfile>;

export const ATHLETE_PROFILE_STATUSES = ['Active', 'Inactive', 'Suspended', 'Retired'] as const;
export type AthleteProfileStatus = (typeof ATHLETE_PROFILE_STATUSES)[number];

/** Implements: athleteProfiles collection, Domain 2 — People & Organizations
 *  (FigJam node `559:8222`, re-read fresh 2026-09-03; finalized per the
 *  2026-09-03 correction). 1:1 with `athletes`, and only ever created for
 *  `athletes.residencyType='Local'` — enforced in
 *  `AthleteProfilesService.create()`, not just documented (see confirmed
 *  decision #1). `athleteId` carries a unique index for defense-in-depth
 *  alongside that application-level check. `registrationNumber` is also
 *  unique (2026-09-03 correction).
 *
 *  `slug` is now the SOLE public routing identifier for an athlete
 *  (`athletes.slug` was removed) — a Guest athlete has no profile row and
 *  therefore no individual public page, which is intentional. Given `slug`
 *  drives public routing, it now also carries a unique index (was
 *  previously missing despite being described as unique — fixed alongside
 *  this correction as a directly-related gap). `clubId` is the athlete's
 *  CURRENT club only — never overwritten to preserve history; history
 *  lives in `athleteClubHistory`, unaffected by this correction.
 *
 *  `athleteId`/`slug`/`registrationNumber`'s unique indexes are declared
 *  below as partial indexes (`partialFilterExpression: {archivedAt:
 *  null}`), not via `unique: true` on the `@Prop`s — otherwise a
 *  soft-deleted profile would permanently block a corrected re-creation
 *  of the same athlete's profile (schema-audit-2026-09-04.md §9.2, P1
 *  finding). */
@Schema({ collection: 'athleteProfiles' })
export class AthleteProfile extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Athlete', required: true })
  athleteId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  slug: string;

  @Prop({ type: Types.ObjectId, ref: 'Club', default: null })
  clubId: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  registrationNumber: string;

  @Prop({ type: RestrictedProfileInfoSchema, required: true })
  restricted: RestrictedProfileInfo;

  @Prop({ type: String, enum: ATHLETE_PROFILE_STATUSES, required: true })
  status: AthleteProfileStatus;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  photoId: Types.ObjectId | null;

  @Prop({ type: LocalizedTextSchema, default: null })
  bio: LocalizedText | null;

  @Prop({ type: [SocialLinkSchema], default: [] })
  socialLinks: SocialLink[];
}

export const AthleteProfileSchema = SchemaFactory.createForClass(AthleteProfile);
AthleteProfileSchema.index(
  { athleteId: 1 },
  { unique: true, partialFilterExpression: { archivedAt: null } },
);
AthleteProfileSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { archivedAt: null } });
AthleteProfileSchema.index(
  { registrationNumber: 1 },
  { unique: true, partialFilterExpression: { archivedAt: null } },
);
