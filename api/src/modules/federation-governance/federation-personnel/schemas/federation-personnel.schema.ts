import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import { SocialLink, SocialLinkSchema } from '../../../../common/schemas/social-link.schema.js';
import {
  PersonnelPublicContact,
  PersonnelPublicContactSchema,
  PersonnelInternalContact,
  PersonnelInternalContactSchema,
} from './personnel-contact.schema.js';

export type FederationPersonnelDocument = HydratedDocument<FederationPersonnel>;

export const FEDERATION_PERSONNEL_STATUSES = ['Active', 'Inactive'] as const;
export type FederationPersonnelStatus = (typeof FEDERATION_PERSONNEL_STATUSES)[number];

/** Implements: federationPersonnel collection, Domain 1 — Federation &
 *  Governance (live FigJam Physical Model, re-read fresh 2026-09-03).
 *
 *  The person record itself; which post they hold and when is modelled
 *  separately in `federationAppointments` (a person may hold several
 *  appointments over time). `nationalityId` refs `countries`, matching the
 *  2026-09-02 correction applied to `coaches.nationalityId` in Week 3.
 *
 *  `internalContact` is `[RESTRICTED]` — never serialise it into a public
 *  response; use `FederationPersonnelPublicResponseDto`.
 *
 *  Not workflow-governed: no `publicationState`, absent from both Domain 7
 *  closed lists. `status` here is the person's own Active/Inactive
 *  relationship to the federation, unrelated to publication. */
@Schema({ collection: 'federationPersonnel' })
export class FederationPersonnel extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  fullName: LocalizedText;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  photoId: Types.ObjectId | null;

  @Prop({ type: LocalizedTextSchema, default: null })
  shortBio: LocalizedText | null;

  /** Structured rich text per the Domain 4 Rich Text Content Standard —
   *  stored as bilingual text here; the standard itself is a Domain 4
   *  concern not built this week. */
  @Prop({ type: LocalizedTextSchema, default: null })
  biography: LocalizedText | null;

  @Prop({ type: Types.ObjectId, ref: 'Country', required: true })
  nationalityId: Types.ObjectId;

  @Prop({ type: PersonnelPublicContactSchema, default: null })
  publicContact: PersonnelPublicContact | null;

  @Prop({ type: PersonnelInternalContactSchema, default: null })
  internalContact: PersonnelInternalContact | null;

  @Prop({ type: String, enum: FEDERATION_PERSONNEL_STATUSES, required: true })
  status: FederationPersonnelStatus;

  @Prop({ type: [SocialLinkSchema], default: [] })
  socialLinks: SocialLink[];
}

export const FederationPersonnelSchema = SchemaFactory.createForClass(FederationPersonnel);
