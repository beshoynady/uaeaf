import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../common/schemas/localized-text.schema.js';

export type RoleDocument = HydratedDocument<Role>;

/** Implements: roles collection, Domain 8 — Platform Administration
 *  (FigJam node 103:7869, re-read fresh 2026-09-03 — `name` corrected from
 *  plain String to bilingual `{en,ar}`: the admin dashboard fully supports
 *  both languages, so every name/label field a user sees, including purely
 *  administrative ones, must be bilingual, not just public-website
 *  editorial content. isSystemRole confirmed present, added 2026-09-02 to
 *  close ADR-tracked admin gap). */
@Schema({ collection: 'roles' })
export class Role extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  name: LocalizedText;

  @Prop({ type: [Types.ObjectId], ref: 'Permission', default: [] })
  permissionIds: Types.ObjectId[];

  /** True for RBAC-critical seeded roles (e.g. Super Admin). RolesService
   *  blocks rename/delete while this is true — see RolesService. */
  @Prop({ type: Boolean, default: false })
  isSystemRole: boolean;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
