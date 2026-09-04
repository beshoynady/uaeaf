import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { EndCurrentDto } from '../../../common/dto/end-current.dto.js';
import { AthleteClubHistoryService } from './athlete-club-history.service.js';
import { CreateAthleteClubHistoryDto } from './dto/create-athlete-club-history.dto.js';

/** Implements: athleteClubHistory collection, Domain 2 — People & Organizations. */
@ApiTags('athlete-club-history')
@Controller('athlete-club-history')
export class AthleteClubHistoryController {
  constructor(private readonly service: AthleteClubHistoryService) {}

  @Post()
  @RequirePermission('athleteClubHistory', 'Create')
  create(@Body() dto: CreateAthleteClubHistoryDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('athleteClubHistory', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('athleteClubHistory', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch('end-current/:athleteId')
  @RequirePermission('athleteClubHistory', 'Update')
  endCurrent(@Param('athleteId') athleteId: string, @Body() dto: EndCurrentDto) {
    return this.service.endCurrent(athleteId, dto);
  }

  @Delete(':id')
  @RequirePermission('athleteClubHistory', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
