import { ApiProperty } from '@nestjs/swagger';
import { NAVIGATION_MENU_LOCATIONS } from '../schemas/navigation-menus.schema.js';
import type { NavigationMenuLocation } from '../schemas/navigation-menus.schema.js';

/** Public-safe `NavigationMenu` shape. A menu has no restricted fields, but
 *  gets an explicit DTO anyway (never the raw document) for the same
 *  "never return raw from a public path" discipline applied everywhere
 *  else. Resolves a stable `key` (e.g. "main-nav") to the `id`
 *  `navigation-items.controller.ts`'s `public/by-menu/:menuId` route
 *  needs — the missing link between a frontend that only knows menu keys
 *  and that existing by-ID route. */
export class NavigationMenuPublicResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() key: string;
  @ApiProperty({ enum: NAVIGATION_MENU_LOCATIONS }) location: NavigationMenuLocation;
}
