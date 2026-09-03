import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface.js';
import { ElectionCyclesService } from './election-cycles.service.js';
import { CreateElectionCycleDto } from './dto/create-election-cycles.dto.js';

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

  @Delete(':id')
  @RequirePermission('electionCycles', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
