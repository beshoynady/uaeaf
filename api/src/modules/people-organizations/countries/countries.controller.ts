import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { CountriesService } from './countries.service.js';
import { CreateCountryDto } from './dto/create-country.dto.js';
import { UpdateCountryDto } from './dto/update-country.dto.js';

/** Implements: countries collection, Domain 2 — People & Organizations. */
@ApiTags('countries')
@Controller('countries')
export class CountriesController {
  constructor(private readonly service: CountriesService) {}

  @Post()
  @RequirePermission('countries', 'Create')
  create(@Body() dto: CreateCountryDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('countries', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('countries', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @RequirePermission('countries', 'Update')
  update(@Param('id') id: string, @Body() dto: UpdateCountryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('countries', 'Archive')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }

  /** See ADR-0120: not `:id/restore`, which is the revision restore. */
  @Post(':id/unarchive')
  @RequirePermission('countries', 'Restore')
  unarchive(@Param('id') id: string) {
    return this.service.unarchive(id);
  }
}
