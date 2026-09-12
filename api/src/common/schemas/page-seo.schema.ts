import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { LocalizedText, LocalizedTextSchema } from './localized-text.schema.js';

/**
 * Per-page SEO overrides: the title and description a page publishes to
 * search and to social, and the image a share card draws.
 *
 * Shared rather than module-local since ADR-0069 D2 — `presidentMessagePage`
 * needs the same three fields, and Chapter 14 §3 requires a share image on
 * every page that can be linked. Two definitions of the same three fields
 * would be two things to keep in step.
 *
 * Not a standalone collection: `_id: false`.
 */
@Schema({ _id: false })
export class PageSeo {
  @Prop({ type: LocalizedTextSchema, default: null })
  metaTitle: LocalizedText | null;

  @Prop({ type: LocalizedTextSchema, default: null })
  metaDescription: LocalizedText | null;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  ogImageId: Types.ObjectId | null;
}

export const PageSeoSchema = SchemaFactory.createForClass(PageSeo);
