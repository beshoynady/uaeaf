import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/** Bilingual display text — every field typed `{en,ar}` on the live FigJam
 *  Physical Model board (file `2ZC01ZbUx3rL7czDXWi34c`, node `77:5543`,
 *  re-read fresh 2026-09-03) uses this shared shape, so every such field in
 *  this codebase embeds it rather than hand-rolling an inline `{en,ar}`
 *  object per schema. Not a standalone collection: `_id: false`. */
@Schema({ _id: false })
export class LocalizedText {
  @Prop({ required: true })
  en: string;

  @Prop({ required: true })
  ar: string;
}

export const LocalizedTextSchema = SchemaFactory.createForClass(LocalizedText);
