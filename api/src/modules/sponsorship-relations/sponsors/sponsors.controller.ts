import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { SponsorsService } from './sponsors.service.js';
import { CreateSponsorDto, UpdateSponsorDto } from './dto/create-sponsor.dto.js';

/** Implements: sponsors collection, Domain 9. No public route: the public
 *  reaches a sponsor only through a running sponsorship
 *  (`GET /sponsorships/public`), never the organisation record itself. */
@ApiTags('sponsors')
@Controller('sponsors')
export class SponsorsController {
  constructor(private readonly service: SponsorsService) {}

  @Post()
  @RequirePermission('sponsors', 'Create')
  create(@Body() dto: CreateSponsorDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('sponsors', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('sponsors', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @RequirePermission('sponsors', 'Update')
  update(@Param('id') id: string, @Body() dto: UpdateSponsorDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('sponsors', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
