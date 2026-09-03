import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema.js';

export type OfficialClubHistoryDocument = HydratedDocument<OfficialClubHistory>;

/** Implements: officialClubHistory collection, Domain 2 — People &
 *  Organizations (FigJam node `80:6302`, re-read fresh 2026-09-03). See
 *  `AthleteClubHistory`'s doc comment for the confirmed `endDate`
 *  semantics — the same "at most one current row per person, every ended
 *  row has an explicit endDate" rule applies here. */
@Schema({ collection: 'officialClubHistory' })
export class OfficialClubHistory extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Official', required: true })
  officialId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Club', required: true })
  clubId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, default: null })
  endDate: Date | null;
}

export const OfficialClubHistorySchema = SchemaFactory.createForClass(OfficialClubHistory);
