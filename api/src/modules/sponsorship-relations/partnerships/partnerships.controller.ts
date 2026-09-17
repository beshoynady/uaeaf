import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { PartnershipsService } from './partnerships.service.js';
import { CreatePartnershipDto, UpdatePartnershipDto } from './dto/create-partnership.dto.js';

/** Implements: partnerships collection, Domain 9. */
@ApiTags('partnerships')
@Controller('partnerships')
export class PartnershipsController {
  constructor(private readonly service: PartnershipsService) {}

  @Post()
  @RequirePermission('partnerships', 'Create')
  create(@Body() dto: CreatePartnershipDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('partnerships', 'Read')
  findAll() {
    return this.service.findAll();
  }

  /** Declared ahead of `GET :id` so `public` is never read as an id. */
  @Get('public')
  @Public()
  findPublic() {
    return this.service.findPublic();
  }

  @Get(':id')
  @RequirePermission('partnerships', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @RequirePermission('partnerships', 'Update')
  update(@Param('id') id: string, @Body() dto: UpdatePartnershipDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('partnerships', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
