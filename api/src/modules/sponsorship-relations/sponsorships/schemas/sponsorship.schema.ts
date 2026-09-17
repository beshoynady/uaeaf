import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';

export type SponsorshipDocument = HydratedDocument<Sponsorship>;

/** `Department` deliberately excluded (specification: a business decision). */
export const SPONSORSHIP_TARGET_TYPES = ['Federation', 'Championship', 'Event'] as const;
export type SponsorshipTargetType = (typeof SPONSORSHIP_TARGET_TYPES)[number];

/** Highest first. The banner takes the highest tier present (ADR-0085 D5.1). */
export const SPONSORSHIP_TIERS = ['Strategic', 'Official', 'Supporting'] as const;
export type SponsorshipTier = (typeof SPONSORSHIP_TIERS)[number];

/** `Expired` is never written by the system: expiry is computed at read time
 *  in Asia/Dubai (ADR-0077 D2). It stays for manual archiving. */
export const SPONSORSHIP_STATUSES = ['Active', 'Expired', 'Cancelled'] as const;
export type SponsorshipStatus = (typeof SPONSORSHIP_STATUSES)[number];

/** "Exactly what this sponsor sponsors", written freely by the admin
 *  (ADR-0077 D2 #2). */
export const SCOPE_LABEL_MAX = 120;

/** Implements: sponsorships collection, Domain 9, as ADR-0077 D2 and
 *  ADR-0085 D1 amend it: `endDate` optional (open-ended), `targetId`
 *  optional until championships and events exist, and `scopeLabel`,
 *  `isFeatured`, `displayOrder`, `isVisible`, `isDemo` added.
 *
 *  `targetId` registers no `ref`: two of its three targets are collections
 *  not yet built (the established pattern for poly refs). */
@Schema({ collection: 'sponsorships', timestamps: true })
export class Sponsorship extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Sponsor', required: true, index: true })
  sponsorId: Types.ObjectId;

  @Prop({ type: String, enum: SPONSORSHIP_TARGET_TYPES, required: true })
  targetType: SponsorshipTargetType;

  @Prop({ type: Types.ObjectId, default: null })
  targetId: Types.ObjectId | null;

  @Prop({ type: String, enum: SPONSORSHIP_TIERS, required: true })
  tier: SponsorshipTier;

  @Prop({ type: Date, required: true })
  startDate: Date;

  /** `null` is an open-ended sponsorship (owner decision, ADR-0077 D2 #1). */
  @Prop({ type: Date, default: null })
  endDate: Date | null;

  @Prop({ type: String, enum: SPONSORSHIP_STATUSES, default: 'Active' })
  status: SponsorshipStatus;

  /** Kept per the specification; the banner draws no photograph (ADR-0085
   *  D3 #10), so nothing reads it yet. */
  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  bannerAssetId: Types.ObjectId | null;

  @Prop({ type: LocalizedTextSchema, default: null })
  promotionalText: LocalizedText | null;

  @Prop({ type: LocalizedTextSchema, default: null })
  scopeLabel: LocalizedText | null;

  /** The VIP mark, independent of `tier`; several may carry it. */
  @Prop({ type: Boolean, default: false })
  isFeatured: boolean;

  @Prop({ type: Number, default: 0 })
  displayOrder: number;

  /** Whether the site shows it — separate from `status`, which describes the
   *  contract. New records are hidden (ADR-0084's pattern). */
  @Prop({ type: Boolean, default: false })
  isVisible: boolean;

  /** Seed-only (ADR-0085 D2.1). */
  @Prop({ type: Boolean, default: false })
  isDemo: boolean;
}

export const SponsorshipSchema = SchemaFactory.createForClass(Sponsorship);
SponsorshipSchema.index({ targetType: 1, targetId: 1, status: 1 });
SponsorshipSchema.index({ tier: 1 });
