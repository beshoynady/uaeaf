import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { AgeCategoriesService } from './age-categories.service.js';
import { CreateAgeCategoryDto } from './dto/create-age-category.dto.js';
import { UpdateAgeCategoryDto } from './dto/update-age-category.dto.js';

/** Implements: ageCategories collection, Domain 3 (partial). */
@ApiTags('age-categories')
@Controller('age-categories')
export class AgeCategoriesController {
  constructor(private readonly service: AgeCategoriesService) {}

  @Post()
  @RequirePermission('ageCategories', 'Create')
  create(@Body() dto: CreateAgeCategoryDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('ageCategories', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('ageCategories', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @RequirePermission('ageCategories', 'Update')
  update(@Param('id') id: string, @Body() dto: UpdateAgeCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('ageCategories', 'Archive')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }

  /** See ADR-0120: not `:id/restore`, which is the revision restore. */
  @Post(':id/unarchive')
  @RequirePermission('ageCategories', 'Restore')
  unarchive(@Param('id') id: string) {
    return this.service.unarchive(id);
  }
}
