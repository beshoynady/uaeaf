import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { FederationAppointmentsService } from './federation-appointments.service.js';
import { CreateFederationAppointmentDto } from './dto/create-federation-appointments.dto.js';

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
