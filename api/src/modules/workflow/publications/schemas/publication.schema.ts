import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { PUBLICATION_ENTITY_TYPES } from '../../../../common/constants/workflow-entity-types.js';
import type { PublicationEntityType } from '../../../../common/constants/workflow-entity-types.js';

export type PublicationDocument = HydratedDocument<Publication>;

export const PUBLICATION_STATUSES = ['Live', 'Unpublished', 'Archived'] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

/** Implements: publications collection, Domain 7 (FigJam node `100:7671`,
 *  re-read fresh 2026-09-02). `status` is 3-valued on the live board —
 *  `Live | Unpublished | Archived`, no `Draft` — a publications row is
 *  only ever created once an entity actually reaches Live (see
 *  `WorkflowInstancesService`'s final-step-approval logic); `Draft` lives
 *  only on the entity's own `publicationState`, before any `publications`
 *  row exists. `Unpublished` is temporary/reversible (no new approval
 *  cycle needed to return to Live); `Archived` is permanent.
 *
 *  Confirmed invariant (2026-09-03): at most one `Live` row exists per
 *  (entityType, entityId) at any time — `PublicationsRepository.createLive()`
 *  atomically retires any prior `Live` row to `Archived` before inserting
 *  the new one. */
@Schema({ collection: 'publications' })
export class Publication extends BaseSchema {
  @Prop({ type: String, enum: PUBLICATION_ENTITY_TYPES, required: true })
  entityType: PublicationEntityType;

  @Prop({ type: Types.ObjectId, required: true })
  entityId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Revision', required: true })
  revisionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'WorkflowInstance', default: null })
  workflowInstanceId: Types.ObjectId | null;

  @Prop({ type: Date, required: true, default: Date.now })
  publishedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  publishedBy: Types.ObjectId;

  @Prop({ type: String, enum: PUBLICATION_STATUSES, required: true, default: 'Live' })
  status: PublicationStatus;
}

export const PublicationSchema = SchemaFactory.createForClass(Publication);
// Covers findLive()'s {entityType, entityId, status:'Live'} filter and
// createLive()'s retire-previous-Live updateMany with the same shape.
PublicationSchema.index({ entityType: 1, entityId: 1, status: 1 });
