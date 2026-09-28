import { PartialType } from '@nestjs/swagger';
import { CreateNavigationMenuDto } from './create-navigation-menus.dto.js';

/** Request body for PATCH /navigation-menus/:id. Every field optional;
 *  omitting one leaves it unchanged. */
export class UpdateNavigationMenuDto extends PartialType(CreateNavigationMenuDto, { skipNullProperties: false }) {}
