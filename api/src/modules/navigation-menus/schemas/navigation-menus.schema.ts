import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema.js';

export type NavigationMenuDocument = HydratedDocument<NavigationMenu>;

export const NAVIGATION_MENU_LOCATIONS = ['Header', 'Footer'] as const;
export type NavigationMenuLocation = (typeof NAVIGATION_MENU_LOCATIONS)[number];

/** Implements: navigationMenus collection, Domain 11 — CMS & Page
 *  Composition (live FigJam Physical Model, re-read fresh 2026-09-03).
 *
 *  A named menu container; its entries live in `navigationItems`. `key` is
 *  a plain technical slug (e.g. "main-nav", "footer-quick-links"),
 *  deliberately NOT bilingual — verified per-field, not assumed. Unique,
 *  per the board.
 *
 *  Not workflow-governed and not a singleton (several menus coexist). */
@Schema({ collection: 'navigationMenus' })
export class NavigationMenu extends BaseSchema {
  @Prop({ required: true, unique: true, trim: true })
  key: string;

  @Prop({ type: String, enum: NAVIGATION_MENU_LOCATIONS, required: true })
  location: NavigationMenuLocation;
}

export const NavigationMenuSchema = SchemaFactory.createForClass(NavigationMenu);
