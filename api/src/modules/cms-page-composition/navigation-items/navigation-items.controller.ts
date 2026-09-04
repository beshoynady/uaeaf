import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { NavigationItemsService } from './navigation-items.service.js';
import { CreateNavigationItemDto, SetParentItemDto } from './dto/create-navigation-items.dto.js';

/** Implements: navigationItems collection, Domain 11 — CMS & Page Composition. */
@ApiTags('navigation-items')
@Controller('navigation-items')
export class NavigationItemsController {
  constructor(private readonly service: NavigationItemsService) {}

  @Post()
  @RequirePermission('navigationItems', 'Create')
  create(@Body() dto: CreateNavigationItemDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('navigationItems', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('navigationItems', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  /** Public navigation read — the active items of one menu. Navigation is
   *  site furniture with no publicationState gate. */
  @Get('public/by-menu/:menuId')
  @Public()
  findByMenu(@Param('menuId') menuId: string) {
    return this.service.findByMenu(menuId);
  }

  /** Re-parents an item, rejecting self-parenting and cyclic moves. */
  @Patch(':id/parent')
  @RequirePermission('navigationItems', 'Update')
  setParent(@Param('id') id: string, @Body() dto: SetParentItemDto) {
    return this.service.setParent(id, dto);
  }

  @Delete(':id')
  @RequirePermission('navigationItems', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
