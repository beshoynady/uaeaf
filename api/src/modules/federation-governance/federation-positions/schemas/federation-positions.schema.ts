import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';

export type FederationPositionDocument = HydratedDocument<FederationPosition>;

export const POSITION_BODIES = ['board', 'committee'] as const;
export type PositionBody = (typeof POSITION_BODIES)[number];

/** An admin-defined post. Job titles, their level in the organisational
 *  chart and their order within a level are data, not code, so no role is
 *  named anywhere in the application. */
@Schema({ collection: 'federationPositions', timestamps: true })
export class FederationPosition extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: String, enum: POSITION_BODIES, required: true })
  body: PositionBody;

  /** Level in the chart, 1 being the highest. Positions sharing a rank
   *  render on one row. */
  @Prop({ type: Number, required: true })
  rank: number;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  /** How many people may hold the post at once in one cycle. Null is
   *  unlimited. */
  @Prop({ type: Number, default: null })
  maxHolders: number | null;

  @Prop({ type: Boolean, default: true })
  isVisible: boolean;
}

export const FederationPositionSchema = SchemaFactory.createForClass(FederationPosition);
