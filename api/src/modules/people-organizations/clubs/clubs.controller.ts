import { Body, Controller, Delete, Get, Header, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { ClubsService } from './clubs.service.js';
import { CreateClubDto } from './dto/create-club.dto.js';
import { ClubPublicListResponseDto } from './dto/club-public-response.dto.js';

/** Implements: clubs collection, Domain 2 — People & Organizations. */
@ApiTags('clubs')
@Controller('clubs')
export class ClubsController {
  constructor(private readonly service: ClubsService) {}

  @Post()
  @RequirePermission('clubs', 'Create')
  create(@Body() dto: CreateClubDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('clubs', 'Read')
  findAll() {
    return this.service.findAll();
  }

  /** Public club listing — active clubs only, and only `name`, `slug` and
   *  `logoId`. Declared before `:id` because Nest matches in declaration
   *  order, and a later literal route would be swallowed as an id.
   *
   *  Added for the albums club filter: an album records `clubIds[]`, and
   *  without this a visitor would be offered a filter whose options nothing
   *  could name. */
  @Get('public')
  @Public()
  @ApiOkResponse({ type: ClubPublicListResponseDto })
  findAllPublic(@Query() query: PaginationQueryDto) {
    return this.service.findAllPublic(query.page, query.limit);
  }

  /** Before `:id` — Nest matches in declaration order. */
  @Get('export')
  @RequirePermission('clubs', 'Export')
  @Header('content-type', 'text/csv; charset=utf-8')
  @Header('content-disposition', 'attachment; filename="clubs.csv"')
  exportCsv() {
    return this.service.exportCsv();
  }

  @Get(':id')
  @RequirePermission('clubs', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Delete(':id')
  @RequirePermission('clubs', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
