import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';

export type OfficialProfileDocument = HydratedDocument<OfficialProfile>;

export const OFFICIAL_PROFILE_GENDERS = ['Male', 'Female'] as const;
export type OfficialProfileGender = (typeof OFFICIAL_PROFILE_GENDERS)[number];

export const OFFICIAL_PROFILE_STATUSES = ['Active', 'Inactive'] as const;
export type OfficialProfileStatus = (typeof OFFICIAL_PROFILE_STATUSES)[number];

/** Implements: officialProfiles collection, Domain 2 — People & Organizations
 *  (FigJam node `559:8225`, re-read fresh 2026-09-03; finalized per the
 *  2026-09-03 correction). 1:1 with `officials`, only ever created for
 *  `officials.residencyType='Local'` — enforced in
 *  `OfficialProfilesService.create()`, mirroring `AthleteProfilesService`.
 *  Unlike `athleteProfiles`, this collection has no restricted PII object
 *  and no `socialLinks` — a real content asymmetry confirmed on the live
 *  board, not an omission.
 *
 *  `slug` is new (2026-09-03): `officials.slug` was removed, so this is now
 *  the SOLE public routing identifier for an official — a Guest official
 *  has no profile row and therefore no individual public page, which is
 *  intentional. `clubId` is the official's CURRENT club only — never
 *  overwritten to preserve history; history lives in `officialClubHistory`,
 *  unaffected by this correction. */
@Schema({ collection: 'officialProfiles' })
export class OfficialProfile extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Official', required: true, unique: true })
  officialId: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  slug: string;

  @Prop({ type: Types.ObjectId, ref: 'Club', default: null })
  clubId: Types.ObjectId | null;

  @Prop({ required: true, unique: true, trim: true })
  registrationNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  photoId: Types.ObjectId | null;

  @Prop({ type: LocalizedTextSchema, default: null })
  bio: LocalizedText | null;

  @Prop({ type: String, enum: OFFICIAL_PROFILE_GENDERS, required: true })
  gender: OfficialProfileGender;

  @Prop({ type: String, enum: OFFICIAL_PROFILE_STATUSES, required: true })
  status: OfficialProfileStatus;
}

export const OfficialProfileSchema = SchemaFactory.createForClass(OfficialProfile);
