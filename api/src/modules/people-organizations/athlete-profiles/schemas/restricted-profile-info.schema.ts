import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/** The `restricted` embed on `athleteProfiles` — `[SENSITIVE-MINOR]`
 *  `[SCHEMA-READY GAP FILLED]` shape per the live FigJam board, governed by
 *  ADR-0028 / Federal Law 26/2025. Not a standalone collection:
 *  `_id: false`. */
@Schema({ _id: false })
export class RestrictedProfileInfo {
  @Prop({ type: String, default: null })
  emiratesIdOrPassport: string | null;

  @Prop({ type: String, default: null })
  address: string | null;

  @Prop({ type: String, default: null })
  phone: string | null;

  @Prop({ type: String, default: null })
  email: string | null;
}

export const RestrictedProfileInfoSchema = SchemaFactory.createForClass(RestrictedProfileInfo);
