import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { OfficialsService } from './officials.service.js';
import { CreateOfficialDto } from './dto/create-official.dto.js';

/** Implements: officials collection, Domain 2 — People & Organizations. */
@ApiTags('officials')
@Controller('officials')
export class OfficialsController {
  constructor(private readonly service: OfficialsService) {}

  @Post()
  @RequirePermission('officials', 'Create')
  create(@Body() dto: CreateOfficialDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('officials', 'Read')
  findAll() {
    return this.service.findAll();
  }

  /** Public official listing — public-safe shape only. Paginated via
   *  `page`/`limit` query params (2026-09-04, public-routes closure). */
  @Get('public')
  @Public()
  findAllPublic(@Query() query: PaginationQueryDto) {
    return this.service.findAllPublic(query.page, query.limit);
  }

  @Get(':id')
  @RequirePermission('officials', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Delete(':id')
  @RequirePermission('officials', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
