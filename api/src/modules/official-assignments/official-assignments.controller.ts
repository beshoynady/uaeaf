import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface.js';
import { OfficialAssignmentsService } from './official-assignments.service.js';
import { CreateOfficialAssignmentDto } from './dto/create-official-assignment.dto.js';

/** Implements: officialAssignments collection, Domain 2 — People & Organizations. */
@ApiTags('official-assignments')
@Controller('official-assignments')
export class OfficialAssignmentsController {
  constructor(private readonly service: OfficialAssignmentsService) {}

  @Post()
  @RequirePermission('officialAssignments', 'Create')
  create(@Body() dto: CreateOfficialAssignmentDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('officialAssignments', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('officialAssignments', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Delete(':id')
  @RequirePermission('officialAssignments', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
