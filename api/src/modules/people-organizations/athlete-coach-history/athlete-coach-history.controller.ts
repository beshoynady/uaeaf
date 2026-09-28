import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { AthleteCoachHistoryService } from './athlete-coach-history.service.js';
import { CreateAthleteCoachHistoryDto } from './dto/create-athlete-coach-history.dto.js';
import { UpdateAthleteCoachHistoryDto } from './dto/update-athlete-coach-history.dto.js';

/** Implements: athleteCoachHistory collection, Domain 2 — People & Organizations. */
@ApiTags('athlete-coach-history')
@Controller('athlete-coach-history')
export class AthleteCoachHistoryController {
  constructor(private readonly service: AthleteCoachHistoryService) {}

  @Post()
  @RequirePermission('athleteCoachHistory', 'Create')
  create(@Body() dto: CreateAthleteCoachHistoryDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('athleteCoachHistory', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get('current/:athleteId')
  @RequirePermission('athleteCoachHistory', 'Read')
  getCurrentCoach(@Param('athleteId') athleteId: string) {
    return this.service.getCurrentCoach(athleteId);
  }

  @Get(':id')
  @RequirePermission('athleteCoachHistory', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @RequirePermission('athleteCoachHistory', 'Update')
  update(@Param('id') id: string, @Body() dto: UpdateAthleteCoachHistoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('athleteCoachHistory', 'Archive')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }

  /** See ADR-0120: not `:id/restore`, which is the revision restore. */
  @Post(':id/unarchive')
  @RequirePermission('athleteCoachHistory', 'Restore')
  unarchive(@Param('id') id: string) {
    return this.service.unarchive(id);
  }
}
