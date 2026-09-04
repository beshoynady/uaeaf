import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema.js';

export type AuditLogDocument = HydratedDocument<AuditLog>;

export const AUDIT_ACTIONS = [
  'Create',
  'Update',
  'Delete',
  'HardDelete',
  'StatusChange',
  'AccessDenied',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/**
 * Implements: auditLogs collection, Domain 7 (FigJam node 100:7778,
 * re-read fresh 2026-09-02). `AccessDenied` was added to the live `action`
 * enum 2026-09-02 (alongside Create/Update/Delete/HardDelete/StatusChange);
 * PermissionsGuard now writes here on every denial — see
 * `permissions.guard.ts`.
 *
 * `entityId` was made explicitly optional on the live board the same day
 * (2026-09-02): `null` means "this AccessDenied concerns a resource/action
 * in general (a collection-level route, e.g. GET /users or POST /roles),
 * not one specific record." `entityType` is required only when `entityId`
 * is set, matching the board's conditional constraint.
 *
 * `entityType`'s exact closed enum values were not fully captured from the
 * board's Notes cell (it says "String enum [RESTRICTED]" with no value list
 * shown, unlike e.g. workflowDefinitions.entityType which explicitly says
 * "closed list — see domain note"). Left as a plain String rather than
 * guessing a value list not in evidence — revisit once that domain note is
 * located.
 */
@Schema({ collection: 'auditLogs' })
export class AuditLog extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  actorId: Types.ObjectId;

  @Prop({ type: String, enum: AUDIT_ACTIONS, required: true })
  action: AuditAction;

  @Prop({
    type: String,
    required: function (this: AuditLog): boolean {
      return this.entityId != null;
    },
  })
  entityType: string;

  @Prop({ type: Types.ObjectId, default: null })
  entityId: Types.ObjectId | null;

  @Prop({ type: Date, required: true, default: Date.now })
  timestamp: Date;

  @Prop({ type: Object, default: null })
  previousValue: Record<string, unknown> | null;

  @Prop({ type: Object, default: null })
  newValue: Record<string, unknown> | null;

  @Prop({ type: String, default: null })
  reason: string | null;

  @Prop()
  ipAddress: string;

  @Prop()
  userAgent: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
// Per-record audit trail ("history for this record") and per-actor
// activity ("what did this user do") — the two named query patterns this
// collection exists to serve (docs/product/06-Database-Architecture.md
// §11; schema-audit-2026-09-04.md §3.2/§7, P1 finding).
AuditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
AuditLogSchema.index({ actorId: 1, timestamp: -1 });
