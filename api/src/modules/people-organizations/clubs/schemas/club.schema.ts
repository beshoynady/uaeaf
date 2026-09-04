import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import { SocialLink, SocialLinkSchema } from '../../../../common/schemas/social-link.schema.js';

export type ClubDocument = HydratedDocument<Club>;

export const CLUB_TYPES = ['SportsClub', 'School', 'University', 'Academy', 'Other'] as const;
export type ClubType = (typeof CLUB_TYPES)[number];

export const CLUB_STATUSES = ['Active', 'Inactive'] as const;
export type ClubStatus = (typeof CLUB_STATUSES)[number];

/** Implements: clubs collection, Domain 2 — People & Organizations (FigJam
 *  node `80:5970`, re-read fresh 2026-09-03). `introVideoId` refs `videos`,
 *  not `mediaAssets` — corrected on the live board 2026-09-02 (a video is
 *  not an image). `latitude`/`longitude` are reserved placeholders, not yet
 *  populated per the board's own note. */
@Schema({ collection: 'clubs' })
export class Club extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  name: LocalizedText;

  @Prop({ required: true })
  slug: string;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  logoId: Types.ObjectId | null;

  @Prop({ type: Date, required: true })
  foundingDate: Date;

  @Prop({ type: Types.ObjectId, ref: 'Country', required: true })
  emirateId: Types.ObjectId;

  /** Uniqueness added (schema-audit-2026-09-04.md §3.3/§9.5, P1 finding):
   *  `athleteProfiles`/`officialProfiles.registrationNumber` already carry
   *  this exact constraint for the same "official issuing-authority
   *  number" concept — `clubs` had never been given the equivalent
   *  treatment, so two clubs with the same registration number were
   *  silently accepted. Declared as a partial index below, not
   *  `unique: true` here — see that index's comment. */
  @Prop({ required: true, trim: true })
  registrationNumber: string;

  @Prop({ type: String, enum: CLUB_TYPES, required: true })
  clubType: ClubType;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  coverImage: Types.ObjectId | null;

  @Prop({ type: LocalizedTextSchema, default: null })
  description: LocalizedText | null;

  @Prop({ type: String, default: null })
  email: string | null;

  @Prop({ type: String, default: null })
  phone: string | null;

  @Prop({ type: LocalizedTextSchema, default: null })
  address: LocalizedText | null;

  @Prop({ type: String, default: null })
  website: string | null;

  @Prop({ type: [SocialLinkSchema], default: [] })
  socialLinks: SocialLink[];

  @Prop({ type: Types.ObjectId, ref: 'Venue', default: null })
  venueId: Types.ObjectId | null;

  @Prop({ type: String, enum: CLUB_STATUSES, required: true })
  status: ClubStatus;

  @Prop({ type: Types.ObjectId, ref: 'Video', default: null })
  introVideoId: Types.ObjectId | null;

  @Prop({ type: Number, default: null })
  latitude: number | null;

  @Prop({ type: Number, default: null })
  longitude: number | null;
}

export const ClubSchema = SchemaFactory.createForClass(Club);
// Partial (not a plain `unique: true` @Prop) so a soft-deleted club's
// slug/registrationNumber don't permanently block a corrected re-creation
// (schema-audit-2026-09-04.md §9.2, P1 finding).
ClubSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { archivedAt: null } });
ClubSchema.index(
  { registrationNumber: 1 },
  { unique: true, partialFilterExpression: { archivedAt: null } },
);
