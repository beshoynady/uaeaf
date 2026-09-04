import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export const CONTENT_ASSOCIATION_OWNER_TYPES = ['championships', 'athletes', 'clubs', 'publicEvents'] as const;
export type ContentAssociationOwnerType = (typeof CONTENT_ASSOCIATION_OWNER_TYPES)[number];

/** `ownerType` is already the camelCase Mongoose collection name convention
 *  (`workflowInstances`/`revisions`/`publications` use the same style) —
 *  confirmed correct as-is during the 2026-09-04 media-gallery hardening
 *  pass. NOT to be confused with `documents.ownerType`, which uses PascalCase
 *  display labels (`'Championship'`, `'Club'`, ...) — that is a pre-existing
 *  divergent convention on a different schema, not a pattern to copy here. */
export const CONTENT_ASSOCIATION_ROLES = ['Primary', 'Featured', 'Related'] as const;
export type ContentAssociationRole = (typeof CONTENT_ASSOCIATION_ROLES)[number];

/** One `{ ownerType, ownerId }` entry in an `associations[]` array — shared
 *  shape across `albums.associations` and `videos.associations` on the live
 *  FigJam board: the context (championship/publicEvent + athletes/clubs) a
 *  media item carries, so it lives here rather than being hand-rolled per
 *  schema. `championships` is not built this week (Domain 3 out of scope)
 *  — `ownerId` stays a plain `ObjectId` poly ref, no `ref:` to a
 *  not-yet-registered model. Not a standalone collection: `_id: false`. */
@Schema({ _id: false })
export class ContentAssociation {
  @Prop({ type: String, enum: CONTENT_ASSOCIATION_OWNER_TYPES, required: true })
  ownerType: ContentAssociationOwnerType;

  @Prop({ type: Types.ObjectId, required: true })
  ownerId: Types.ObjectId;

  /** How this media item relates to the owner — e.g. the `Primary` photo
   *  of an athlete vs. one merely `Related` to them. Defaults to `Related`
   *  so pre-existing associations (written before this field existed)
   *  read as the least presumptuous value rather than implying special
   *  significance they were never given. */
  @Prop({ type: String, enum: CONTENT_ASSOCIATION_ROLES, default: 'Related' })
  role: ContentAssociationRole;

  /** Manual sort position among an owner's associations sharing the same
   *  `role` (e.g. ordering an athlete's `Related` gallery). Not a global
   *  ordering across all of `associations[]`. */
  @Prop({ type: Number, default: 0 })
  displayOrder: number;
}

export const ContentAssociationSchema = SchemaFactory.createForClass(ContentAssociation);
