import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';

/** One row of a committee's `duties[]`. Embedded only, ordered by `order`;
 *  not a standalone collection: `_id: false`. */
@Schema({ _id: false })
export class CommitteeDuty {
  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  desc: LocalizedText;

  @Prop({ type: Number, required: true })
  order: number;
}

export const CommitteeDutySchema = SchemaFactory.createForClass(CommitteeDuty);
