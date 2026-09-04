import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';

export type HeroSlideDocument = HydratedDocument<HeroSlide>;

export const HERO_SLIDE_MEDIA_TYPES = ['IMAGE', 'VIDEO'] as const;
export type HeroSlideMediaType = (typeof HERO_SLIDE_MEDIA_TYPES)[number];

/** Implements: heroSlides collection, Domain 11 — CMS & Page Composition
 *  (live FigJam Physical Model, re-read fresh 2026-09-03).
 *
 *  One slide inside a HERO `pageSections` instance. `imageAssetId` is
 *  required only when `mediaType='IMAGE'` and `videoId` only when
 *  `mediaType='VIDEO'` — a conditional rule Mongoose cannot express, so
 *  `HeroSlidesService.create()` enforces it.
 *
 *  The board records that `imageAssetId` "previously and incorrectly
 *  claimed to work for both" media types; since `mediaAssets` was rescoped
 *  to images only when `videos` split out, a video slide must use
 *  `videoId`. Not workflow-governed. */
@Schema({ collection: 'heroSlides' })
export class HeroSlide extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'PageSection', required: true })
  pageSectionId: Types.ObjectId;

  @Prop({ type: String, enum: HERO_SLIDE_MEDIA_TYPES, required: true })
  mediaType: HeroSlideMediaType;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  imageAssetId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Video', default: null })
  videoId: Types.ObjectId | null;

  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  subtitle: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  ctaText: LocalizedText;

  @Prop({ type: String, required: true })
  ctaUrl: string;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  @Prop({ type: Boolean, default: true })
  active: boolean;

  @Prop({ type: Date, default: null })
  scheduledFrom: Date | null;

  @Prop({ type: Date, default: null })
  scheduledTo: Date | null;
}

export const HeroSlideSchema = SchemaFactory.createForClass(HeroSlide);
HeroSlideSchema.index({ pageSectionId: 1, displayOrder: 1 });
