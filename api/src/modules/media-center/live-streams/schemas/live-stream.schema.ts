import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import {
  ContentAssociation,
  ContentAssociationSchema,
} from '../../../../common/schemas/content-association.schema.js';

export type LiveStreamDocument = HydratedDocument<LiveStream>;

/**
 * A broadcast the federation is showing on the site right now.
 *
 * ── Why this is not a `videos` row with `isLive: true` ─────────────────────
 *
 * The board once recorded the opposite, and `page-sections.schema.ts` still
 * carries that note. It was overridden on 2026-09-23 for two reasons that both
 * point the same way. A broadcast stored in `videos` is **in the public
 * library from the moment it is created**, and "a finished broadcast is not
 * archived into the library" is an explicit product decision — so it would
 * have to be filtered back out of every query, for ever, by everyone who
 * writes one. And `venue`, `expectedEndAt` and `endedAt` describe an event in
 * progress; on a library video they are three fields that never mean anything.
 *
 * `videos.isLive`, its partial unique index and its pre-save hook are left in
 * place and unused. Removing a unique index is a migration, and this work had
 * no mandate for one.
 *
 * ── How "only one at a time" is guaranteed ────────────────────────────────
 *
 * A partial unique index on `isActive: true`, which is the same shape the
 * legacy `videos.isLive` used. The flag rather than `endedAt: null` because a
 * stream that simply ran past its end time is still `isActive` in the
 * database — nobody pressed anything — and `findActive()` hides it by
 * comparing the time instead. That is what removes the need for a cron.
 */
@Schema({ collection: 'liveStreams', timestamps: true })
export class LiveStream extends BaseSchema {
  /** YouTube only. Format-checked on the way in; nothing here claims the
   *  stream is genuinely live, because only YouTube could answer that and
   *  asking it is out of scope. */
  @Prop({ required: true })
  url: string;

  /** The YouTube id, parsed from `url`. The embed is built from this. */
  @Prop({ required: true })
  videoId: string;

  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  /** Where it is being held. Optional: a stream with no stated venue shows no
   *  venue line, rather than an empty one. */
  @Prop({ type: LocalizedTextSchema, default: null })
  venue: LocalizedText | null;

  @Prop({ type: Date, required: true })
  startedAt: Date;

  /** When the "live" state stops showing on the site, with nobody pressing
   *  anything. The editor sets it; the default the dialog offers is three
   *  hours out. */
  @Prop({ type: Date, required: true })
  expectedEndAt: Date;

  /** Stamped when an editor ends the broadcast, or when a newer one replaces
   *  it. Null while it is the current stream — including after its end time
   *  has passed, which `findActive()` handles by reading the clock. */
  @Prop({ type: Date, default: null })
  endedAt: Date | null;

  /** The still, copied into this platform's library when the broadcast
   *  started. Null when the platform named no picture or the copy failed —
   *  neither is a reason to refuse to go on air, so every surface draws the
   *  federation's motif in that case. */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'MediaAsset', default: null })
  thumbnailId: Types.ObjectId | null;

  /** The single-active guarantee. Indexed below. */
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  /** The championship or event this broadcast belongs to. None of those
   *  collections is built yet — see `content-association.schema.ts` for why an
   *  association can be recorded before its owner exists. */
  @Prop({ type: [ContentAssociationSchema], default: [] })
  associations: ContentAssociation[];
}

export const LiveStreamSchema = SchemaFactory.createForClass(LiveStream);

/** Two streams cannot both be active. Partial, so the many inactive rows —
 *  every broadcast the federation has ever run — do not collide with each
 *  other on a single-valued index. */
LiveStreamSchema.index({ isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

/** `findActive()` reads by flag and time on every public request; the section
 *  endpoint is the hottest read on the homepage. */
LiveStreamSchema.index({ isActive: 1, expectedEndAt: -1 });

