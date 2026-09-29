import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import { PageSeo, PageSeoSchema } from '../../../../common/schemas/page-seo.schema.js';

export type SeasonDocument = HydratedDocument<Season>;

export const SEASON_PUBLICATION_STATES = ['Draft', 'Published', 'Archived'] as const;
export type SeasonPublicationState = (typeof SEASON_PUBLICATION_STATES)[number];

export const SEASON_PHASE_TYPES = ['preparation', 'domestic', 'international', 'rest'] as const;
export type SeasonPhaseType = (typeof SEASON_PHASE_TYPES)[number];

/** One stretch of a season's calendar. Not a standalone collection: `_id: false`,
 *  the same convention `ContentAssociation` uses. */
@Schema({ _id: false })
export class SeasonPhase {
  @Prop({ type: LocalizedTextSchema, required: true })
  name: LocalizedText;

  @Prop({ type: String, enum: SEASON_PHASE_TYPES, required: true })
  type: SeasonPhaseType;

  @Prop({ type: Date, required: true })
  from: Date;

  @Prop({ type: Date, required: true })
  to: Date;
}
export const SeasonPhaseSchema = SchemaFactory.createForClass(SeasonPhase);

/** One dated milestone shown on the season's timeline. */
@Schema({ _id: false })
export class SeasonKeyDate {
  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: Date, required: true })
  date: Date;
}
export const SeasonKeyDateSchema = SchemaFactory.createForClass(SeasonKeyDate);

/**
 * Implements: `seasons` collection, Domain 5 — Media Center.
 *
 * `seasons` is a `WORKFLOW_ENTITY_TYPES`/`PublicationEntityType` member:
 * `publicationState` moves to `Published` only through
 * `PublishingService.publishDirect`, behind the type's approval policy and
 * its `Publish` permission (ADR-0125) — `SeasonsController` no longer
 * publishes on its own. Unlike `albums`/`videos`, which stay outside the
 * list (see `album.schema.ts`).
 */
@Schema({ collection: 'seasons', timestamps: true })
export class Season extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  name: LocalizedText;

  @Prop({ required: true, trim: true })
  shortName: string;

  /** Uniqueness declared below as a partial index, matching `AlbumSchema`'s
   *  slug index — not `unique: true` here, so a soft-deleted season's slug
   *  does not block re-creation. */
  @Prop({ required: true, trim: true })
  slug: string;

  @Prop({ type: LocalizedTextSchema, default: null })
  tagline: LocalizedText | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'MediaAsset', default: null })
  logoId: Types.ObjectId | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'MediaAsset', default: null })
  bannerId: Types.ObjectId | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'MediaAsset', default: null })
  shareImageId: Types.ObjectId | null;

  @Prop({ type: LocalizedTextSchema, required: true })
  about: LocalizedText;

  /** Shown on the public page only once `endDate` has passed — a display
   *  rule, never a storage rule, so this is never conditionally required. */
  @Prop({ type: LocalizedTextSchema, default: null })
  closingSummary: LocalizedText | null;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({ type: [SeasonPhaseSchema], default: [] })
  phases: SeasonPhase[];

  @Prop({ type: [SeasonKeyDateSchema], default: [] })
  keyDates: SeasonKeyDate[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Document', default: null })
  calendarDocumentId: Types.ObjectId | null;

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'Document', default: [] })
  documentIds: Types.ObjectId[];

  /** At most one season holds this at a time — enforced below by a partial
   *  unique index, and by `SeasonsRepository.setCurrent` clearing the
   *  previous holder in the same operation. */
  @Prop({ type: Boolean, default: false })
  isCurrent: boolean;

  @Prop({ type: String, enum: SEASON_PUBLICATION_STATES, required: true })
  publicationState: SeasonPublicationState;

  @Prop({ type: Date, default: null })
  publishedAt: Date | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  publishedBy: Types.ObjectId | null;

  @Prop({ type: Boolean, default: false })
  isVisible: boolean;

  @Prop({ type: PageSeoSchema, default: () => ({}) })
  seo: PageSeo;
}

export const SeasonSchema = SchemaFactory.createForClass(Season);

SeasonSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { archivedAt: null } });
SeasonSchema.index({ isCurrent: 1 }, { unique: true, partialFilterExpression: { isCurrent: true } });
SeasonSchema.index({ publicationState: 1, startDate: -1 });
SeasonSchema.index({ startDate: 1, endDate: 1 });
