import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { PageSectionsService } from './page-sections.service.js';
import { CreatePageSectionDto } from './dto/create-page-sections.dto.js';
import { UpdatePageSectionDto } from './dto/update-page-sections.dto.js';
import { PageSectionPublicResponseDto } from './dto/page-section-public-response.dto.js';

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
  @ApiOkResponse({ type: [PageSectionPublicResponseDto] })
  findPublicByPage(@Param('pageId') pageId: string) {
    return this.service.findPublicByPage(pageId);
  }

  /** The editor's read of one page: disabled and out-of-window sections
   *  included. Declared ahead of `GET :id` so `by-page` is never read as an
   *  id, the same ordering rule `public` follows. */
  @Get('by-page/:pageId')
  @RequirePermission('pageSections', 'Read')
  findByPage(@Param('pageId') pageId: string) {
    return this.service.findByPage(pageId);
  }

  @Get(':id')
  @RequirePermission('pageSections', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @RequirePermission('pageSections', 'Update')
  update(@Param('id') id: string, @Body() dto: UpdatePageSectionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('pageSections', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
