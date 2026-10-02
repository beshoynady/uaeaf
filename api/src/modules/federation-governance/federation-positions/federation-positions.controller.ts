import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { FederationPositionsService } from './federation-positions.service.js';
import { CreateFederationPositionDto } from './dto/create-federation-positions.dto.js';
import { UpdateFederationPositionDto } from './dto/update-federation-positions.dto.js';

/** Implements: federationPositions collection, Domain 1 — Federation &
 *  Governance. No public route: positions reach the site only through the
 *  aggregates built on top of them. */
@ApiTags('federation-positions')
@Controller('federation-positions')
export class FederationPositionsController {
  constructor(private readonly service: FederationPositionsService) {}

  @Post()
  @RequirePermission('federationPositions', 'Create')
  create(@Body() dto: CreateFederationPositionDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('federationPositions', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('federationPositions', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @RequirePermission('federationPositions', 'Update')
  update(@Param('id') id: string, @Body() dto: UpdateFederationPositionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('federationPositions', 'Archive')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.archive(id, new Types.ObjectId(user.userId));
  }

  /** See ADR-0120: not `:id/restore`, which is the revision restore. */
  @Post(':id/unarchive')
  @RequirePermission('federationPositions', 'Restore')
  unarchive(@Param('id') id: string) {
    return this.service.restore(id);
  }
}
