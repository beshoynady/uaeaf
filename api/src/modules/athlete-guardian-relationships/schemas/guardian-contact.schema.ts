import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/** The `guardianContact` embed on `athleteGuardianRelationships` —
 *  `[RESTRICTED]` `[SCHEMA-READY GAP FILLED]` shape per the live FigJam
 *  board. Not a standalone collection: `_id: false`. */
@Schema({ _id: false })
export class GuardianContact {
  @Prop({ type: String, default: null })
  phone: string | null;

  @Prop({ type: String, default: null })
  email: string | null;

  @Prop({ type: String, default: null })
  address: string | null;
}

export const GuardianContactSchema = SchemaFactory.createForClass(GuardianContact);
