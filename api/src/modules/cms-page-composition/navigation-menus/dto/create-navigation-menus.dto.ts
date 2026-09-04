import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';
import { NAVIGATION_MENU_LOCATIONS } from '../schemas/navigation-menus.schema.js';
import type { NavigationMenuLocation } from '../schemas/navigation-menus.schema.js';

/** Request body for POST /navigation-menus. */
export class CreateNavigationMenuDto {
  @ApiProperty({ description: 'Unique technical key, e.g. "main-nav".' })
  @IsString()
  @MinLength(1)
  key: string;

  @ApiProperty({ enum: NAVIGATION_MENU_LOCATIONS })
  @IsIn(NAVIGATION_MENU_LOCATIONS)
  location: NavigationMenuLocation;
}
