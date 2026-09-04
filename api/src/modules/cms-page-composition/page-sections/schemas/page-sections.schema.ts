import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';

export type PageSectionDocument = HydratedDocument<PageSection>;

/** Closed list, verbatim from the live board (re-read fresh 2026-09-03).
 *  `LIVE_STREAM` is deliberately absent — it was merged into
 *  `VIDEO_LIBRARY` (a live item is just a `videos` record with
 *  `isLive=true`, featured within that same section). `PARTNERS` is
 *  present with its design not yet built, space reserved. */
export const PAGE_SECTION_TYPES = [
  'HERO',
  'FEDERATION_STATS',
  'FEATURED_ATHLETES',
  'RESULTS_RANKINGS',
  'CLUBS',
  'UPCOMING_HIGHLIGHTS',
  'LATEST_NEWS',
  'PHOTO_GALLERY',
  'VIDEO_LIBRARY',
  'EXTERNAL_MEDIA',
  'SPONSORS',
  'PARTNERS',
  'NEWSLETTER_CTA',
] as const;
export type PageSectionType = (typeof PAGE_SECTION_TYPES)[number];

/** Presentation-layer visibility — distinct from data-level `[RESTRICTED]`
 *  tagging. `[SCHEMA-READY GAP FILLED]` on the board. */
export const PAGE_SECTION_VISIBILITIES = ['Everyone', 'AuthenticatedOnly', 'AdminPreviewOnly'] as const;
export type PageSectionVisibility = (typeof PAGE_SECTION_VISIBILITIES)[number];

export const PAGE_SECTION_SELECTION_MODES = ['MANUAL', 'AUTOMATIC'] as const;
export type PageSectionSelectionMode = (typeof PAGE_SECTION_SELECTION_MODES)[number];

/**
 * The closed 10-type target list `items[]` may point at (confirmed
 * decision #6, read verbatim from the board rather than guessed).
 *
 * Documentation only — it cannot be enforced at the schema level, because
 * `items` is a bare `[ObjectId]` with no per-entry type discriminator.
 * ⚠️ Flagged asymmetry: `documents.ownerType`/`ownerId` and the shared
 * `ContentAssociation {ownerType, ownerId}` both pair a type with each id,
 * but this one does not — so an entry's target collection is inferable
 * only from the row's own `sectionType` (e.g. FEATURED_ATHLETES → athletes).
 * Implemented exactly as the board specifies; not "fixed" by inventing a
 * discriminator the board doesn't have.
 */
export const PAGE_SECTION_ITEM_TARGETS = [
  'athletes',
  'articles',
  'externalMediaCoverage',
  'sponsors',
  'partnerships',
  'championshipEvents',
  'publicEvents',
  'clubs',
  'videos',
  'albums',
] as const;
export type PageSectionItemTarget = (typeof PAGE_SECTION_ITEM_TARGETS)[number];

/** Implements: pageSections collection, Domain 11 — CMS & Page Composition
 *  (live FigJam Physical Model, re-read fresh 2026-09-03).
 *
 *  One composed section of a `pages` row. Not workflow-governed (no
 *  `publicationState`; absent from both Domain 7 closed lists) — visibility
 *  is controlled by `enabled`, `visibility` and the
 *  `visibleFrom`/`visibleUntil` window instead.
 *
 *  `items[]` holds bare ObjectIds of the manually-selected entries when
 *  `selectionMode='MANUAL'` — see `PAGE_SECTION_ITEM_TARGETS`. Seven of the
 *  ten target collections are not built yet (Domain 3/4/9 scope), so no
 *  Mongoose `ref:` is registered, matching the established pattern for poly
 *  refs to not-yet-built collections.
 *
 *  `filters` (used when `selectionMode='AUTOMATIC'`) and `configuration`
 *  (section-specific settings) are deliberately free-form objects on the
 *  board; they are stored as-is and not schema-constrained here.
 *
 *  ⚠️ Stale board text, flagged: `configuration`'s note still documents a
 *  `LIVE_STREAM` shape, but `LIVE_STREAM` was removed from `sectionType`
 *  when it merged into `VIDEO_LIBRARY`. The field stays free-form, so no
 *  behaviour depends on the resolution. */
@Schema({ collection: 'pageSections' })
export class PageSection extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Page', required: true })
  pageId: Types.ObjectId;

  @Prop({ type: String, enum: PAGE_SECTION_TYPES, required: true })
  sectionType: PageSectionType;

  /** Admin-editable heading override; null falls back to a per-sectionType
   *  default resolved client-side. */
  @Prop({ type: LocalizedTextSchema, default: null })
  sectionTitle: LocalizedText | null;

  @Prop({ type: LocalizedTextSchema, default: null })
  sectionSubtitle: LocalizedText | null;

  /** How many items to display in AUTOMATIC mode; ignored in MANUAL mode,
   *  where `items[]` itself defines the count. */
  @Prop({ type: Number, default: null })
  itemLimit: number | null;

  @Prop({ type: LocalizedTextSchema, default: null })
  ctaText: LocalizedText | null;

  @Prop({ type: String, default: null })
  ctaUrl: string | null;

  /** Section appears on/after this date; null means always eligible
   *  (subject to `enabled`). */
  @Prop({ type: Date, default: null })
  visibleFrom: Date | null;

  /** Section stops appearing after this date — e.g. a championship promo
   *  that self-removes once the event has passed. */
  @Prop({ type: Date, default: null })
  visibleUntil: Date | null;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  @Prop({ type: Boolean, default: true })
  enabled: boolean;

  @Prop({ type: String, enum: PAGE_SECTION_VISIBILITIES, required: true })
  visibility: PageSectionVisibility;

  @Prop({ type: String, enum: PAGE_SECTION_SELECTION_MODES, required: true })
  selectionMode: PageSectionSelectionMode;

  @Prop({ type: [Types.ObjectId], default: [] })
  items: Types.ObjectId[];

  @Prop({ type: Object, default: null })
  filters: Record<string, unknown> | null;

  @Prop({ type: Object, default: null })
  configuration: Record<string, unknown> | null;
}

export const PageSectionSchema = SchemaFactory.createForClass(PageSection);
PageSectionSchema.index({ pageId: 1, displayOrder: 1 });
