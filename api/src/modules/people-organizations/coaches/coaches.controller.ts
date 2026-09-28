import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { CoachesService } from './coaches.service.js';
import { CreateCoachDto } from './dto/create-coach.dto.js';
import { UpdateCoachDto } from './dto/update-coach.dto.js';

/** Implements: coaches collection, Domain 2 — People & Organizations. */
@ApiTags('coaches')
@Controller('coaches')
export class CoachesController {
  constructor(private readonly service: CoachesService) {}

  @Post()
  @RequirePermission('coaches', 'Create')
  create(@Body() dto: CreateCoachDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('coaches', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('coaches', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @RequirePermission('coaches', 'Update')
  update(@Param('id') id: string, @Body() dto: UpdateCoachDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('coaches', 'Archive')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }

  /** See ADR-0120: not `:id/restore`, which is the revision restore. */
  @Post(':id/unarchive')
  @RequirePermission('coaches', 'Restore')
  unarchive(@Param('id') id: string) {
    return this.service.unarchive(id);
  }
}
