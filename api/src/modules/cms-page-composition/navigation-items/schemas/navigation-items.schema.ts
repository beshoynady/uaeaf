import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';

export type NavigationItemDocument = HydratedDocument<NavigationItem>;

/** Implements: navigationItems collection, Domain 11 — CMS & Page
 *  Composition (live FigJam Physical Model, re-read fresh 2026-09-03).
 *
 *  One entry in a `navigationMenus` menu. `parentItemId` is a
 *  self-reference supporting dropdown/flyout nesting — like
 *  `organizationalStructure.parentNodeId`, Mongoose enforces nothing about
 *  cycles, so `NavigationItemsService.setParent()` performs the same
 *  ancestor-walk check. `url` is a plain internal route string (e.g.
 *  "/athletes"), deliberately not bilingual.
 *
 *  Not workflow-governed; `isActive` here is a plain admin toggle with no
 *  publication semantics. */
@Schema({ collection: 'navigationItems' })
export class NavigationItem extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'NavigationMenu', required: true })
  menuId: Types.ObjectId;

  @Prop({ type: LocalizedTextSchema, required: true })
  label: LocalizedText;

  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: Types.ObjectId, ref: 'NavigationItem', default: null })
  parentItemId: Types.ObjectId | null;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const NavigationItemSchema = SchemaFactory.createForClass(NavigationItem);
