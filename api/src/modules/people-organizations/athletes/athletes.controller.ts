import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { AthletesService } from './athletes.service.js';
import { CreateAthleteDto } from './dto/create-athlete.dto.js';

/** Implements: athletes collection, Domain 2 — People & Organizations. */
@ApiTags('athletes')
@Controller('athletes')
export class AthletesController {
  constructor(private readonly service: AthletesService) {}

  @Post()
  @RequirePermission('athletes', 'Create')
  create(@Body() dto: CreateAthleteDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('athletes', 'Read')
  findAll() {
    return this.service.findAll();
  }

  /** Public athlete listing — public-safe shape only, structurally without
   *  `dateOfBirth` (`[SENSITIVE-MINOR]`, ADR-0028). */
  @Get('public')
  @Public()
  findAllPublic() {
    return this.service.findAllPublic();
  }

  @Get(':id')
  @RequirePermission('athletes', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Delete(':id')
  @RequirePermission('athletes', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
