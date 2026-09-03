import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { DocumentFileVariant, DocumentFileVariantSchema } from './document-file-variant.schema.js';

/** The `file` embed on `documents` — bilingual, one `Document` row
 *  represents one logical document across both languages, per the live
 *  FigJam board. Not a standalone collection: `_id: false`. */
@Schema({ _id: false })
export class DocumentFile {
  @Prop({ type: DocumentFileVariantSchema, required: true })
  en: DocumentFileVariant;

  @Prop({ type: DocumentFileVariantSchema, required: true })
  ar: DocumentFileVariant;
}

export const DocumentFileSchema = SchemaFactory.createForClass(DocumentFile);
