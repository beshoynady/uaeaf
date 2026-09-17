import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * Where a picture must keep looking, as percentages of its own frame.
 *
 * ── Why this lives on the slide and not on the asset ───────────────────────
 *
 * A focal point is not a property of a photograph; it is a property of *this
 * crop of* that photograph. The same track image is a wide band in the hero
 * and a narrow column on another page, and the point that must survive the
 * first crop is not the point that must survive the second. Storing it on
 * `mediaAssets` would make one page's framing decision silently re-frame
 * every other page that ever reuses the picture (owner correction,
 * 2026-09-16).
 *
 * ── Why percentages ───────────────────────────────────────────────────────
 *
 * They map straight onto `object-position`, which is what the browser uses to
 * decide which part of an over-wide picture to keep. Pixels would be wrong
 * the moment the CDN served a different rendition of the same asset.
 *
 * 50/50 is the default because it is what `object-fit: cover` does anyway, so
 * a slide nobody has framed behaves exactly as it did before this field
 * existed.
 */
@Schema({ _id: false })
export class FocalPoint {
  @Prop({ type: Number, default: 50, min: 0, max: 100 })
  x: number;

  @Prop({ type: Number, default: 50, min: 0, max: 100 })
  y: number;
}

export const FocalPointSchema = SchemaFactory.createForClass(FocalPoint);

export const CENTRE: Readonly<FocalPoint> = { x: 50, y: 50 };
