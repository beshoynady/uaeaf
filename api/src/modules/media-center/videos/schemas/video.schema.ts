import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import { ContentAssociation, ContentAssociationSchema } from '../../../../common/schemas/content-association.schema.js';

export type VideoDocument = HydratedDocument<Video>;

/** The platforms a link can be resolved on and embedded from.
 *
 *  Lowercase, and `Other` is gone. Both changes are the same rule: this list
 *  is the allowlist the URL parser matches against, so a value here has to be
 *  a platform something can actually resolve and embed. `Other` named no
 *  host, so a row carrying it could never be turned into a player. */
export const VIDEO_EXTERNAL_PLATFORMS = ['youtube', 'instagram', 'tiktok', 'x', 'facebook'] as const;
export type VideoExternalPlatform = (typeof VIDEO_EXTERNAL_PLATFORMS)[number];

/** Horizontal video, or a vertical 9:16 reel.
 *
 *  Independent of the platform on purpose: a YouTube Short and an Instagram
 *  Reel are both reels, and a platform is not a shape. The public site draws
 *  the two in different frames and keeps reels out of the horizontal carousel
 *  by default, so getting this wrong crops somebody's video. */
export const VIDEO_KINDS = ['video', 'reel'] as const;
export type VideoKind = (typeof VIDEO_KINDS)[number];

/** What the video is about. A closed list, because it is a filter: free text
 *  would make two spellings of one subject into two filters forever. */
export const VIDEO_CATEGORIES = ['championships', 'events', 'interviews', 'nationalTeam', 'training'] as const;
export type VideoCategory = (typeof VIDEO_CATEGORIES)[number];

export const VIDEO_STATUSES = ['draft', 'published'] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

/**
 * How long a video title may be, per language.
 *
 * A ceiling exists because this value does NOT come from an editor: it is
 * seeded from a third party's oEmbed reply, so its length is chosen by
 * whichever platform answered. 180 characters is roughly twice the longest
 * real headline in the newsroom and still fits the card's three-line clamp at
 * the narrowest breakpoint, so it bounds the hostile case without ever
 * reaching a genuine one. The resolver trims to this rather than refusing, so
 * a verbose platform cannot make a link unaddable.
 */
export const VIDEO_TITLE_MAX_LENGTH = 180;

/** Implements: videos collection, Domain 5 — Media Center / Domain 6 split
 *  (FigJam node `92:7326`, re-read fresh 2026-09-03). All five external
 *  platforms support URL-only oEmbed, so `externalUrl` alone is sufficient
 *  — no embed-code field needed.
 *
 *  `contentCategoryId` was removed 2026-09-23: it was a plain `ObjectId`
 *  pointing at a `contentCategories` collection that was never built, so it
 *  could be neither resolved nor filtered. `category` below is the closed
 *  enum that replaces it.
 *
 *  There is deliberately **no `order` field**. The public library and the
 *  admin table are both ordered by `publishedAt` descending, so what an
 *  editor sees is the order a visitor gets. Manual arrangement exists in one
 *  place only — `pageSections.items[]`, which feeds the homepage carousel's
 *  manual source — because two orderings would eventually disagree and only
 *  one of them is visible from any given screen. */
@Schema({ collection: 'videos', timestamps: true })
export class Video extends BaseSchema {
  @Prop({
    type: LocalizedTextSchema,
    required: true,
    // Validated here rather than on `LocalizedTextSchema`, which is shared by
    // every bilingual field in the platform and has no business carrying one
    // collection's ceiling.
    validate: {
      validator: (value: LocalizedText | null) =>
        !value ||
        ((value.ar ?? '').length <= VIDEO_TITLE_MAX_LENGTH && (value.en ?? '').length <= VIDEO_TITLE_MAX_LENGTH),
      message: `title must be at most ${VIDEO_TITLE_MAX_LENGTH} characters in each language`,
    },
  })
  title: LocalizedText;

  @Prop({ type: String, enum: VIDEO_CATEGORIES, required: true })
  category: VideoCategory;

  @Prop({ type: String, enum: VIDEO_KINDS, default: 'video' })
  kind: VideoKind;

  /** The video's id on its own platform, parsed out of the pasted link.
   *  Stored rather than re-parsed on every render, so a link shape that
   *  changes upstream cannot break every existing row at once. */
  @Prop({ required: true })
  externalId: string;

  @Prop({ type: String, enum: VIDEO_STATUSES, default: 'draft' })
  status: VideoStatus;

  /** When the video went public. Stamped by the service at the moment a draft
   *  becomes published, never by the editor, so it always means the same
   *  thing — which is what lets the season filter be derived from it instead
   *  of stored as a second field that could disagree with it. */
  @Prop({ type: Date, default: null })
  publishedAt: Date | null;

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
