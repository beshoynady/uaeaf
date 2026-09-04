import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';

export type AgeCategoryDocument = HydratedDocument<AgeCategory>;

/** Implements: ageCategories collection, Domain 3 (partial — reference
 *  data only; FigJam node `81:6454`, re-read fresh 2026-09-03). Used by
 *  `clubTeams.ageCategoryId` and `athleteNationalTeamHistory.ageCategoryId`
 *  to identify a national-team tier (Youth, Junior, Senior, ...). */
@Schema({ collection: 'ageCategories' })
export class AgeCategory extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  name: LocalizedText;

  @Prop({ type: Number, required: true })
  minAge: number;

  @Prop({ type: Number, required: true })
  maxAge: number;
}

export const AgeCategorySchema = SchemaFactory.createForClass(AgeCategory);
