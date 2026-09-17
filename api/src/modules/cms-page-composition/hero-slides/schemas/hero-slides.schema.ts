import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import { HeroText, HeroTextSchema } from './hero-text.schema.js';
import { FocalPoint, FocalPointSchema } from './focal-point.schema.js';
import { HeroCta, HeroCtaSchema } from './hero-cta.schema.js';

export type HeroSlideDocument = HydratedDocument<HeroSlide>;

export const HERO_SLIDE_MEDIA_TYPES = ['IMAGE', 'VIDEO'] as const;
export type HeroSlideMediaType = (typeof HERO_SLIDE_MEDIA_TYPES)[number];

/**
 * What an English reader sees in place of the picture composed for Arabic.
 *
 * The library is composed for Arabic: a quiet third on the right, where an
 * Arabic line starts. English starts on the left, so the picture has to follow
 * the text, and the three ways it can are editorial rather than technical:
 *
 * - `mirror`, the default: the same picture flipped. Right for a track, a sky, a
 *   stadium with nothing written in it.
 * - `same`: unchanged, for a picture whose quiet part already suits both.
 * - `separate`: another picture. The only honest answer for a flag, writing or a
 *   known landmark, which a flip falsifies (owner decision 2026-09-16).
 */
export const LTR_IMAGE_MODES = ['same', 'mirror', 'separate'] as const;
export type LtrImageMode = (typeof LTR_IMAGE_MODES)[number];

/**
 * How many slides one HERO section may hold.
 *
 * Five is the approved composition's own number — Homepage Specification §6
 * and the Figma frame both carry exactly five — so the ceiling is read off
 * the design rather than invented. The floor is one: a hero with no slide is
 * not an empty hero, it is a page with no first screen, and the public reader
 * answers that with the site's name rather than a blank band.
 */
export const HERO_SLIDE_LIMIT = { min: 1, max: 5 } as const;

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
@Schema({ collection: 'heroSlides', timestamps: true })
export class HeroSlide extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'PageSection', required: true })
  pageSectionId: Types.ObjectId;

  @Prop({ type: String, enum: HERO_SLIDE_MEDIA_TYPES, required: true })
  mediaType: HeroSlideMediaType;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  imageAssetId: Types.ObjectId | null;

  /** Where the landscape picture must keep looking when the hero's frame
   *  crops it. Always present, defaulting to the centre, so the renderer
   *  never has to ask whether a slide has been framed. */
  @Prop({ type: FocalPointSchema, default: () => ({ x: 50, y: 50 }) })
  desktopFocalPoint: FocalPoint;

  /** Whether this slide uses a second, portrait picture on phones.
   *
   *  An explicit switch rather than "is `mobileImageAssetId` set?", because
   *  the two are different editorial acts: turning the phone crop off for a
   *  week should not throw away the picture that was chosen for it, the same
   *  reasoning `HeroCta.isVisible` follows. */
  @Prop({ type: Boolean, default: false })
  useMobileImage: boolean;

  /** The portrait crop a phone shows. Required by `HeroSlidesService` only
   *  when `useMobileImage` is true; cropping a 16:9 frame down to a phone's
   *  portrait viewport keeps the pixels and loses the composition, which is
   *  why the field exists at all (owner decision 2026-09-16). */
  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  mobileImageAssetId: Types.ObjectId | null;

  @Prop({ type: FocalPointSchema, default: () => ({ x: 50, y: 50 }) })
  mobileFocalPoint: FocalPoint;

  @Prop({ type: String, enum: LTR_IMAGE_MODES, default: 'mirror' })
  ltrImageMode: LtrImageMode;

  /** The English landscape picture, required by `HeroSlidesService` only when
   *  `ltrImageMode` is `separate`. Kept when the mode changes back, for the
   *  reason `mobileImageAssetId` is: switching is not deleting. The portrait
   *  phone picture has no English twin; its quiet part is at the bottom, which
   *  reading direction does not move. */
  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  ltrImageAssetId: Types.ObjectId | null;

  /** Required with `ltrImageAssetId`, and null otherwise, rather than centred
   *  by default: a separate picture has its own subject, and a centre nobody
   *  chose would be stored as if someone had. */
  @Prop({ type: FocalPointSchema, default: null })
  ltrFocalPoint: FocalPoint | null;

  @Prop({ type: Types.ObjectId, ref: 'Video', default: null })
  videoId: Types.ObjectId | null;

  /** The short line above the title. Present in the approved Figma slide 1
   *  (`2374:1203`) and absent from slides 2–5, so it is optional here rather
   *  than required — the composition itself uses it on one slide only. */
  @Prop({ type: LocalizedTextSchema, default: null })
  eyebrow: LocalizedText | null;

  /** Empty while the slide is hidden and still being written; required in
   *  both languages the moment it is shown (`assertVisibleSlideComplete`). */
  @Prop({ type: HeroTextSchema, default: () => ({ ar: '', en: '' }) })
  title: HeroText;

  @Prop({ type: HeroTextSchema, default: () => ({ ar: '', en: '' }) })
  subtitle: HeroText;

  /** The two calls to action, each independently shown or hidden.
   *
   *  This replaces the single required `ctaText`/`ctaUrl` pair the board
   *  specified. The replacement is safe to make in place — no `heroSlides`
   *  row exists in any environment — and it is what the owner asked for:
   *  zero, one or two buttons per slide, with hiding one leaving its words
   *  intact. When only one is visible, whichever it is, the site draws it as
   *  the primary button; two visible give the approved composition's primary
   *  button plus a text link. */
  @Prop({ type: HeroCtaSchema, default: () => ({ isVisible: false, label: null, url: null }) })
  primaryCta: HeroCta;

  @Prop({ type: HeroCtaSchema, default: () => ({ isVisible: false, label: null, url: null }) })
  secondaryCta: HeroCta;

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
