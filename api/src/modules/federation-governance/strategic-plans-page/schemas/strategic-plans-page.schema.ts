import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { HeroPageSchema } from '../../../../common/schemas/hero-page.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import { PageSeo, PageSeoSchema } from '../../../../common/schemas/page-seo.schema.js';
import { PUBLICATION_STATES } from '../../../../common/constants/publication-states.js';
import type { PublicationState } from '../../../../common/constants/publication-states.js';
import {
  PlanListItem,
  PlanListItemSchema,
  PlanMetric,
  PlanMetricSchema,
  PlanPhase,
  PlanPhaseSchema,
  PlanStep,
  PlanStepSchema,
} from './plan-list-items.schema.js';

export type StrategicPlansPageDocument = HydratedDocument<StrategicPlansPage>;

/** Implements: strategicPlansPage collection, Domain 1 — Federation &
 *  Governance, as the approved page composition (Figma `720:624`) prints it:
 *  hero, overview, phases, pillars, objectives, metrics, execution chain and
 *  the closing call.
 *
 *  Workflow-governed (List A + List B): public reads go through
 *  `publications → revisions.snapshotData`, and the public projection is an
 *  explicit field list, never this row (as ADR-0069 D3).
 *
 *  The five lists are bounded and edited and published together with the
 *  page as ONE editorial unit — they have no revision/publication lifecycle
 *  of their own, which is why they are embedded rather than modelled as
 *  their own collections. Each item keeps an `_id` so the dashboard can
 *  reorder and hide items without renaming them.
 *
 *  There is no plan period and no attached document: the composition prints
 *  neither, and the owner removed the documents section (2026-09-15). The
 *  horizon year lives in a metric card ("2030") like every other figure.
 *
 *  Section order and section visibility are deliberately not stored: the
 *  page rules guard the composition, and an editor cannot be asked to keep
 *  them.
 *
 *  Deliberately NOT singleton-enforced despite the `*Page` name: this is
 *  workflow-governed editorial content rather than a hero wrapper, and the
 *  board states no singleton constraint — see `SingletonPageService`. */
@Schema({ collection: 'strategicPlansPage', timestamps: true })
export class StrategicPlansPage extends HeroPageSchema {
  @Prop({ type: Types.ObjectId, ref: 'Federation', required: true })
  federationId: Types.ObjectId;

  /** e.g. "خارطة طريق نحو المستقبل". */
  @Prop({ type: LocalizedTextSchema, required: true })
  introHeading: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  introText: LocalizedText;

  /** The photographs the sections print, content edited with the page as
   *  the hero's is: every picture the page prints has a field (owner rule
   *  2026-09-14). */
  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  introImageId: Types.ObjectId | null; // beside the overview

  /** The composition prints the phases with no heading; the field exists so
   *  an editor may add one. */
  @Prop({ type: LocalizedTextSchema, default: null })
  phasesTitle: LocalizedText | null;

  @Prop({ type: [PlanPhaseSchema], default: [] })
  phases: PlanPhase[];

  @Prop({ type: LocalizedTextSchema, required: true })
  pillarsTitle: LocalizedText;

  @Prop({ type: LocalizedTextSchema, default: null })
  pillarsText: LocalizedText | null;

  @Prop({ type: [PlanListItemSchema], default: [] })
  pillars: PlanListItem[];

  @Prop({ type: LocalizedTextSchema, required: true })
  objectivesTitle: LocalizedText;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  objectivesImageId: Types.ObjectId | null; // beside the objectives

  @Prop({ type: [PlanListItemSchema], default: [] })
  objectives: PlanListItem[];

  @Prop({ type: LocalizedTextSchema, required: true })
  metricsTitle: LocalizedText;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  metricsImageId: Types.ObjectId | null; // behind the metrics band

  @Prop({ type: [PlanMetricSchema], default: [] })
  metrics: PlanMetric[];

  @Prop({ type: LocalizedTextSchema, required: true })
  executionTitle: LocalizedText;

  @Prop({ type: LocalizedTextSchema, default: null })
  executionText: LocalizedText | null;

  @Prop({ type: [PlanStepSchema], default: [] })
  executionSteps: PlanStep[];

  @Prop({ type: LocalizedTextSchema, required: true })
  ctaTitle: LocalizedText;

  @Prop({ type: LocalizedTextSchema, default: null })
  ctaText: LocalizedText | null;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  ctaImageId: Types.ObjectId | null; // behind the closing call

  /** Shared with `pages` and the other governance pages (Chapter 14 §3). */
  @Prop({ type: PageSeoSchema, default: null })
  seo: PageSeo | null;

  /** Denormalized pointer to the revision this row's content came from —
   *  present on this collection and `visionMissionPage` on the board. */
  @Prop({ type: Types.ObjectId, ref: 'Revision', default: null })
  revisionId: Types.ObjectId | null;

  /** Denormalized ← `publications` (ADR-0020). */
  @Prop({ type: String, enum: PUBLICATION_STATES, required: true })
  publicationState: PublicationState;
}

export const StrategicPlansPageSchema = SchemaFactory.createForClass(StrategicPlansPage);
