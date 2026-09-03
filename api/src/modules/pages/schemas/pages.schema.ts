import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../common/schemas/localized-text.schema.js';

export type PageDocument = HydratedDocument<Page>;

/** Structural routing status — is this page live at its URL at all. The
 *  board is explicit that this is DISTINCT from the 13-type workflow
 *  `publicationState` system used for editorial content approval within a
 *  page, which is why it is a two-value enum and why `pages` is absent
 *  from both Domain 7 closed lists. */
export const PAGE_STATUSES = ['Draft', 'Published'] as const;
export type PageStatus = (typeof PAGE_STATUSES)[number];

/** Per-page SEO overrides. */
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

/** Implements: pages collection, Domain 11 — CMS & Page Composition (live
 *  FigJam Physical Model, re-read fresh 2026-09-03).
 *
 *  A routable CMS page; its content is composed from `pageSections` rows.
 *  Not workflow-governed — see the `PAGE_STATUSES` note. */
@Schema({ collection: 'pages' })
export class Page extends BaseSchema {
  @Prop({ required: true, unique: true, trim: true })
  slug: string;

  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: String, enum: PAGE_STATUSES, required: true })
  status: PageStatus;

  @Prop({ type: PageSeoSchema, default: null })
  seo: PageSeo | null;
}

export const PageSchema = SchemaFactory.createForClass(Page);
