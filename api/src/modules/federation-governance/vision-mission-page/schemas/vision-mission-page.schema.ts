import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { HeroPageSchema } from '../../../../common/schemas/hero-page.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import {
  ContentBlock,
  ContentBlockSchema,
  IconKeyedContentBlock,
  IconKeyedContentBlockSchema,
} from '../../../../common/schemas/content-block.schema.js';
import { PageSeo, PageSeoSchema } from '../../../../common/schemas/page-seo.schema.js';
import { PUBLICATION_STATES } from '../../../../common/constants/publication-states.js';
import type { PublicationState } from '../../../../common/constants/publication-states.js';

export type VisionMissionPageDocument = HydratedDocument<VisionMissionPage>;

/** Implements: visionMissionPage collection, Domain 1 — Federation &
 *  Governance (live FigJam Physical Model, re-read fresh 2026-09-03).
 *
 *  Workflow-governed (List A + List B): public reads go through
 *  `publications → revisions.snapshotData`, and the public projection is an
 *  explicit field list, never this row (ADR-0070, as ADR-0069 D3).
 *
 *  `strategicGoals` and `coreValues` are bounded embedded lists (~6 items
 *  each) edited and published together with vision/mission as ONE
 *  editorial unit — they have no independent revision/publication
 *  lifecycle, which is why they are embedded rather than modelled as their
 *  own collections.
 *
 *  `coreValues` are the federation's values. The President's Message keeps
 *  its own list rather than pointing here (ADR-0069 D2), so editing these
 *  never rewrites a past president's statement.
 *
 *  Deliberately NOT singleton-enforced despite the `*Page` name: this is
 *  workflow-governed editorial content rather than a hero wrapper, and the
 *  board states no singleton constraint — see `SingletonPageService`. */
@Schema({ collection: 'visionMissionPage', timestamps: true })
export class VisionMissionPage extends HeroPageSchema {
  @Prop({ type: Types.ObjectId, ref: 'Federation', required: true })
  federationId: Types.ObjectId;

  /** The photographs behind the sections, content edited with the page as
   *  the hero's is: every picture the page prints has a field (owner rule
   *  2026-09-14, ADR-0070 D1). */
  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  visionImageId: Types.ObjectId | null; // behind the vision statement

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  missionImageId: Types.ObjectId | null; // behind the mission statement

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  valuesImageId: Types.ObjectId | null; // behind the values band

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  ctaImageId: Types.ObjectId | null; // behind the call to the strategic plan

  /** The vision in one line, printed above `visionText` (Figma `1172:2271`). */
  @Prop({ type: LocalizedTextSchema, default: null })
  visionTitle: LocalizedText | null;

  @Prop({ type: LocalizedTextSchema, required: true })
  visionText: LocalizedText;

  /** The mission in one line, printed above `missionText` (Figma `1172:2298`). */
  @Prop({ type: LocalizedTextSchema, default: null })
  missionTitle: LocalizedText | null;

  @Prop({ type: LocalizedTextSchema, required: true })
  missionText: LocalizedText;

  /** The sentence that heads the goals (Figma `1499:2264`). */
  @Prop({ type: LocalizedTextSchema, default: null })
  goalsTitle: LocalizedText | null;

  @Prop({ type: [ContentBlockSchema], default: [] })
  strategicGoals: ContentBlock[];

  /** `iconKey` closed to the twelve keys, as the message's values are
   *  (ADR-0070, ADR-0069 D2). Retyped with no stored row to migrate. */
  @Prop({ type: [IconKeyedContentBlockSchema], default: [] })
  coreValues: IconKeyedContentBlock[];

  /** Shared with `pages` and the President's Message (Chapter 14 §3). */
  @Prop({ type: PageSeoSchema, default: null })
  seo: PageSeo | null;

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
