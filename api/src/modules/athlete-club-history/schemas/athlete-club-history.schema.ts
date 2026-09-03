import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema.js';

export type AthleteClubHistoryDocument = HydratedDocument<AthleteClubHistory>;

/** Implements: athleteClubHistory collection, Domain 2 — People &
 *  Organizations (FigJam node `80:6226`, re-read fresh 2026-09-03).
 *
 *  Confirmed `endDate` semantics (2026-09-02 correction): `endDate: null`
 *  means ONLY "this is the athlete's current club" — at most one such row
 *  may exist per athlete at any time. Every ended relationship (transfer,
 *  release, contract expiry) MUST carry an explicit `endDate`; there is no
 *  implicit "still current" exception for old rows. `AthleteClubHistoryService`
 *  enforces this by closing out the athlete's current row before opening a
 *  new one — see `create()`/`endCurrent()`. */
@Schema({ collection: 'athleteClubHistory' })
export class AthleteClubHistory extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Athlete', required: true })
  athleteId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Club', required: true })
  clubId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, default: null })
  endDate: Date | null;
}

export const AthleteClubHistorySchema = SchemaFactory.createForClass(AthleteClubHistory);
