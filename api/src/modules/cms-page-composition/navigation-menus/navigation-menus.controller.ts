import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { NavigationMenusService } from './navigation-menus.service.js';
import { CreateNavigationMenuDto } from './dto/create-navigation-menus.dto.js';

/** Implements: navigationMenus collection, Domain 11 — CMS & Page Composition. */
@ApiTags('navigation-menus')
@Controller('navigation-menus')
export class NavigationMenusController {
  constructor(private readonly service: NavigationMenusService) {}

  @Post()
  @RequirePermission('navigationMenus', 'Create')
  create(@Body() dto: CreateNavigationMenuDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('navigationMenus', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('navigationMenus', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Delete(':id')
  @RequirePermission('navigationMenus', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
