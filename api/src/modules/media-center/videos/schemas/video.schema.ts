import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import { ContentAssociation, ContentAssociationSchema } from '../../../../common/schemas/content-association.schema.js';

export type VideoDocument = HydratedDocument<Video>;

export const VIDEO_EXTERNAL_PLATFORMS = ['YouTube', 'Facebook', 'Instagram', 'TikTok', 'X', 'Other'] as const;
export type VideoExternalPlatform = (typeof VIDEO_EXTERNAL_PLATFORMS)[number];

/** Implements: videos collection, Domain 5 — Media Center / Domain 6 split
 *  (FigJam node `92:7326`, re-read fresh 2026-09-03). All five external
 *  platforms support URL-only oEmbed, so `externalUrl` alone is sufficient
 *  — no embed-code field needed. `contentCategoryId` refs a
 *  `contentCategories` collection not built this week — plain `ObjectId`,
 *  no `ref:`. */
@Schema({ collection: 'videos' })
export class Video extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: Types.ObjectId, required: true })
  contentCategoryId: Types.ObjectId;

  /** True for the single record representing the currently active live
   *  stream — both the Videos page's "Live Now" section and the homepage
   *  LIVE_STREAM section read this same record, single source of truth.
   *  At most one `Video` may have `isLive: true` at a time, enforced two
   *  ways per the live board: the partial unique index below (hard DB
   *  guarantee), plus the `pre('save')` hook (soft, graceful — unsets any
   *  previously-live video first so a legitimate "switch live streams"
   *  write doesn't just fail on the index). */
  @Prop({ type: Boolean, default: false })
  isLive: boolean;

  @Prop({ type: String, enum: VIDEO_EXTERNAL_PLATFORMS, required: true })
  externalPlatform: VideoExternalPlatform;

  @Prop({ required: true })
  externalUrl: string;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  thumbnailId: Types.ObjectId | null;

  @Prop({ type: [ContentAssociationSchema], default: [] })
  associations: ContentAssociation[];

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const VideoSchema = SchemaFactory.createForClass(Video);
VideoSchema.index({ isLive: 1 }, { unique: true, partialFilterExpression: { isLive: true } });

VideoSchema.pre('save', async function (this: VideoDocument) {
  if (this.isLive && this.isModified('isLive')) {
    const model = this.constructor as Model<VideoDocument>;
    await model.updateMany({ _id: { $ne: this._id }, isLive: true }, { isLive: false });
  }
});
