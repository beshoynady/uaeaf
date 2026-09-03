import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
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

  /** Public athlete page: `/athletes/:slug` resolves here —
   *  athleteProfiles.slug → athleteId → athletes. Returns public-safe DTOs
   *  only (no `restricted`, no `dateOfBirth`); `null` for an unknown slug,
   *  and for any Guest athlete, who has no profile row by design. */
  @Get('public/:slug')
  @Public()
  getPublicBySlug(@Param('slug') slug: string) {
    return this.service.getPublicBySlug(slug);
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
