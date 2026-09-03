import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface.js';
import { DisciplinesService } from './disciplines.service.js';
import { CreateDisciplineDto } from './dto/create-discipline.dto.js';

/** Implements: disciplines collection, Domain 3 (partial). */
@ApiTags('disciplines')
@Controller('disciplines')
export class DisciplinesController {
  constructor(private readonly service: DisciplinesService) {}

  @Post()
  @RequirePermission('disciplines', 'Create')
  create(@Body() dto: CreateDisciplineDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('disciplines', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('disciplines', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Delete(':id')
  @RequirePermission('disciplines', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
