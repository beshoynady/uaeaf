import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../common/schemas/localized-text.schema.js';

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
] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

/** Implements: permissions collection, Domain 8 — Platform Administration
 *  (FigJam node 103:7901, re-read fresh 2026-09-03 — `name` corrected from
 *  plain String to bilingual `{en,ar}`: it's the human-readable label shown
 *  in the dashboard's role/permission management UI (e.g. "Delete
 *  Articles" / "حذف المقالات"), distinct from `resourceType`/`action`,
 *  which remain plain technical identifiers, not display text). */
@Schema({ collection: 'permissions' })
export class Permission extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  name: LocalizedText;

  @Prop({ required: true })
  resourceType: string;

  @Prop({ required: true, type: String, enum: PERMISSION_ACTIONS })
  action: PermissionAction;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
