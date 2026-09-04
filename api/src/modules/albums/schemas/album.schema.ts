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

  @Prop({ required: true, unique: true, trim: true })
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

  /** Denormalized count of non-archived `MediaAsset` documents whose
   *  `albumId` points here — NOT the source of truth (`mediaAssets` is).
   *  Maintained by `MediaAssetsService.create()`/`remove()` via atomic
   *  `$inc`, not recomputed by a scheduled job (2026-09-04 media-gallery
   *  hardening pass). If an update path that moves an asset between
   *  albums is added later, it must decrement the old album and increment
   *  the new one — no such path exists yet, so it isn't handled today. */
  @Prop({ type: Number, default: 0 })
  assetCount: number;
}

export const AlbumSchema = SchemaFactory.createForClass(Album);
AlbumSchema.index({ publicationState: 1, displayOrder: 1 });
// Supports "published albums in category X" listing queries — the CMS's
// per-category album grid (2026-09-04 media-gallery hardening pass).
AlbumSchema.index({ contentCategoryId: 1, publicationState: 1 });
// Supports the individual album page's "related albums" $elemMatch lookup
// (AlbumsRepository.findRelated()) — 2026-09-04 follow-on to ADR-0054.
AlbumSchema.index({
  'associations.ownerType': 1,
  'associations.ownerId': 1,
  publicationState: 1,
  archivedAt: 1,
});
