import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { FederationPersonnelsService } from './federation-personnel.service.js';
import { CreateFederationPersonnelDto } from './dto/create-federation-personnel.dto.js';

/** Implements: federationPersonnel collection, Domain 1 — Federation & Governance. */
@ApiTags('federation-personnel')
@Controller('federation-personnel')
export class FederationPersonnelsController {
  constructor(private readonly service: FederationPersonnelsService) {}

  @Post()
  @RequirePermission('federationPersonnel', 'Create')
  create(@Body() dto: CreateFederationPersonnelDto) {
    return this.service.create(dto);
  }

  /** Public listing — Active personnel only, in public-safe form
   *  (structurally omits the `[RESTRICTED]` internalContact). Not
   *  workflow-governed, so it is served directly rather than through
   *  `publications`. */
  @Get('public')
  @Public()
  findAllPublic() {
    return this.service.findAllPublic();
  }

  @Get()
  @RequirePermission('federationPersonnel', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('federationPersonnel', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Delete(':id')
  @RequirePermission('federationPersonnel', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
