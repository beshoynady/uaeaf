import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { ClubTeamsService } from './club-teams.service.js';
import { CreateClubTeamDto } from './dto/create-club-team.dto.js';

/** Implements: clubTeams collection, Domain 2 — People & Organizations. */
@ApiTags('club-teams')
@Controller('club-teams')
export class ClubTeamsController {
  constructor(private readonly service: ClubTeamsService) {}

  @Post()
  @RequirePermission('clubTeams', 'Create')
  create(@Body() dto: CreateClubTeamDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('clubTeams', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('clubTeams', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Delete(':id')
  @RequirePermission('clubTeams', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
