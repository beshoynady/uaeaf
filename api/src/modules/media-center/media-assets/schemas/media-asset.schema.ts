import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import { MediaFile, MediaFileSchema } from './media-file.schema.js';

export type MediaAssetDocument = HydratedDocument<MediaAsset>;

/** Implements: mediaAssets collection, Domain 5 — Media Center (FigJam
 *  node `92:7269`, re-read fresh 2026-09-03). Images only — rescoped from a
 *  general media collection once `videos` was split out into its own
 *  collection (Domain 6 split); do not add video-handling fields here. */
@Schema({ collection: 'mediaAssets' })
export class MediaAsset extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Album', default: null })
  albumId: Types.ObjectId | null;

  @Prop({ type: MediaFileSchema, required: true })
  file: MediaFile;

  @Prop({ type: LocalizedTextSchema, required: true })
  caption: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  altText: LocalizedText;

  /** Manual sort position within the parent album's CMS drag-and-drop
   *  grid. Required (not defaulted) so every asset is placed deliberately
   *  at creation time rather than silently piling up at the same
   *  position (2026-09-04 media-gallery hardening pass). */
  @Prop({ type: Number, required: true })
  displayOrder: number;

  /** Whether this asset appears in public-facing album views. Lets Media
   *  Center staff hide a specific image without archiving (removing) it
   *  entirely. */
  @Prop({ type: Boolean, default: true })
  isVisible: boolean;

  /** Marks an asset for prominent placement (e.g. a homepage/album
   *  spotlight slot) — independent of `Album.coverImageId`, which is a
   *  single designated cover, not a "featured" flag on the asset itself. */
  @Prop({ type: Boolean, default: false })
  isFeatured: boolean;
}

export const MediaAssetSchema = SchemaFactory.createForClass(MediaAsset);
// Both support the album detail page's ordered asset grid; the second
// additionally supports filtering that grid to visible-only assets without
// an in-memory sort (2026-09-04 media-gallery hardening pass).
MediaAssetSchema.index({ albumId: 1, displayOrder: 1 });
MediaAssetSchema.index({ albumId: 1, isVisible: 1, displayOrder: 1 });
