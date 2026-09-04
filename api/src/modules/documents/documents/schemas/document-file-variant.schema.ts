import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/** One language's file within `documents.file`. Not a standalone
 *  collection: `_id: false`. */
@Schema({ _id: false })
export class DocumentFileVariant {
  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ type: Number, required: true })
  size: number;

  @Prop({ required: true })
  filename: string;
}

export const DocumentFileVariantSchema = SchemaFactory.createForClass(DocumentFileVariant);
