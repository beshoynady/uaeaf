import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../common/schemas/localized-text.schema.js';

export type ElectionCycleDocument = HydratedDocument<ElectionCycle>;

export const ELECTION_CYCLE_STATUSES = ['Planned', 'Active', 'Completed', 'Cancelled'] as const;
export type ElectionCycleStatus = (typeof ELECTION_CYCLE_STATUSES)[number];

/** Implements: electionCycles collection, Domain 1 — Federation &
 *  Governance (live FigJam Physical Model, re-read fresh 2026-09-03).
 *  A presidential/board election term; `federationAppointments` of
 *  roleType President and BoardMember reference the cycle that elected
 *  them. Not workflow-governed (no `publicationState`, absent from both
 *  Domain 7 closed lists). */
@Schema({ collection: 'electionCycles' })
export class ElectionCycle extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Federation', required: true })
  federationId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  /** Sequential cycle number (1, 2, 3...). */
  @Prop({ type: Number, required: true })
  cycleNumber: number;

  /** e.g. "الدورة 2024-2028". */
  @Prop({ type: LocalizedTextSchema, required: true })
  cycleName: LocalizedText;

  @Prop({ type: String, enum: ELECTION_CYCLE_STATUSES, required: true })
  status: ElectionCycleStatus;

  @Prop({ type: LocalizedTextSchema, default: null })
  notes: LocalizedText | null;
}

export const ElectionCycleSchema = SchemaFactory.createForClass(ElectionCycle);
