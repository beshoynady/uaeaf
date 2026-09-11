import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import { PERMISSION_RESOURCES } from '../../../../common/constants/permission-resources.js';
import type { PermissionResource } from '../../../../common/constants/permission-resources.js';

export type PermissionDocument = HydratedDocument<Permission>;

export const PERMISSION_ACTIONS = [
  'Create',
  'Read',
  'Update',
  'Delete',
  'HardDelete',
  'Approve',
  'Publish',
  'EditProtectedData',
  // Bulk extraction to a file, separate from `Read` by owner decision
  // (2026-09-08): reading a page of records on screen and pulling the whole
  // collection into a file that leaves the platform are different
  // decisions. The approved IA separates them the same way — Export Centre
  // is its own screen, at a lower priority than the registries it drains.
  'Export',
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
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
