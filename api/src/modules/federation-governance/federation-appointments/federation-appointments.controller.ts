import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { FederationAppointmentsService } from './federation-appointments.service.js';
import { CreateFederationAppointmentDto } from './dto/create-federation-appointments.dto.js';
import { AppointmentPublicResponseDto } from './dto/appointment-public-response.dto.js';

/** Implements: federationAppointments collection, Domain 1 — Federation & Governance. */
@ApiTags('federation-appointments')
@Controller('federation-appointments')
export class FederationAppointmentsController {
  constructor(private readonly service: FederationAppointmentsService) {}

  @Post()
  @RequirePermission('federationAppointments', 'Create')
  create(@Body() dto: CreateFederationAppointmentDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('federationAppointments', 'Read')
  findAll() {
    return this.service.findAll();
  }

  /** The federation's own leadership as it stands today — the president and
   *  the board, in the board's order, with nothing of the personnel record
   *  beyond a name, a title and a portrait. Declared ahead of `GET :id` so
   *  `public` is never read as an id. */
  @Get('public')
  @Public()
  @ApiOkResponse({ type: [AppointmentPublicResponseDto] })
  currentLeadership() {
    return this.service.currentLeadership();
  }

  @Get(':id')
  @RequirePermission('federationAppointments', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Delete(':id')
  @RequirePermission('federationAppointments', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
