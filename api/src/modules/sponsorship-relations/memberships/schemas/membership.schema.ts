import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { OrganizationName, OrganizationNameSchema } from '../../../../common/schemas/organization-name.schema.js';

export type MembershipDocument = HydratedDocument<Membership>;

export const MEMBERSHIP_TYPES = ['RegionalBody', 'ContinentalBody', 'InternationalBody', 'OlympicCommittee'] as const;
export type MembershipType = (typeof MEMBERSHIP_TYPES)[number];

export const MEMBERSHIP_STATUSES = ['Active', 'Suspended', 'Terminated'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

/** Implements: memberships collection, Domain 9 — a body the federation is
 *  a member of (ADR-0037, ADR-0077 D3, ADR-0085 D1). A credibility claim,
 *  never merged with sponsors. The organisation is captured inline
 *  (`organizationName`): the specification's "no Organization model" rule. */
@Schema({ collection: 'memberships', timestamps: true })
export class Membership extends BaseSchema {
  @Prop({ type: OrganizationNameSchema, required: true })
  organizationName: OrganizationName;

  /** Optional: a body without a logo shows its name in the logo's place. */
  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  organizationLogoId: Types.ObjectId | null;

  @Prop({ type: String, enum: MEMBERSHIP_TYPES, required: true })
  membershipType: MembershipType;

  @Prop({ type: Date, required: true })
  startDate: Date;

  /** `null` = ongoing. */
  @Prop({ type: Date, default: null })
  endDate: Date | null;

  /** The membership's own state — not whether the site shows it. */
  @Prop({ type: String, enum: MEMBERSHIP_STATUSES, default: 'Active' })
  status: MembershipStatus;

  @Prop({ type: Number, default: 0 })
  displayOrder: number;

  /** Whether the site shows it. New records are hidden (ADR-0084's pattern). */
  @Prop({ type: Boolean, default: false })
  isVisible: boolean;

  /** Seed-only (ADR-0085 D2.1). */
  @Prop({ type: Boolean, default: false })
  isDemo: boolean;
}

export const MembershipSchema = SchemaFactory.createForClass(Membership);
MembershipSchema.index({ membershipType: 1 });
