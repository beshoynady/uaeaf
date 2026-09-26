import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import {
  LocalizedText,
  LocalizedTextSchema,
} from '../../../../common/schemas/localized-text.schema.js';

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
 *  (`common/constants/workflow-entity-types.ts`).
 *
 *  `contentCategoryId` was removed 2026-09-25 (Product Owner decision): it
 *  pointed at a `contentCategories` collection that was never built, so it
 *  could be neither resolved nor filtered — the same reason `videos` dropped
 *  it on 2026-09-23. No enum replaces it: the design filters by linked entity
 *  and by period, and the category chips were removed from the approved canvas
 *  in v14, so an enum would be a field nothing reads.
 *
 *  No album hierarchy: there is no `parentAlbumId`, and an album never
 *  contains another album (owner rule, restated 2026-09-25). Albums group by
 *  shared affiliation — many may name the same championship, athlete or club
 *  — never by nesting.
 *
 *  `associations[]` was removed 2026-09-25 (Product Owner decision): the
 *  explicit affiliation fields below carry exactly what it carried
 *  (championships, competitions, public events, athletes, clubs), and two
 *  fields holding one fact is a fact that can disagree with itself. The
 *  related-albums strip, its only reader, was rewritten onto those fields and
 *  got more precise in the process — it can now rank by how closely two albums
 *  are related rather than by "shares any target".
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
@Schema({ collection: 'albums', timestamps: true })
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

  /**
   *  Where this album sits, stated field by field rather than derived.
   *
   *  Two branches meet here. The competitive one narrows —
   *  championship → competition — and the institutional one is a single
   *  `publicEventId`: a press conference, an honouring ceremony, a national
   *  sport day. An album may sit in one branch, or in neither: the
   *  hero copy promises "the federation's official activities", and a board
   *  meeting belongs to no season. Forcing one would make the editor pick a
   *  false value, and a false value makes every season filter lie.
   *
   *  Each level is recorded explicitly instead of walked up from the deepest
   *  one. The editor knows the answer and can simply say it; deriving it
   *  would need three collections that do not exist, and would leave every
   *  album stale the day a championship moved to a different season.
   *
   *  No `parentAlbumId`, and no album inside an album (owner rule, restated
   *  2026-09-25; first recorded 2026-09-04). Albums group by shared
   *  affiliation, never by nesting.
   *
   *  There is no `seasonId`. This platform derives a season from a date and
   *  adds no season entity — `videos/season.ts` records that decision, and a
   *  second, contradicting answer here would make the same word mean a label
   *  in one public endpoint and an id in its neighbour. An album's season is
   *  `seasonLabel(eventDate)`, computed wherever it is needed.
   *
   *  No `ref:` on any of them: none of the three collections is registered
   *  yet, the same poly-ref pattern this schema already uses.
   */
  @Prop({ type: Types.ObjectId, default: null })
  championshipId: Types.ObjectId | null;

  /** One competition inside `championshipId` — a single final, a single day. */
  @Prop({ type: Types.ObjectId, default: null })
  competitionId: Types.ObjectId | null;

  /** The institutional branch: a conference, an honouring, a signing.
   *  Mutually exclusive with `championshipId` — an occasion is one or the
   *  other, never both. */
  @Prop({ type: Types.ObjectId, default: null })
  publicEventId: Types.ObjectId | null;

  /**
   *  Who appears in the album, across both branches.
   *
   *  Deliberately not part of the hierarchy above. A photograph of an athlete
   *  at a press conference and one of her in a 100m final are both "her", and
   *  hanging the athlete off the competitive tree would lose half of those.
   *
   *  These two are the only affiliations that resolve today: `athletes` and
   *  `clubs` are built, so their filters work from day one while the four
   *  above stay hidden until their modules exist.
   */
  @Prop({ type: [Types.ObjectId], default: [] })
  athleteIds: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], default: [] })
  clubIds: Types.ObjectId[];

  /** When the occasion happened — what the card and the period filter show.
   *  Distinct from `publishedAt`, which is when the federation posted it. */
  @Prop({ type: Date, default: null })
  eventDate: Date | null;

  @Prop({ type: LocalizedTextSchema, default: null })
  location: LocalizedText | null;

  /** At most one album holds this at a time; `AlbumsService.setFeatured`
   *  clears the previous holder in the same operation. */
  @Prop({ type: Boolean, default: false })
  isFeatured: boolean;

  /** Denormalized bilingual display name of this album's championship or
   *  public event, captured from admin input at creation time — not a live
   *  join against `championshipId`/`publicEventId`. Neither collection exists
   *  yet, so there is nothing to resolve a name from at read time, and this is
   *  what lets the card and the detail page name the occasion today (owner
   *  decision 2026-09-07).
   *  [REVIEW WHEN THE CHAMPIONSHIPS MODULE IS BUILT]: decide then whether this
   *  stays a snapshot or is replaced by a resolved join — deliberately
   *  deferred, not decided here. */
  @Prop({ type: LocalizedTextSchema, default: null })
  championshipName: LocalizedText | null;

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
// Partial so a soft-deleted album's slug doesn't permanently block a
// corrected re-creation (schema-audit-2026-09-04.md §9.2, P1 finding).
AlbumSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { archivedAt: null } });
AlbumSchema.index({ publicationState: 1, displayOrder: 1 });
// The public list's default ordering, and what its period filter ranges over.
//
// Every sort key is in the index, in order: without `publishedAt` and `_id`
// the database can use it to find the rows but not to order them, so each
// gallery request sorts the whole published set in memory and the cost grows
// with the page number. `archivedAt` is a partial filter rather than a fourth
// key, so the matching count can be answered from the index alone — the same
// shape the `slug` index already uses.
AlbumSchema.index(
  { publicationState: 1, eventDate: -1, publishedAt: -1, _id: 1 },
  { partialFilterExpression: { archivedAt: null } },
);
// The three entity filters. Each is queried on its own, never combined into a
// compound, because the filter bar lets a visitor pick any one of them alone.
AlbumSchema.index({ championshipId: 1 });
AlbumSchema.index({ competitionId: 1 });
AlbumSchema.index({ publicEventId: 1 });
// Multikey. Both back a visitor filter and the related-albums strip's
// "shares an athlete" tier.
AlbumSchema.index({ athleteIds: 1 });
AlbumSchema.index({ clubIds: 1 });
// Finds the one featured album without scanning the collection.
AlbumSchema.index({ isFeatured: 1, publicationState: 1 });
