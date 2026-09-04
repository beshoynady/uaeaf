import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { ClubsService } from './clubs.service.js';
import { CreateClubDto } from './dto/create-club.dto.js';

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
