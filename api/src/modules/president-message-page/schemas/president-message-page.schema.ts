import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { HeroPageSchema } from '../../../common/schemas/hero-page.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../common/schemas/localized-text.schema.js';
import { ContentBlock, ContentBlockSchema } from '../../../common/schemas/content-block.schema.js';
import { PUBLICATION_STATES } from '../../../common/constants/publication-states.js';
import type { PublicationState } from '../../../common/constants/publication-states.js';

export type PresidentMessagePageDocument = HydratedDocument<PresidentMessagePage>;

/** Implements: presidentMessagePage collection, Domain 1 — Federation &
 *  Governance (live FigJam Physical Model, re-read fresh 2026-09-03).
 *
 *  Workflow-governed (List A + List B): public reads go through
 *  `publications → revisions.snapshotData`.
 *
 *  Confirmed decision #4 — canonical identity comes from
 *  `federationAppointmentId → federationAppointments → federationPersonnel`.
 *  `signatoryName`/`signatoryTitle` are DENORMALIZED DISPLAY SNAPSHOTS
 *  only: never treat them as the source of truth, and never resolve the
 *  signatory by reading them. The board's rationale: if the president
 *  changes, this historical message stays correctly attributed to their
 *  exact term rather than to a free-text name. */
@Schema({ collection: 'presidentMessagePage' })
export class PresidentMessagePage extends HeroPageSchema {
  /** Canonical link to the specific presidential appointment/term. */
  @Prop({ type: Types.ObjectId, ref: 'FederationAppointment', required: true })
  federationAppointmentId: Types.ObjectId;

  @Prop({ type: [ContentBlockSchema], default: [] })
  goals: ContentBlock[];

  /** Structured rich text per the Domain 4 Rich Text Content Standard —
   *  stored as bilingual text here; that standard is a Domain 4 concern
   *  not built this week. */
  @Prop({ type: LocalizedTextSchema, required: true })
  messageBody: LocalizedText;

  /** Denormalized display snapshot — see decision #4 above. */
  @Prop({ type: LocalizedTextSchema, required: true })
  signatoryName: LocalizedText;

  /** Denormalized display snapshot, e.g. "رئيس الاتحاد". */
  @Prop({ type: LocalizedTextSchema, required: true })
  signatoryTitle: LocalizedText;

  /** Denormalized ← `publications` (ADR-0020). */
  @Prop({ type: String, enum: PUBLICATION_STATES, required: true })
  publicationState: PublicationState;
}

export const PresidentMessagePageSchema = SchemaFactory.createForClass(PresidentMessagePage);
