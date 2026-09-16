import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import { PLAN_PHASE_ICON_KEYS } from '../../../../common/constants/plan-phase-icon-keys.js';
import type { PlanPhaseIconKey } from '../../../../common/constants/plan-phase-icon-keys.js';

/**
 * The list items of the strategic plan page, local to this module.
 *
 * Unlike the shared `ContentBlock` family these keep their `_id`: the
 * dashboard reorders and hides items one by one, and an item's id is what
 * survives a reorder — a position-keyed list would make "hide the third
 * pillar" mean something different after every drag. Each list is still
 * edited and published with the page as one editorial unit; the id is an
 * item's identity inside the page, not a lifecycle of its own.
 *
 * `isVisible` defaults to true so an item the editor never touched prints;
 * the public projection drops the ones set to false.
 */
@Schema()
export class PlanListItem {
  _id: Types.ObjectId;

  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  description: LocalizedText;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  @Prop({ type: Boolean, default: true })
  isVisible: boolean;
}

export const PlanListItemSchema = SchemaFactory.createForClass(PlanListItem);

/** A phase card: a list item drawn with one of the four plan glyphs. */
@Schema()
export class PlanPhase extends PlanListItem {
  @Prop({ type: String, enum: PLAN_PHASE_ICON_KEYS, required: true })
  iconKey: PlanPhaseIconKey;
}

export const PlanPhaseSchema = SchemaFactory.createForClass(PlanPhase);

/** A KPI card. `value` is free text ("2030", "15", "+30%"): the page parses
 *  the number out of it for the count-up and keeps the prefix and suffix. */
@Schema()
export class PlanMetric {
  _id: Types.ObjectId;

  @Prop({ type: String, required: true })
  value: string;

  @Prop({ type: LocalizedTextSchema, required: true })
  label: LocalizedText;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  @Prop({ type: Boolean, default: true })
  isVisible: boolean;
}

export const PlanMetricSchema = SchemaFactory.createForClass(PlanMetric);

/** One step of the execution chain. The approved composition prints the
 *  steps as titles alone, so the description is optional here. */
@Schema()
export class PlanStep {
  _id: Types.ObjectId;

  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: LocalizedTextSchema, default: null })
  description: LocalizedText | null;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  @Prop({ type: Boolean, default: true })
  isVisible: boolean;
}

export const PlanStepSchema = SchemaFactory.createForClass(PlanStep);
