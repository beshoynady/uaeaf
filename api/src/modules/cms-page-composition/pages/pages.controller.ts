import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { PagesService } from './pages.service.js';
import { CreatePageDto } from './dto/create-pages.dto.js';

/** Implements: pages collection, Domain 11 — CMS & Page Composition. */
@ApiTags('pages')
@Controller('pages')
export class PagesController {
  constructor(private readonly service: PagesService) {}

  @Post()
  @RequirePermission('pages', 'Create')
  create(@Body() dto: CreatePageDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('pages', 'Read')
  findAll() {
    return this.service.findAll();
  }

  /** Public routing lookup by slug. Only a `Published` page resolves;
   *  a Draft or unknown slug returns null so the caller 404s. */
  @Get('public/:slug')
  @Public()
  findPublishedBySlug(@Param('slug') slug: string) {
    return this.service.findPublishedBySlug(slug);
  }

  @Get(':id')
  @RequirePermission('pages', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Delete(':id')
  @RequirePermission('pages', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
