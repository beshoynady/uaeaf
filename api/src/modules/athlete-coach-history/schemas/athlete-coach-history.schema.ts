import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema.js';

export type AthleteCoachHistoryDocument = HydratedDocument<AthleteCoachHistory>;

/** Implements: athleteCoachHistory collection, Domain 2 — People &
 *  Organizations (FigJam node `559:8223`, re-read fresh 2026-09-03).
 *  `endDate: null` means this is the athlete's CURRENT coach — see
 *  `AthleteCoachHistoryService.getCurrentCoach()`. There is deliberately no
 *  `coachId` field on `athletes` itself (confirmed decision #2): current
 *  coach is always derived by querying this collection, never denormalized. */
@Schema({ collection: 'athleteCoachHistory' })
export class AthleteCoachHistory extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Athlete', required: true })
  athleteId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Coach', required: true })
  coachId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Discipline', default: null })
  disciplineId: Types.ObjectId | null;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, default: null })
  endDate: Date | null;
}

export const AthleteCoachHistorySchema = SchemaFactory.createForClass(AthleteCoachHistory);
