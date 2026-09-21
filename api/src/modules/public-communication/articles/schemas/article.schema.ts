import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import {
  LocalizedRichText,
  LocalizedRichTextSchema,
} from '../../../../common/schemas/localized-rich-text.schema.js';
import { PageSeo, PageSeoSchema } from '../../../../common/schemas/page-seo.schema.js';
import type { PublicationState } from '../../../../common/constants/publication-states.js';

export type ArticleDocument = HydratedDocument<Article>;

/**
 * The only two states a news item has (owner decision 2026-09-20).
 *
 * Declared as a provable subset of `PUBLICATION_STATES` rather than as a free
 * list of its own: `articles` shares `PublishingService` with eleven other
 * types, and that service reads this column, so the vocabulary has to be
 * theirs. `Unpublished` and `Archived` are then excluded by the type system
 * rather than by a comment nobody reads — widening this list to a value the
 * shared enum does not define stops compiling.
 */
export const ARTICLE_PUBLICATION_STATES = ['Draft', 'Live'] as const satisfies readonly PublicationState[];
export type ArticlePublicationState = (typeof ARTICLE_PUBLICATION_STATES)[number];

/**
 * Which shelf of the newsroom this item belongs on.
 *
 * Deliberately NOT `externalMediaCoverage`, and the distinction is the whole
 * reason this field is named rather than reused: `externalMediaCoverage` is a
 * separate collection of pointers at coverage a newspaper published elsewhere.
 * This is a label on an article the federation itself wrote, saying which part
 * of its own newsroom the piece belongs to. Conflating them would put someone
 * else's headline in the federation's voice.
 *
 * `FederationInMedia` is the federation writing about its own presence in the
 * press — a round-up, a statement responding to coverage — not the coverage.
 *
 * Two values to start and the list is open to grow, following
 * `GOVERNANCE_DOCUMENT_TYPES`: the identifiers are English and closed, and the
 * reader's label comes from the message catalogues in each app.
 */
export const ARTICLE_CATEGORIES = ['General', 'FederationInMedia'] as const;
export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

/**
 * Implements: articles collection, Domain 4 — News & Editorial
 * (`docs/product/07-Mongoose-Schema-Specification.md` §articles, content type
 * `CT-ARTICLE-001` in `03-Content-Data-Structuring-Document.md` §8.16).
 *
 * Workflow-governed (List A + List B): the public site reads through
 * `publications → revisions.snapshotData`, never this row. The row answers
 * only which articles are live and in what order.
 *
 * Deliberately absent, each for a stated reason rather than an oversight:
 *  - `contentCategoryId` and tags — out of scope for this batch.
 *  - `references` to athletes, clubs or championships — those collections have
 *    no public surface, and a link to nothing is worse than no link.
 *  - any link to a results table — the tournament result is published as an
 *    ordinary article by owner decision, and no results schema exists to point
 *    at.
 */
@Schema({ collection: 'articles', timestamps: true })
export class Article extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  /**
   * Required, with a default.
   *
   * Required alone would make every article written before this field existed
   * unsaveable; optional alone would leave "no category" as a state nobody
   * chose and every reader of the feed would have to handle. A default is the
   * only shape with neither problem, and `General` is the honest one: an
   * article nobody filed anywhere is a general article.
   */
  @Prop({ type: String, enum: ARTICLE_CATEGORIES, required: true, default: 'General' })
  category: ArticleCategory;

  /**
   * The URL segment, one per article across both languages.
   *
   * The approved schema specification records that `articles` has no slug and
   * flags the absence as an open structural item; the owner closed it on
   * 2026-09-20, because Chapter 14 §5 requires a clean, stable URL and
   * `/news/<objectid>` is neither.
   *
   * One slug rather than one per language: the two editions are the same story
   * at the same address, which is exactly what the reciprocal `hreflang` pair
   * emitted by `buildMetadata` asserts about them.
   */
  @Prop({ type: String, required: true, trim: true })
  slug: string;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  coverMediaId: Types.ObjectId | null;

  /** One ProseMirror document per language, checked against the per-language
   *  allowlist on every write (ADR-0069 D1) — including a write that never
   *  passed through the dashboard. */
  @Prop({ type: LocalizedRichTextSchema, required: true })
  body: LocalizedRichText;

  /** The editorial byline, which may differ from the account that typed it.
   *  `createdBy` on BaseSchema is the account; this is the name readers see. */
  @Prop({ type: LocalizedTextSchema, required: true })
  authorDisplayName: LocalizedText;

  /** Stamped by the server when the item is published, never chosen by an
   *  author — two stored dates could disagree, and the published one is the
   *  true one. Null until then, which also reads as "never published". */
  @Prop({ type: Date, default: null })
  publishDate: Date | null;

  /** Shared with `pages` and the singleton pages; Chapter 14 §3 requires a
   *  share image on anything that can be linked. */
  @Prop({ type: PageSeoSchema, default: null })
  seo: PageSeo | null;

  /** Denormalized ← `publications` (ADR-0020), narrowed to two values. */
  @Prop({ type: String, enum: ARTICLE_PUBLICATION_STATES, required: true, default: 'Draft' })
  publicationState: ArticlePublicationState;

  /**
   * Hidden from the public feed without being deleted or retracted.
   *
   * A flag over a published item rather than a state beside `Live`: the item
   * stays published, keeps its URL and its publication row, and simply stops
   * appearing in the listing. `archivedAt` on BaseSchema is a different thing
   * entirely — that is soft deletion, and an article archived in *this* sense
   * is still a record the newsroom works with.
   */
  @Prop({ type: Boolean, required: true, default: false })
  archived: boolean;
}

export const ArticleSchema = SchemaFactory.createForClass(Article);

// One live article per slug. Partial on `archivedAt: null` so a soft-deleted
// article does not hold its slug hostage against a corrected replacement —
// the `pages.slug` precedent.
ArticleSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { archivedAt: null } });

// The public feed's exact filter and ordering, in one index: live, not
// hidden, newest first.
ArticleSchema.index({ publicationState: 1, archived: 1, publishDate: -1 });

// The same feed narrowed to one shelf — the homepage draws two such sections
// side by side, so this is the read the public site makes most often.
ArticleSchema.index({ category: 1, publicationState: 1, archived: 1, publishDate: -1 });
