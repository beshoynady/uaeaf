import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { OrganizationName, OrganizationNameSchema } from '../../../../common/schemas/organization-name.schema.js';

export type PartnershipDocument = HydratedDocument<Partnership>;

export const PARTNERSHIP_TYPES = ['BilateralAgreement', 'MOU', 'TechnicalCooperation', 'Other'] as const;
export type PartnershipType = (typeof PARTNERSHIP_TYPES)[number];

/** Implements: partnerships collection, Domain 9 — an organisation with a
 *  cooperation agreement or a memorandum with the federation (ADR-0077 D3,
 *  ADR-0085 D1). Commercial sponsorship is `sponsorships`; governance
 *  affiliation is `memberships`; the three are never merged (ADR-0037). */
@Schema({ collection: 'partnerships', timestamps: true })
export class Partnership extends BaseSchema {
  @Prop({ type: OrganizationNameSchema, required: true })
  partnerName: OrganizationName;

  /** Optional: a partner without a logo shows its name in the logo's place. */
  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  partnerLogoId: Types.ObjectId | null;

  @Prop({ type: String, enum: PARTNERSHIP_TYPES, required: true })
  partnershipType: PartnershipType;

  @Prop({ type: Date, required: true })
  startDate: Date;

  /** `null` = ongoing. */
  @Prop({ type: Date, default: null })
  endDate: Date | null;

  /** The relationship's own state — not whether the site shows it. */
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Number, default: 0 })
  displayOrder: number;

  /** Whether the site shows it. New records are hidden (ADR-0084's pattern). */
  @Prop({ type: Boolean, default: false })
  isVisible: boolean;

  /** Seed-only (ADR-0085 D2.1). */
  @Prop({ type: Boolean, default: false })
  isDemo: boolean;
}

export const PartnershipSchema = SchemaFactory.createForClass(Partnership);
PartnershipSchema.index({ partnershipType: 1 });
