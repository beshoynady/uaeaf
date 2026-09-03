import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface.js';
import { AthleteGuardianRelationshipsService } from './athlete-guardian-relationships.service.js';
import { CreateAthleteGuardianRelationshipDto } from './dto/create-athlete-guardian-relationship.dto.js';

/** Implements: athleteGuardianRelationships collection, Domain 2 — People & Organizations. */
@ApiTags('athlete-guardian-relationships')
@Controller('athlete-guardian-relationships')
export class AthleteGuardianRelationshipsController {
  constructor(private readonly service: AthleteGuardianRelationshipsService) {}

  @Post()
  @RequirePermission('athleteGuardianRelationships', 'Create')
  create(@Body() dto: CreateAthleteGuardianRelationshipDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('athleteGuardianRelationships', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('athleteGuardianRelationships', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Delete(':id')
  @RequirePermission('athleteGuardianRelationships', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
