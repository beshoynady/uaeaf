import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { HeroPageSchema } from '../../../../common/schemas/hero-page.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import {
  ContentBlock,
  ContentBlockSchema,
  IconedContentBlock,
  IconedContentBlockSchema,
} from '../../../../common/schemas/content-block.schema.js';
import { PUBLICATION_STATES } from '../../../../common/constants/publication-states.js';
import type { PublicationState } from '../../../../common/constants/publication-states.js';

export type StrategicPlansPageDocument = HydratedDocument<StrategicPlansPage>;

/** `{ value, label, displayOrder }` KPI card. Local to this collection —
 *  the only place the board uses this shape. `value` is a plain String
 *  (e.g. "2030", "+45%"), not a Number. */
@Schema({ _id: false })
export class ImpactMetric {
  @Prop({ type: String, required: true })
  value: string;

  @Prop({ type: LocalizedTextSchema, required: true })
  label: LocalizedText;

  @Prop({ type: Number, required: true })
  displayOrder: number;
}

export const ImpactMetricSchema = SchemaFactory.createForClass(ImpactMetric);

/** Implements: strategicPlansPage collection, Domain 1 — Federation &
 *  Governance (live FigJam Physical Model, re-read fresh 2026-09-03).
 *
 *  Workflow-governed (List A + List B): public reads go through
 *  `publications → revisions.snapshotData`.
 *
 *  `foundationPillars` (~4, icon-bearing) and `strategicAxes` (~6, no
 *  icon) are deliberately distinct tiers — the board explicitly confirms
 *  they are "not redundant". `objectives` carries no colour field: the
 *  accent colour is resolved client-side from `displayOrder` against a
 *  fixed palette, not stored.
 *
 *  `impactMetrics`: the board flags that one entry INTENTIONALLY duplicates
 *  `periodEnd`'s value (e.g. a "2030" horizon card), by deliberate client
 *  choice, to keep all four KPI cards in one uniform array — explicitly
 *  "do NOT 'fix' this duplication later". No de-duplication is applied.
 *
 *  `documentId` follows the same WORKFLOW COORDINATION RULE as
 *  `governanceDocuments.fileId` (confirmed decision #5): this wrapper is
 *  the sole workflow authority; the referenced `documents` row runs no
 *  approval cycle of its own here.
 *
 *  Deliberately NOT singleton-enforced: `periodStart`/`periodEnd`/
 *  `documentVersion` suggest successive plan periods may legitimately
 *  coexist, and the board states no singleton constraint — flagged rather
 *  than assumed either way. */
@Schema({ collection: 'strategicPlansPage' })
export class StrategicPlansPage extends HeroPageSchema {
  @Prop({ type: Types.ObjectId, ref: 'Federation', required: true })
  federationId: Types.ObjectId;

  /** e.g. "خارطة طريق نحو المستقبل". */
  @Prop({ type: LocalizedTextSchema, required: true })
  introHeading: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  introText: LocalizedText;

  @Prop({ type: Date, required: true })
  periodStart: Date;

  @Prop({ type: Date, required: true })
  periodEnd: Date;

  @Prop({ type: [IconedContentBlockSchema], default: [] })
  foundationPillars: IconedContentBlock[];

  @Prop({ type: [ContentBlockSchema], default: [] })
  strategicAxes: ContentBlock[];

  @Prop({ type: [ContentBlockSchema], default: [] })
  objectives: ContentBlock[];

  @Prop({ type: [ImpactMetricSchema], default: [] })
  impactMetrics: ImpactMetric[];

  @Prop({ type: Types.ObjectId, ref: 'Document', default: null })
  documentId: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  documentVersion: string | null;

  @Prop({ type: Types.ObjectId, ref: 'Revision', default: null })
  revisionId: Types.ObjectId | null;

  /** Denormalized ← `publications` (ADR-0020). */
  @Prop({ type: String, enum: PUBLICATION_STATES, required: true })
  publicationState: PublicationState;
}

export const StrategicPlansPageSchema = SchemaFactory.createForClass(StrategicPlansPage);
