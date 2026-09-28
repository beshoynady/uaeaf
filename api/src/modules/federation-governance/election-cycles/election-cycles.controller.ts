import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { ElectionCyclesService } from './election-cycles.service.js';
import { CreateElectionCycleDto } from './dto/create-election-cycles.dto.js';
import { UpdateElectionCycleDto } from './dto/update-election-cycles.dto.js';

/** Implements: electionCycles collection, Domain 1 — Federation & Governance. */
@ApiTags('election-cycles')
@Controller('election-cycles')
export class ElectionCyclesController {
  constructor(private readonly service: ElectionCyclesService) {}

  @Post()
  @RequirePermission('electionCycles', 'Create')
  create(@Body() dto: CreateElectionCycleDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('electionCycles', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('electionCycles', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @RequirePermission('electionCycles', 'Update')
  update(@Param('id') id: string, @Body() dto: UpdateElectionCycleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('electionCycles', 'Archive')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }

  /** See ADR-0120: not `:id/restore`, which is the revision restore. */
  @Post(':id/unarchive')
  @RequirePermission('electionCycles', 'Restore')
  unarchive(@Param('id') id: string) {
    return this.service.unarchive(id);
  }
}
