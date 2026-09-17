import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { MembershipsService } from './memberships.service.js';
import { CreateMembershipDto, UpdateMembershipDto } from './dto/create-membership.dto.js';

/** Implements: memberships collection, Domain 9. */
@ApiTags('memberships')
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly service: MembershipsService) {}

  @Post()
  @RequirePermission('memberships', 'Create')
  create(@Body() dto: CreateMembershipDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('memberships', 'Read')
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
  @RequirePermission('memberships', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @RequirePermission('memberships', 'Update')
  update(@Param('id') id: string, @Body() dto: UpdateMembershipDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('memberships', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
