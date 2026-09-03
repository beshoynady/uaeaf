import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface.js';
import { OfficialProfilesService } from './official-profiles.service.js';
import { CreateOfficialProfileDto } from './dto/create-official-profile.dto.js';

/** Implements: officialProfiles collection, Domain 2 — People & Organizations. */
@ApiTags('official-profiles')
@Controller('official-profiles')
export class OfficialProfilesController {
  constructor(private readonly service: OfficialProfilesService) {}

  @Post()
  @RequirePermission('officialProfiles', 'Create')
  create(@Body() dto: CreateOfficialProfileDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('officialProfiles', 'Read')
  findAll() {
    return this.service.findAll();
  }

  /** Public official page: `/officials/:slug` resolves here —
   *  officialProfiles.slug → officialId → officials. */
  @Get('public/:slug')
  @Public()
  getPublicBySlug(@Param('slug') slug: string) {
    return this.service.getPublicBySlug(slug);
  }

  @Get(':id')
  @RequirePermission('officialProfiles', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Delete(':id')
  @RequirePermission('officialProfiles', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
