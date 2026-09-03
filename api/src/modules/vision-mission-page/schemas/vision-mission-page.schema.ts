import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { HeroPageSchema } from '../../../common/schemas/hero-page.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../common/schemas/localized-text.schema.js';
import {
  ContentBlock,
  ContentBlockSchema,
  IconedContentBlock,
  IconedContentBlockSchema,
} from '../../../common/schemas/content-block.schema.js';
import { PUBLICATION_STATES } from '../../../common/constants/publication-states.js';
import type { PublicationState } from '../../../common/constants/publication-states.js';

export type VisionMissionPageDocument = HydratedDocument<VisionMissionPage>;

/** Implements: visionMissionPage collection, Domain 1 — Federation &
 *  Governance (live FigJam Physical Model, re-read fresh 2026-09-03).
 *
 *  Workflow-governed (List A + List B): public reads go through
 *  `publications → revisions.snapshotData`, never this row.
 *
 *  `strategicGoals` and `coreValues` are bounded embedded lists (~6 items
 *  each) edited and published together with vision/mission as ONE
 *  editorial unit — they have no independent revision/publication
 *  lifecycle, which is why they are embedded rather than modelled as their
 *  own collections.
 *
 *  Deliberately NOT singleton-enforced despite the `*Page` name: this is
 *  workflow-governed editorial content rather than a hero wrapper, and the
 *  board states no singleton constraint — see `SingletonPageService`. */
@Schema({ collection: 'visionMissionPage' })
export class VisionMissionPage extends HeroPageSchema {
  @Prop({ type: Types.ObjectId, ref: 'Federation', required: true })
  federationId: Types.ObjectId;

  @Prop({ type: LocalizedTextSchema, required: true })
  visionText: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  missionText: LocalizedText;

  @Prop({ type: [ContentBlockSchema], default: [] })
  strategicGoals: ContentBlock[];

  @Prop({ type: [IconedContentBlockSchema], default: [] })
  coreValues: IconedContentBlock[];

  /** Denormalized pointer to the revision this row's content came from.
   *  Present on this collection and `strategicPlansPage` on the board, but
   *  not on the other workflow-governed Domain 1 pages — implemented per
   *  collection exactly as listed rather than normalised across them. */
  @Prop({ type: Types.ObjectId, ref: 'Revision', default: null })
  revisionId: Types.ObjectId | null;

  /** Denormalized ← `publications` (ADR-0020). */
  @Prop({ type: String, enum: PUBLICATION_STATES, required: true })
  publicationState: PublicationState;
}

export const VisionMissionPageSchema = SchemaFactory.createForClass(VisionMissionPage);
