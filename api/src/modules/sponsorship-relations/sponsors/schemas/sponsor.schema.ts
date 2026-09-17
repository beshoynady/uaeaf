import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import { OrganizationName, OrganizationNameSchema } from '../../../../common/schemas/organization-name.schema.js';

export type SponsorDocument = HydratedDocument<Sponsor>;

/** The `restricted` embed on `sponsors` — contract terms and the sponsor's
 *  contact (`07-Mongoose-Schema-Specification.md` Domain 9, `[SCHEMA-READY
 *  GAP FILLED]`). A protected area: it is stored, it reaches the RBAC-gated
 *  read, and it never reaches a public response (ADR-0077 D1). */
@Schema({ _id: false })
export class SponsorRestricted {
  @Prop({ type: String, default: null, lowercase: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })
  contactEmail: string | null;

  @Prop({ type: String, default: null, match: /^\+?[0-9\s-]{7,20}$/ })
  contactPhone: string | null;

  @Prop({ type: Number, default: null })
  contractValue: number | null;

  @Prop({ type: Types.ObjectId, ref: 'Document', default: null })
  contractDocId: Types.ObjectId | null;
}

export const SponsorRestrictedSchema = SchemaFactory.createForClass(SponsorRestricted);

/** Implements: sponsors collection, Domain 9 — Sponsorship / Institutional
 *  Relationships (`07-Mongoose-Schema-Specification.md`), as ADR-0077 D1 and
 *  ADR-0085 D1 amend it.
 *
 *  The sponsor is the organisation and is permanent; the contract, with its
 *  window and tier, is a `sponsorships` row, so a sponsor whose contract
 *  lapses and later resumes keeps one record.
 *
 *  Not workflow-governed: none of Domain 9 is in the workflow lists; accuracy
 *  is managed by direct edit.
 *
 *  `logoId` is required, as the specification and ADR-0077 D1 keep it. The
 *  strip's "name in the logo's place" (ADR-0077 D5 #8) covers a logo whose
 *  asset was archived after the sponsor was written, at render time. */
@Schema({ collection: 'sponsors', timestamps: true })
export class Sponsor extends BaseSchema {
  @Prop({ type: OrganizationNameSchema, required: true })
  name: OrganizationName;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', required: true })
  logoId: Types.ObjectId;

  @Prop({ type: String, default: null, match: /^https?:\/\/.+/ })
  website: string | null;

  /** The sector line the card prints under the name (`جهة حكومية`). */
  @Prop({ type: LocalizedTextSchema, default: null })
  categoryLabel: LocalizedText | null;

  @Prop({ type: SponsorRestrictedSchema, default: () => ({}) })
  restricted: SponsorRestricted;

  /** Seed-only (ADR-0085 D2.1): a fictional record, hidden from every public
   *  read in production. No request can set it. */
  @Prop({ type: Boolean, default: false })
  isDemo: boolean;
}

export const SponsorSchema = SchemaFactory.createForClass(Sponsor);
