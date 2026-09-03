import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface.js';
import { PageSectionsService } from './page-sections.service.js';
import { CreatePageSectionDto } from './dto/create-page-sections.dto.js';

/** Implements: pageSections collection, Domain 11 — CMS & Page Composition. */
@ApiTags('page-sections')
@Controller('page-sections')
export class PageSectionsController {
  constructor(private readonly service: PageSectionsService) {}

  @Post()
  @RequirePermission('pageSections', 'Create')
  create(@Body() dto: CreatePageSectionDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('pageSections', 'Read')
  findAll() {
    return this.service.findAll();
  }

  /** Public composition read: the enabled, Everyone-visible sections of
   *  one page that are inside their visibleFrom/visibleUntil window, in
   *  displayOrder. */
  @Get('public/by-page/:pageId')
  @Public()
  findPublicByPage(@Param('pageId') pageId: string) {
    return this.service.findPublicByPage(pageId);
  }

  @Get(':id')
  @RequirePermission('pageSections', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Delete(':id')
  @RequirePermission('pageSections', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
