import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { VenuesService } from './venues.service.js';
import { CreateVenueDto } from './dto/create-venue.dto.js';
import { UpdateVenueDto } from './dto/update-venue.dto.js';

/** Implements: venues collection, Domain 2 — People & Organizations. */
@ApiTags('venues')
@Controller('venues')
export class VenuesController {
  constructor(private readonly service: VenuesService) {}

  @Post()
  @RequirePermission('venues', 'Create')
  create(@Body() dto: CreateVenueDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('venues', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('venues', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @RequirePermission('venues', 'Update')
  update(@Param('id') id: string, @Body() dto: UpdateVenueDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('venues', 'Archive')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }

  /** See ADR-0120: not `:id/restore`, which is the revision restore. */
  @Post(':id/unarchive')
  @RequirePermission('venues', 'Restore')
  unarchive(@Param('id') id: string) {
    return this.service.unarchive(id);
  }
}
