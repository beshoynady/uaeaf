import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../common/schemas/localized-text.schema.js';

export type CountryDocument = HydratedDocument<Country>;

export const COUNTRY_TYPES = ['Country', 'Emirate'] as const;
export type CountryType = (typeof COUNTRY_TYPES)[number];

/** Implements: countries collection, Domain 2 — People & Organizations
 *  (FigJam node `80:6398`, re-read fresh 2026-09-03). Holds both sovereign
 *  countries (for athlete/coach/official nationality) and the UAE's own
 *  emirates (for club/venue location), distinguished by `type`. */
@Schema({ collection: 'countries' })
export class Country extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  name: LocalizedText;

  @Prop({ type: String, enum: COUNTRY_TYPES, required: true })
  type: CountryType;
}

export const CountrySchema = SchemaFactory.createForClass(Country);
