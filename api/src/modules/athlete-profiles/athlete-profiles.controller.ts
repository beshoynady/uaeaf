import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface.js';
import { AthleteProfilesService } from './athlete-profiles.service.js';
import { CreateAthleteProfileDto } from './dto/create-athlete-profile.dto.js';

/** Implements: athleteProfiles collection, Domain 2 — People & Organizations. */
@ApiTags('athlete-profiles')
@Controller('athlete-profiles')
export class AthleteProfilesController {
  constructor(private readonly service: AthleteProfilesService) {}

  @Post()
  @RequirePermission('athleteProfiles', 'Create')
  create(@Body() dto: CreateAthleteProfileDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('athleteProfiles', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('athleteProfiles', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Delete(':id')
  @RequirePermission('athleteProfiles', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
