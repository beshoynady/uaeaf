import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import { PERMISSION_RESOURCES } from '../../../../common/constants/permission-resources.js';
import type { PermissionResource } from '../../../../common/constants/permission-resources.js';

export type PermissionDocument = HydratedDocument<Permission>;

/**
 * The verbs a permission may name (ADR-0103).
 *
 * `Delete` was renamed `Archive`: every repository implements "delete" as
 * `archivedAt`, so the permission called Delete granted archival — a name an
 * administrator reading the role screen could not believe. `HardDelete` and
 * `EditProtectedData` were removed: zero resources used either, which is the dead
 * configuration `PERMISSION_RESOURCES` exists to prevent.
 *
 * `CAPABILITY_MAP` decides which of these each resource actually offers; this
 * list is only the vocabulary.
 */
export const PERMISSION_ACTIONS = [
  'Read',
  'Create',
  'Update',
  // Soft delete — `archivedAt`. What `Delete` always did.
  'Archive',
  'Restore',
  // The destructive verb that did not exist. Offered only where the capability
  // map says `purgeable`, refused while the record is published or referenced,
  // and behind step-up.
  'PermanentDelete',
  // Bulk extraction to a file, separate from `Read` by owner decision
  // (2026-09-08): reading a page of records on screen and pulling the whole
  // collection into a file that leaves the platform are different
  // decisions. The approved IA separates them the same way — Export Centre
  // is its own screen, at a lower priority than the registries it drains.
  'Export',
  'Print',
  // Seeing the `Restricted` / `Sensitive-Minor` fields of a resource (Chapter 17
  // §1), on screen and in a file. Without it those fields are absent, not null.
  'ViewSensitive',
  'Publish',
  'Approve',
  // Aggregate figures for a product group, without the records behind them.
  'ViewReports',
  // Administrative verbs. Each is attached to the resource it governs rather
  // than to a pseudo-resource, so the guard needs no new shape.
  'ManageRoles',
  'AssignRoles',
  'ViewAuditLog',
  'ManageSecuritySettings',
] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

/** Implements: permissions collection, Domain 8 — Platform Administration
 *  (FigJam node 103:7901, re-read fresh 2026-09-03 — `name` corrected from
 *  plain String to bilingual `{en,ar}`: it's the human-readable label shown
 *  in the dashboard's role/permission management UI (e.g. "Delete
 *  Articles" / "حذف المقالات"), distinct from `resourceType`/`action`,
 *  which remain plain technical identifiers, not display text). */
@Schema({ collection: 'permissions', timestamps: true })
export class Permission extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  name: LocalizedText;

  /** Constrained to the known resource list (2026-09-07). Previously a
   *  free-form String, which let a typo'd resource save successfully and
   *  then gate nothing — a permission that looks granted but grants
   *  nothing. See `PERMISSION_RESOURCES`. */
  @Prop({ required: true, type: String, enum: PERMISSION_RESOURCES })
  resourceType: PermissionResource;

  @Prop({ required: true, type: String, enum: PERMISSION_ACTIONS })
  action: PermissionAction;

  /** A5 — editorial content only. `null` on every administrative resource, which
   *  compares as width 0 on both sides of `holdsPair` and so is a no-op there. */
  @Prop({ type: String, enum: ['own', 'all'], default: null })
  scope: 'own' | 'all' | null;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
