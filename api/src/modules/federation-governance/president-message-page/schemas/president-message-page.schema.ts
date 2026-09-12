import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { HeroPageSchema } from '../../../../common/schemas/hero-page.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import {
  LocalizedRichText,
  LocalizedRichTextSchema,
} from '../../../../common/schemas/localized-rich-text.schema.js';
import {
  IconKeyedContentBlock,
  IconKeyedContentBlockSchema,
} from '../../../../common/schemas/content-block.schema.js';
import { PageSeo, PageSeoSchema } from '../../../../common/schemas/page-seo.schema.js';
import { PUBLICATION_STATES } from '../../../../common/constants/publication-states.js';
import type { PublicationState } from '../../../../common/constants/publication-states.js';

export type PresidentMessagePageDocument = HydratedDocument<PresidentMessagePage>;

/** Implements: presidentMessagePage collection, Domain 1 — Federation &
 *  Governance (live FigJam Physical Model, re-read fresh 2026-09-03).
 *
 *  Workflow-governed (List A + List B): public reads go through
 *  `publications → revisions.snapshotData`, and the public projection is an
 *  explicit field list, never this row (ADR-0069 D3).
 *
 *  Confirmed decision #4 — canonical identity comes from
 *  `federationAppointmentId → federationAppointments → federationPersonnel`.
 *  `signatoryName`/`signatoryTitle` are DENORMALIZED DISPLAY SNAPSHOTS
 *  only: never treat them as the source of truth, and never resolve the
 *  signatory by reading them. The board's rationale: if the president
 *  changes, this historical message stays correctly attributed to their
 *  exact term rather than to a free-text name.
 *
 *  The message carries no date field. Its date is the date it was published,
 *  read from the Live publication's `publishedAt` (ADR-0069 D2) — two stored
 *  dates could disagree, and the published one is the true one. */
@Schema({ collection: 'presidentMessagePage', timestamps: true })
export class PresidentMessagePage extends HeroPageSchema {
  /** Canonical link to the specific presidential appointment/term. */
  @Prop({ type: Types.ObjectId, ref: 'FederationAppointment', required: true })
  federationAppointmentId: Types.ObjectId;

  /** The president's portrait, distinct from `heroImageId`'s background
   *  (ADR-0044's `featured_image` role). Alt text belongs to the asset, in
   *  `mediaAssets.altText`, and is deliberately not duplicated here. */
  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  featuredImageId: Types.ObjectId | null;

  /** The pulled quote. A distinct editorial element rendered at every
   *  breakpoint, not the body's first sentence repeated. */
  @Prop({ type: LocalizedTextSchema, default: null })
  pullQuote: LocalizedText | null;

  /** Structured rich text, one ProseMirror document per language, checked
   *  against the per-language allowlist on every write (ADR-0069 D1). */
  @Prop({ type: LocalizedRichTextSchema, required: true })
  messageBody: LocalizedRichText;

  @Prop({ type: LocalizedTextSchema, default: null })
  valuesTitle: LocalizedText | null;

  /** This message's values — deliberately its own list, not a pointer at
   *  `visionMissionPage.coreValues` (ADR-0069 D2). An archived message keeps
   *  the values of its own term; editing the federation's current values
   *  must not rewrite a past president's statement. */
  @Prop({ type: [IconKeyedContentBlockSchema], default: [] })
  values: IconKeyedContentBlock[];

  /** Denormalized display snapshot — see decision #4 above. */
  @Prop({ type: LocalizedTextSchema, required: true })
  signatoryName: LocalizedText;

  /** Denormalized display snapshot, e.g. "رئيس الاتحاد". */
  @Prop({ type: LocalizedTextSchema, required: true })
  signatoryTitle: LocalizedText;

  /** Shared with `pages` (Chapter 14 §3 requires a share image). */
  @Prop({ type: PageSeoSchema, default: null })
  seo: PageSeo | null;

  /** Denormalized ← `publications` (ADR-0020). */
  @Prop({ type: String, enum: PUBLICATION_STATES, required: true })
  publicationState: PublicationState;
}

export const PresidentMessagePageSchema = SchemaFactory.createForClass(PresidentMessagePage);
