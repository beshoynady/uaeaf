import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface.js';
import { EndCurrentDto } from '../../common/dto/end-current.dto.js';
import { CoachClubHistoryService } from './coach-club-history.service.js';
import { CreateCoachClubHistoryDto } from './dto/create-coach-club-history.dto.js';

/** Implements: coachClubHistory collection, Domain 2 — People & Organizations. */
@ApiTags('coach-club-history')
@Controller('coach-club-history')
export class CoachClubHistoryController {
  constructor(private readonly service: CoachClubHistoryService) {}

  @Post()
  @RequirePermission('coachClubHistory', 'Create')
  create(@Body() dto: CreateCoachClubHistoryDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('coachClubHistory', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('coachClubHistory', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch('end-current/:coachId')
  @RequirePermission('coachClubHistory', 'Update')
  endCurrent(@Param('coachId') coachId: string, @Body() dto: EndCurrentDto) {
    return this.service.endCurrent(coachId, dto);
  }

  @Delete(':id')
  @RequirePermission('coachClubHistory', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
