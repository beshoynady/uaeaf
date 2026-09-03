import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../common/schemas/localized-text.schema.js';
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
}

export const MediaAssetSchema = SchemaFactory.createForClass(MediaAsset);
