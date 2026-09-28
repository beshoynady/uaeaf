import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { FederationsService } from './federation.service.js';
import { CreateFederationDto } from './dto/create-federation.dto.js';
import { UpdateFederationDto } from './dto/update-federation.dto.js';

/** Implements: federation collection, Domain 1 — Federation & Governance. */
@ApiTags('federation')
@Controller('federation')
export class FederationsController {
  constructor(private readonly service: FederationsService) {}

  @Post()
  @RequirePermission('federation', 'Create')
  create(@Body() dto: CreateFederationDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('federation', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('federation', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @RequirePermission('federation', 'Update')
  update(@Param('id') id: string, @Body() dto: UpdateFederationDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('federation', 'Archive')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }

  /** See ADR-0120: not `:id/restore`, which is the revision restore. */
  @Post(':id/unarchive')
  @RequirePermission('federation', 'Restore')
  unarchive(@Param('id') id: string) {
    return this.service.unarchive(id);
  }
}
