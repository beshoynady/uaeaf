import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';

export type VenueDocument = HydratedDocument<Venue>;

/** Implements: venues collection, Domain 2 — People & Organizations
 *  (FigJam node `80:6372`, re-read fresh 2026-09-03). `ownerClubId` is null
 *  for neutral/national venues (e.g. Zayed Sports City) and set when the
 *  venue is a specific club's home facility. `latitude`/`longitude` added
 *  to the live board 2026-09-03, mirroring the existing `clubs.latitude`/
 *  `longitude` pattern exactly. */
@Schema({ collection: 'venues' })
export class Venue extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  name: LocalizedText;

  @Prop({ type: Types.ObjectId, ref: 'Country', required: true })
  countryId: Types.ObjectId;
   
  @Prop({ type: Types.ObjectId, ref: 'Club', default: null })
  ownerClubId: Types.ObjectId | null;

  @Prop({ type: Number, default: null })
  latitude: number | null;

  @Prop({ type: Number, default: null })
  longitude: number | null;
}

export const VenueSchema = SchemaFactory.createForClass(Venue);
