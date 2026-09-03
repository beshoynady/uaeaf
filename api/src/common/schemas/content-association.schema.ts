import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export const CONTENT_ASSOCIATION_OWNER_TYPES = ['championships', 'athletes', 'clubs', 'publicEvents'] as const;
export type ContentAssociationOwnerType = (typeof CONTENT_ASSOCIATION_OWNER_TYPES)[number];

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
}

export const ContentAssociationSchema = SchemaFactory.createForClass(ContentAssociation);
