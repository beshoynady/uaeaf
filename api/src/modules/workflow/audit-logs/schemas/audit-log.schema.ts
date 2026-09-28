import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';

export type AuditLogDocument = HydratedDocument<AuditLog>;

export const AUDIT_ACTIONS = [
  'Create',
  'Update',
  // Kept exactly as it is: rows written before the Delete→Archive rename
  // (ADR-0103) carry it, the log is append-only, and it must stay readable.
  // Nothing writes it going forward: every `@Delete()` route's EFFECTIVE
  // audit action is one of `Archive`/`Restore`/`PermanentDelete` below —
  // derived from its own permission for 47 of 49 routes, and named
  // explicitly via `@AuditEntity({ action })` for the 2 whose permission
  // verb cannot say (`DELETE /roles/:id`, guarded by the merged
  // `roles:ManageRoles`; `DELETE /albums/:id/photos/:photoId`, whose own
  // entity — the album — is only updated, not deleted). Both measured and
  // fixed 2026-09-27 (independent review, round 4) after the first version
  // of this claim proved false: `DELETE /roles/:id` logged `Delete` for one
  // round, indistinguishable from the one true destruction, because
  // `roles:ManageRoles` is not in the three-verb override set.
  'Delete',
  /** @deprecated Never written — grep found no occurrence outside this
   *  declaration and one doc comment in `revisions.service.ts`. Kept in the
   *  vocabulary, rather than removed, only because removing a value from a
   *  closed enum a stored row might still reference is a migration decision,
   *  not a cleanup; `audit-log.interceptor.spec.ts` asserts nothing writes
   *  it, so it stays provably dead. */
  'HardDelete',
  'StatusChange',
  'AccessDenied',
  // Owner decision 2026-09-27, closing the gap the Delete→Archive rename
  // (ADR-0103) left in the audit trail: `AuditLogInterceptor` derived its
  // value from the HTTP method alone, so after the rename every one of the
  // 48 archive routes still logged `Delete`, the one real destruction
  // (`DELETE /media-assets/:id/object`) logged the same value as a
  // reversible archive, and `@Post(':id/restore')` logged `Create` — a
  // restore reading as a brand-new record. `AuditLogInterceptor.auditActionFor`
  // now derives these three from the route's own `@RequirePermission`
  // action instead of the HTTP method, so the audit screen and the role
  // screen use the same word for the same act.
  'Archive',
  'Restore',
  'PermanentDelete',
  // Task 5 addendum (owner, 2026-09-27): appointing or revoking the Super
  // Admin role is its own recorded security event rather than an ordinary
  // `Update` row — ADR-0104/0105 exist because that one change matters more
  // than any other role edit, and the trail should say so by name rather
  // than being reconstructed later from a generic row's `newValue`.
  // PascalCase, matching the other actions, rather than the camelCase the
  // owner's message used — a closed enum's own consistency outweighs
  // matching a sentence; flagged here for the owner to overrule if wanted.
  'SuperAdminGranted',
  'SuperAdminRevoked',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/**
 * The subset of `AUDIT_ACTIONS` a security-events view filters to.
 *
 * Named once, here, beside the vocabulary it is a subset of — so a fifth
 * security-relevant action added later has to be added to (or knowingly left
 * out of) this list at the same time it joins `AUDIT_ACTIONS`, rather than the
 * two lists drifting apart the way `AccessDenied` sat alone for years with no
 * sibling and no name for the category it belonged to. `PermanentDelete`
 * joins it here too (2026-09-27): an irreversible destruction is exactly the
 * kind of row a security-events view exists to surface.
 */
export const SECURITY_AUDIT_ACTIONS = [
  'AccessDenied',
  'SuperAdminGranted',
  'SuperAdminRevoked',
  'PermanentDelete',
] as const;

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
@Schema({ collection: 'auditLogs', timestamps: true })
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
