import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema.js';
import {
  LocalizedText,
  LocalizedTextSchema,
} from '../../../common/schemas/localized-text.schema.js';
import {
  ContentAssociation,
  ContentAssociationSchema,
} from '../../../common/schemas/content-association.schema.js';

export type AlbumDocument = HydratedDocument<Album>;

export const ALBUM_PUBLICATION_STATES = [
  'Draft',
  'Published',
  'Archived',
] as const;
export type AlbumPublicationState = (typeof ALBUM_PUBLICATION_STATES)[number];

/** Implements: albums collection, Domain 5 — Media Center (FigJam node
 *  `92:7224`, re-read fresh 2026-09-03; finalized per the 2026-09-03
 *  schema correction). `publicationState` is self-owned: an album is a
 *  media-organization construct, not editorial narrative content, so it is
 *  published directly by Media Center staff without a Domain 7 review
 *  pipeline — `albums` is deliberately absent from both
 *  `WORKFLOW_ENTITY_TYPES` and `PUBLICATION_ENTITY_TYPES`
 *  (`common/constants/workflow-entity-types.ts`). `contentCategoryId` refs
 *  a `contentCategories` collection not built this week — plain
 *  `ObjectId`, no `ref:` to a not-yet-registered model.
 *
 *  No album hierarchy: confirmed there is no `parentAlbumId` — grouping is
 *  solely via `associations[]` (multiple albums may share the same
 *  championship/athlete/club/event target).
 *
 *  `publishedAt`/`publishedBy` are server-set only, on the Draft→Published
 *  transition (`AlbumsService.publish()`, gated by a dedicated `Publish`
 *  permission — never accepted from the request body and never settable
 *  via generic update access).
 *
 *  `publicationState: 'Archived'` and `archivedAt` are two independent
 *  concepts kept as-is: the former is a business state ("no longer
 *  publicly shown" while the record still fully exists), the latter is
 *  the infra-level soft-delete marker inherited from `BaseSchema` ("record
 *  removed from the system"). An album can be business-Archived while
 *  still active (`archivedAt: null`), and vice versa. */
@Schema({ collection: 'albums' })
export class Album extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  /** Uniqueness declared below as a partial index, not `unique: true`
   *  here — see that index's comment (schema-audit-2026-09-04.md §9.2,
   *  P1 finding). */
  @Prop({ required: true, trim: true })
  slug: string;

  @Prop({ type: LocalizedTextSchema, default: null })
  description: LocalizedText | null;

  @Prop({ type: Types.ObjectId, required: true })
  contentCategoryId: Types.ObjectId;

  @Prop({ type: [ContentAssociationSchema], default: [] })
  associations: ContentAssociation[];

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  coverImageId: Types.ObjectId | null;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  @Prop({ type: String, enum: ALBUM_PUBLICATION_STATES, required: true })
  publicationState: AlbumPublicationState;

  @Prop({ type: Date, default: null })
  publishedAt: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  publishedBy: Types.ObjectId | null;

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const AlbumSchema = SchemaFactory.createForClass(Album);
AlbumSchema.index({ publicationState: 1, displayOrder: 1 });
// Partial so a soft-deleted album's slug doesn't permanently block a
// corrected re-creation (schema-audit-2026-09-04.md §9.2, P1 finding).
AlbumSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { archivedAt: null } });
