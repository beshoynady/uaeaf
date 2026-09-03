import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema.js';

export type AthleteNationalTeamHistoryDocument = HydratedDocument<AthleteNationalTeamHistory>;

/** Implements: athleteNationalTeamHistory collection, Domain 2 — People &
 *  Organizations (FigJam node `559:8224`, re-read fresh 2026-09-03).
 *  `endDate: null` means the athlete is currently on this national-team
 *  roster — see `AthleteNationalTeamHistoryService.isCurrentlyOnNationalTeam()`.
 *  Confirmed decision #2: `athletes` has no `isNationalTeam` field; status
 *  is always derived by querying this collection. */
@Schema({ collection: 'athleteNationalTeamHistory' })
export class AthleteNationalTeamHistory extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Athlete', required: true })
  athleteId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AgeCategory', required: true })
  ageCategoryId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, default: null })
  endDate: Date | null;
}

export const AthleteNationalTeamHistorySchema = SchemaFactory.createForClass(AthleteNationalTeamHistory);
