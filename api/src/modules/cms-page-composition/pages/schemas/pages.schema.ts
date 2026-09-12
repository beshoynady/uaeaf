import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
// Shared since ADR-0069 D2 — `presidentMessagePage` carries the same three
// fields. Re-exported here so this module's existing importers are unchanged.
import { PageSeo, PageSeoSchema } from '../../../../common/schemas/page-seo.schema.js';

export { PageSeo, PageSeoSchema };

export type PageDocument = HydratedDocument<Page>;

/** Structural routing status — is this page live at its URL at all. The
 *  board is explicit that this is DISTINCT from the 13-type workflow
 *  `publicationState` system used for editorial content approval within a
 *  page, which is why it is a two-value enum and why `pages` is absent
 *  from both Domain 7 closed lists. */
export const PAGE_STATUSES = ['Draft', 'Published'] as const;
export type PageStatus = (typeof PAGE_STATUSES)[number];

/** Implements: pages collection, Domain 11 — CMS & Page Composition (live
 *  FigJam Physical Model, re-read fresh 2026-09-03).
 *
 *  A routable CMS page; its content is composed from `pageSections` rows.
 *  Not workflow-governed — see the `PAGE_STATUSES` note. */
@Schema({ collection: 'pages', timestamps: true })
export class Page extends BaseSchema {
  /** Uniqueness declared below as a partial index, not `unique: true`
   *  here — see that index's comment (schema-audit-2026-09-04.md §9.2,
   *  P1 finding). */
  @Prop({ required: true, trim: true })
  slug: string;

  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: String, enum: PAGE_STATUSES, required: true })
  status: PageStatus;

  @Prop({ type: PageSeoSchema, default: null })
  seo: PageSeo | null;
}

export const PageSchema = SchemaFactory.createForClass(Page);
// Partial so a soft-deleted page's slug doesn't permanently block a
// corrected re-creation (schema-audit-2026-09-04.md §9.2, P1 finding).
PageSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { archivedAt: null } });
