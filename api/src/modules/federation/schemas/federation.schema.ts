import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../common/schemas/localized-text.schema.js';

export type FederationDocument = HydratedDocument<Federation>;

/** Lowercase on the live board — deliberately quoted verbatim rather than
 *  normalised to the PascalCase used by most other enums this week, per the
 *  "field values match the board exactly" standard. */
export const FEDERATION_STATUSES = ['active', 'archived'] as const;
export type FederationStatus = (typeof FEDERATION_STATUSES)[number];

/** Implements: federation collection, Domain 1 — Federation & Governance
 *  (live FigJam Physical Model, re-read fresh 2026-09-03).
 *
 *  `acronym` is a plain `String`, NOT bilingual — verified per-field on the
 *  board rather than assumed from the "every name-like field is bilingual"
 *  rule (confirmed decision #1's own counter-example).
 *
 *  `address`/`latitude`/`longitude` were added to the board 2026-09-03 and
 *  are implemented here, mirroring `clubs`/`venues`. `status` is described
 *  on the board as "precautionary — NOT currently tied to any active
 *  business logic"; no service logic reads it, matching that note.
 *
 *  NOT workflow-governed: no `publicationState`, and absent from both
 *  Domain 7 closed entity-type lists. Note the board lists no
 *  `archivedAt`/`archivedBy` for this one collection, unlike its siblings;
 *  `BaseSchema` supplies them uniformly here rather than special-casing a
 *  single collection out of the platform-wide soft-delete contract —
 *  flagged rather than silently treated as a board omission. */
@Schema({ collection: 'federation' })
export class Federation extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  name: LocalizedText;

  @Prop({ type: LocalizedTextSchema, default: null })
  shortName: LocalizedText | null;

  @Prop({ type: String, default: null })
  acronym: string | null;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', required: true })
  logoId: Types.ObjectId;

  @Prop({ type: LocalizedTextSchema, default: null })
  address: LocalizedText | null;

  @Prop({ type: Number, default: null })
  latitude: number | null;

  @Prop({ type: Number, default: null })
  longitude: number | null;

  @Prop({ type: String, default: null })
  registrationNumber: string | null;

  /** The board notes this is "only meaningful if registrationNumber is
   *  present", and that the dependency is explicitly NOT enforced at
   *  schema level — so no conditional validation is added here. */
  @Prop({ type: String, default: null })
  registrationAuthority: string | null;

  @Prop({ type: String, enum: FEDERATION_STATUSES, required: true })
  status: FederationStatus;
}

export const FederationSchema = SchemaFactory.createForClass(Federation);
