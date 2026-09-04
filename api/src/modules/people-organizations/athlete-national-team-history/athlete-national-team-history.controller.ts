import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { AthleteNationalTeamHistoryService } from './athlete-national-team-history.service.js';
import { CreateAthleteNationalTeamHistoryDto } from './dto/create-athlete-national-team-history.dto.js';

/** Implements: athleteNationalTeamHistory collection, Domain 2 — People & Organizations. */
@ApiTags('athlete-national-team-history')
@Controller('athlete-national-team-history')
export class AthleteNationalTeamHistoryController {
  constructor(private readonly service: AthleteNationalTeamHistoryService) {}

  @Post()
  @RequirePermission('athleteNationalTeamHistory', 'Create')
  create(@Body() dto: CreateAthleteNationalTeamHistoryDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('athleteNationalTeamHistory', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get('current/:athleteId')
  @RequirePermission('athleteNationalTeamHistory', 'Read')
  isCurrentlyOnNationalTeam(@Param('athleteId') athleteId: string) {
    return this.service.isCurrentlyOnNationalTeam(athleteId);
  }

  @Get(':id')
  @RequirePermission('athleteNationalTeamHistory', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Delete(':id')
  @RequirePermission('athleteNationalTeamHistory', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
