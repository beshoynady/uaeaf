import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';

/**
 * A bilingual rich-text field: one ProseMirror/TipTap document per
 * language, stored as JSON rather than as an HTML string (ADR-0069 D1).
 *
 * Typed `Mixed` because the value is a document tree whose shape is
 * governed by `common/rich-text/rich-text-allowlist.ts`, not by Mongoose.
 * Mongoose would only be able to say "it is an object"; the allowlist says
 * which nodes, marks and attributes it may contain, per language, and is
 * enforced at the DTO layer on every write — including one that reaches the
 * API without passing through the dashboard.
 *
 * Not a standalone collection: `_id: false`.
 */
@Schema({ _id: false })
export class LocalizedRichText {
  @Prop({ type: SchemaTypes.Mixed, required: true })
  en: Record<string, unknown>;

  @Prop({ type: SchemaTypes.Mixed, required: true })
  ar: Record<string, unknown>;
}

export const LocalizedRichTextSchema = SchemaFactory.createForClass(LocalizedRichText);
