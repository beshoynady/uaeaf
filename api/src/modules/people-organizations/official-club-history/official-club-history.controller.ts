import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { EndCurrentDto } from '../../../common/dto/end-current.dto.js';
import { OfficialClubHistoryService } from './official-club-history.service.js';
import { CreateOfficialClubHistoryDto } from './dto/create-official-club-history.dto.js';

/** Implements: officialClubHistory collection, Domain 2 — People & Organizations. */
@ApiTags('official-club-history')
@Controller('official-club-history')
export class OfficialClubHistoryController {
  constructor(private readonly service: OfficialClubHistoryService) {}

  @Post()
  @RequirePermission('officialClubHistory', 'Create')
  create(@Body() dto: CreateOfficialClubHistoryDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('officialClubHistory', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('officialClubHistory', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch('end-current/:officialId')
  @RequirePermission('officialClubHistory', 'Update')
  endCurrent(@Param('officialId') officialId: string, @Body() dto: EndCurrentDto) {
    return this.service.endCurrent(officialId, dto);
  }

  @Delete(':id')
  @RequirePermission('officialClubHistory', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
