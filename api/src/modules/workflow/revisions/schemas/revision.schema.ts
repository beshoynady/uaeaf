import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { PUBLICATION_ENTITY_TYPES } from '../../../../common/constants/workflow-entity-types.js';
import type { PublicationEntityType } from '../../../../common/constants/workflow-entity-types.js';

export type RevisionDocument = HydratedDocument<Revision>;

/**
 * Implements: revisions collection, Domain 7 (FigJam node `100:7620`,
 * re-read fresh 2026-09-02). Deliberately does NOT extend `BaseSchema` —
 * unique among all Domain 7/8 collections, `revisions` has no
 * `updatedAt`/`updatedBy`/`archivedAt`/`archivedBy` fields on the live
 * board at all. This is a structural immutability signal, not an
 * oversight: a `revisions` row, once created, has no field through which
 * application code could edit or archive it. `RevisionsService` never
 * exposes an update or delete method — see its own file header.
 *
 * `entityId` is polymorphic across the 12-type "revision/publication"
 * list (List B — `contactMessages` excluded, see
 * `common/constants/workflow-entity-types.ts`).
 */
@Schema({ collection: 'revisions', timestamps: { createdAt: 'createdAt', updatedAt: false } })
export class Revision {
  @Prop({ type: String, enum: PUBLICATION_ENTITY_TYPES, required: true })
  entityType: PublicationEntityType;

  @Prop({ type: Types.ObjectId, required: true })
  entityId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  versionNumber: number;

  @Prop({ type: Object, required: true })
  snapshotData: Record<string, unknown>;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const RevisionSchema = SchemaFactory.createForClass(Revision);
RevisionSchema.index({ entityType: 1, entityId: 1 });
