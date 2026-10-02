import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

/** The board decision that formed the committee. Embedded only, not a
 *  standalone collection: `_id: false`. */
@Schema({ _id: false })
export class FormationDecision {
  @Prop({ type: String, required: true })
  number: string;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Document', default: null })
  documentId: Types.ObjectId | null;
}

export const FormationDecisionSchema = SchemaFactory.createForClass(FormationDecision);
