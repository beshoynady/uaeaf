import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { HeroPageSchema } from '../../../../common/schemas/hero-page.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import { PUBLICATION_STATES } from '../../../../common/constants/publication-states.js';
import type { PublicationState } from '../../../../common/constants/publication-states.js';

export type AboutFederationPageDocument = HydratedDocument<AboutFederationPage>;

/** `{ text, year }` milestone. Bounded at 10 entries per the board's own
 *  `[SCHEMA-READY GAP FILLED]` note — enforced in
 *  `AboutFederationPagesService`. */
@Schema({ _id: false })
export class Achievement {
  @Prop({ type: LocalizedTextSchema, required: true })
  text: LocalizedText;

  @Prop({ type: Number, required: true })
  year: number;
}

export const AchievementSchema = SchemaFactory.createForClass(Achievement);

/** Max `achievements[]` entries — quoted from the board's gap-fill note,
 *  not an invented cap. */
export const ABOUT_FEDERATION_MAX_ACHIEVEMENTS = 10;

/** Implements: aboutFederationPage collection, Domain 1 — Federation &
 *  Governance (live FigJam Physical Model, re-read fresh 2026-09-03).
 *
 *  Workflow-governed (List A + List B): public reads go through
 *  `publications → revisions.snapshotData`.
 *
 *  The `firstPresident*` fields are editorial content, deliberately NOT
 *  derived from `federationAppointments` — the board is explicit that the
 *  admin wants manual control here. Do not "normalise" them later.
 *
 *  `heroSubtitle` is plain bilingual text, NOT rich text, consistent with
 *  the `heroSubtitle` pattern across the other page models. */
@Schema({ collection: 'aboutFederationPage' })
export class AboutFederationPage extends HeroPageSchema {
  @Prop({ type: Date, required: true })
  foundingDate: Date;

  /** Paragraph shown under the founding year number. */
  @Prop({ type: LocalizedTextSchema, required: true })
  historicalIntro: LocalizedText;

  /** e.g. "April 1974 - Founding Decree". */
  @Prop({ type: LocalizedTextSchema, required: true })
  foundingDecreeCaption: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  roleHeading: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  roleText: LocalizedText;

  /** e.g. 1976 — year of international/Olympic membership. */
  @Prop({ type: Number, required: true })
  globalMembershipYear: number;

  @Prop({ type: LocalizedTextSchema, required: true })
  globalMembershipHeading: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  globalMembershipText: LocalizedText;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  firstPresidentPhoto: Types.ObjectId | null;

  @Prop({ type: LocalizedTextSchema, required: true })
  firstPresidentName: LocalizedText;

  /** e.g. "First President of the Federation". */
  @Prop({ type: LocalizedTextSchema, required: true })
  firstPresidentTitle: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  firstPresidentBio: LocalizedText;

  @Prop({ type: [AchievementSchema], default: [] })
  achievements: Achievement[];

  /** Denormalized ← `publications` (ADR-0020). */
  @Prop({ type: String, enum: PUBLICATION_STATES, required: true })
  publicationState: PublicationState;
}

export const AboutFederationPageSchema = SchemaFactory.createForClass(AboutFederationPage);
